"""Step 2 of the pipeline: match each raw string to a standard (INCI) ingredient name.

Order of attempts, cheapest and most certain first:
  1. exact standard name    ("niacinamide")         -> 100
  2. exact alias            ("vitamin b3")          -> 97
  3. fuzzy match (typos)    ("niacinam1de")         -> whatever RapidFuzz scores it
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from rapidfuzz import fuzz, process

from app.config import DATA_DIR

Status = Literal["matched", "check", "unknown"]

MATCHED_AT = 92  # at or above: we're sure
CHECK_AT = 80  # 80-91: probably right, but ask the user to check
ALIAS_CONFIDENCE = 97


@dataclass(frozen=True)
class Match:
    inci: str | None
    confidence: int
    status: Status


def _key(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _status_for(score: int) -> Status:
    if score >= MATCHED_AT:
        return "matched"
    if score >= CHECK_AT:
        return "check"
    return "unknown"


def _candidates(raw: str) -> list[str]:
    """Different ways to read one label entry, most literal first.

    "aqua (water)"   -> "aqua (water)", "aqua", "water"
    "aqua/water/eau" -> "aqua/water/eau", "aqua", "water", "eau"
    "niacinamide 10%" -> "niacinamide 10%", "niacinamide"
    """
    raw = _key(raw)
    found = [raw]

    without_percent = _key(re.sub(r"\d+(?:[.,]\d+)?\s*%", "", raw))
    without_brackets = _key(re.sub(r"[(\[].*?[)\]]", "", without_percent))
    inside_brackets = [_key(m) for m in re.findall(r"[(\[](.*?)[)\]]", raw)]
    slash_parts = [_key(p) for p in without_brackets.split("/")] if "/" in without_brackets else []

    for option in [without_percent, without_brackets, *inside_brackets, *slash_parts]:
        if option and option not in found:
            found.append(option)
    return found


class Matcher:
    def __init__(self, ingredients: list[dict]):
        self.by_name: dict[str, str] = {}
        self.by_alias: dict[str, str] = {}
        for item in ingredients:
            inci = item["inci"]
            self.by_name[_key(inci)] = inci
            for alias in item.get("aliases", []):
                self.by_alias[_key(alias)] = inci

        # everything fuzzy matching can pick from: names AND aliases
        self.lookup = {**self.by_alias, **self.by_name}
        self.choices = list(self.lookup.keys())

    def match(self, raw: str) -> Match:
        options = _candidates(raw)

        for option in options:
            if option in self.by_name:
                return Match(self.by_name[option], 100, "matched")
        for option in options:
            if option in self.by_alias:
                return Match(self.by_alias[option], ALIAS_CONFIDENCE, "matched")

        return self._fuzzy(options)

    def _fuzzy(self, options: list[str]) -> Match:
        best_choice, best_score = None, 0.0
        for option in options:
            if len(option) < 3:  # "ha", "c"... too short to guess from
                continue
            result = process.extractOne(option, self.choices, scorer=fuzz.WRatio)
            if result and result[1] > best_score:
                best_choice, best_score = result[0], result[1]

        score = round(best_score)
        status = _status_for(score)
        if best_choice is None or status == "unknown":
            # below 80 the "best guess" is usually nonsense, so don't suggest it
            return Match(None, score, "unknown")
        return Match(self.lookup[best_choice], score, status)


def load_ingredients() -> list[dict]:
    with open(DATA_DIR / "ingredients.json", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def get_matcher() -> Matcher:
    """Built once on first use, then reused for every request."""
    return Matcher(load_ingredients())
