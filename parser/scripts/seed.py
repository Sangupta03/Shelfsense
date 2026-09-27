"""Loads data/*.json into Postgres. Safe to run as many times as you like.

    python scripts/seed.py                                  # uses server/.env
    python scripts/seed.py --env-file ../server/.env.test

Everything happens inside ONE transaction: if any line fails, Postgres rolls the
whole thing back and the database looks exactly like it did before.
"""

import argparse
import json
import os
import secrets
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import bcrypt
import psycopg

# let this script import the parser's own modules (app.split, app.match)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import DATA_DIR, REPO_ROOT, load_env_file  # noqa: E402
from app.match import Matcher  # noqa: E402
from app.split import split_ingredients  # noqa: E402


def read_json(name: str):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def database_url(env_file: Path) -> str:
    load_env_file(env_file)
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        sys.exit(f"DATABASE_URL isn't set (looked in the environment and {env_file}).")

    # Prisma allows ?schema=public in the URL, psycopg doesn't - drop it
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "schema"]
    return urlunsplit(parts._replace(query=urlencode(query)))


# ---------- reference data ----------


def seed_classes(cur, classes: list[dict]) -> dict[str, int]:
    for c in classes:
        cur.execute(
            """
            INSERT INTO ingredient_classes (slug, name, is_active)
            VALUES (%s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active
            """,
            (c["slug"], c["name"], c["isActive"]),
        )
    slugs = [c["slug"] for c in classes]
    cur.execute("DELETE FROM ingredient_classes WHERE slug <> ALL(%s)", (slugs,))
    cur.execute("SELECT slug, id FROM ingredient_classes")
    return dict(cur.fetchall())


def seed_ingredients(cur, ingredients: list[dict]) -> dict[str, int]:
    # Upsert instead of delete + insert, so ingredient ids never change and the
    # products people already saved keep pointing at the right rows.
    for item in ingredients:
        cur.execute(
            """
            INSERT INTO ingredients (inci_name, description)
            VALUES (%s, %s)
            ON CONFLICT (inci_name) DO UPDATE SET description = EXCLUDED.description
            """,
            (item["inci"], item["description"]),
        )
    names = [item["inci"] for item in ingredients]
    cur.execute("DELETE FROM ingredients WHERE inci_name <> ALL(%s)", (names,))
    cur.execute("SELECT inci_name, id FROM ingredients")
    return dict(cur.fetchall())


def seed_links(cur, ingredients: list[dict], ingredient_ids: dict[str, int], class_ids: dict[str, int]):
    # these link tables are pure reference data, so clear and reload them
    cur.execute("DELETE FROM ingredient_aliases")
    cur.execute("DELETE FROM class_members")
    for item in ingredients:
        ingredient_id = ingredient_ids[item["inci"]]
        for alias in item["aliases"]:
            cur.execute(
                "INSERT INTO ingredient_aliases (alias, ingredient_id) VALUES (%s, %s)",
                (alias.lower(), ingredient_id),
            )
        for slug in item["classes"]:
            cur.execute(
                "INSERT INTO class_members (class_id, ingredient_id) VALUES (%s, %s)",
                (class_ids[slug], ingredient_id),
            )


def seed_rules(cur, rules: list[dict], gap_rules: list[dict]):
    cur.execute("DELETE FROM interaction_rules")
    for r in rules:
        cur.execute(
            """
            INSERT INTO interaction_rules (class_a_slug, class_b_slug, severity, same_slot_only, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (r["classA"], r["classB"], r["severity"], r["sameSlotOnly"], r["message"]),
        )

    cur.execute("DELETE FROM gap_rules")
    for g in gap_rules:
        cur.execute(
            """
            INSERT INTO gap_rules (slot, required_class, required_type, severity, message)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (g["slot"], g["requiredClass"], g["requiredType"], g["severity"], g["message"]),
        )


# ---------- demo account ----------


def seed_demo(cur, demo: dict, ingredient_ids: dict[str, int], matcher: Matcher) -> int:
    # Nobody should be able to log in to the demo with a password, so its hash is
    # of a random string we immediately forget. "Try the demo" logs in without one.
    throwaway_hash = bcrypt.hashpw(secrets.token_urlsafe(32).encode(), bcrypt.gensalt(12)).decode()
    cur.execute(
        """
        INSERT INTO users (id, email, name, password_hash, is_demo)
        VALUES (%s, %s, %s, %s, true)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, is_demo = true
        RETURNING id
        """,
        ("demo-user", demo["user"]["email"], demo["user"]["name"], throwaway_hash),
    )
    user_id = cur.fetchone()[0]

    # start the demo shelf fresh (ON DELETE CASCADE removes its ingredient rows too)
    cur.execute("DELETE FROM products WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM coach_runs WHERE user_id = %s", (user_id,))

    for index, p in enumerate(demo["products"]):
        product_id = f"demo-{index + 1}-{secrets.token_hex(4)}"
        cur.execute(
            """
            INSERT INTO products (id, user_id, brand, name, type, slot, input_method, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW() + make_interval(secs => %s))
            """,
            (product_id, user_id, p["brand"], p["name"], p["type"], p["slot"], p["inputMethod"], index),
        )
        # run the demo labels through the exact same parser real users get
        for position, raw in enumerate(split_ingredients(p["ingredients"]), start=1):
            found = matcher.match(raw)
            # No human reviews the seed, so only trust confident matches. A "check" guess
            # (e.g. "tamarindus indica seed gum" -> xanthan gum) is saved as unmatched instead.
            trusted = found.status == "matched" and found.inci is not None
            ingredient_id = ingredient_ids.get(found.inci) if trusted else None
            cur.execute(
                """
                INSERT INTO product_ingredients (product_id, position, ingredient_id, raw_text, confidence)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (product_id, position, ingredient_id, raw, found.confidence if ingredient_id else 0),
            )
    return len(demo["products"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the ShelfSense database.")
    parser.add_argument("--env-file", type=Path, default=REPO_ROOT / "server" / ".env")
    args = parser.parse_args()

    ingredients = read_json("ingredients.json")
    classes = read_json("classes.json")
    rules = read_json("rules.json")
    gap_rules = read_json("gap_rules.json")
    demo = read_json("demo_shelf.json")

    with psycopg.connect(database_url(args.env_file)) as conn:
        with conn.transaction():  # all or nothing
            with conn.cursor() as cur:
                class_ids = seed_classes(cur, classes)
                ingredient_ids = seed_ingredients(cur, ingredients)
                seed_links(cur, ingredients, ingredient_ids, class_ids)
                seed_rules(cur, rules, gap_rules)
                product_count = seed_demo(cur, demo, ingredient_ids, Matcher(ingredients))

    print(
        f"Seeded {len(ingredients)} ingredients, {len(classes)} classes, {len(rules)} rules, "
        f"{len(gap_rules)} gap rules and a demo shelf with {product_count} products."
    )


if __name__ == "__main__":
    main()
