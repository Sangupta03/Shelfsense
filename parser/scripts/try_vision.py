"""Manual check: run real label photos through the REAL vision model.

    python scripts/try_vision.py tests/fixtures/real

This costs a few cents per photo, which is exactly why it's a script and not a test.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.image import ImageError, prepare_image  # noqa: E402
from app.main import build_result  # noqa: E402
from app.vision import read_label  # noqa: E402

PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp"}


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("tests/fixtures/real")
    photos = sorted(p for p in folder.iterdir() if p.suffix.lower() in PHOTO_TYPES)
    if not photos:
        sys.exit(f"No photos found in {folder}")

    for photo in photos:
        print(f"\n=== {photo.name} ===")
        try:
            text = read_label(prepare_image(photo.read_bytes()))
        except ImageError as err:
            print(f"  skipped: {err}")
            continue
        if not text:
            print("  model found no ingredient list")
            continue

        result = build_result("image", text)
        for item in result.items:
            score = f"[{item.status:<7} {item.confidence:>3}]"
            print(f"  {item.position:>2}. {score} {item.raw}  ->  {item.inci}")


if __name__ == "__main__":
    main()
