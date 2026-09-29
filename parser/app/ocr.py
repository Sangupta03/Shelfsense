"""Backup photo reader: OCR.space's free API, used only when Gemini is busy.

OCR copies ALL the text on the label, so we keep just the part after the
"Ingredients" heading, up to the first full stop. The user checks every chip anyway.
"""

import logging
import re

import httpx

from app.config import ocr_space_key

log = logging.getLogger(__name__)

OCR_URL = "https://api.ocr.space/parse/image"
OCR_TIMEOUT_S = 8  # it usually answers in ~2 s
MAX_FILE_BYTES = 1024 * 1024  # free-tier limit
OCR_OPTIONS = {"language": "eng", "OCREngine": "2", "scale": "true", "detectOrientation": "true"}

_HEADING = re.compile(r"\b(ingredients?|inci|composition)\s*(:|\n)", re.IGNORECASE)
_FULL_STOP = re.compile(r"\.(\s|$)")  # so "0.5%" doesn't count


def ingredient_list(text: str) -> str:
    """The text after the heading, up to the first full stop ("" if there's no heading)."""
    heading = _HEADING.search(text)
    if not heading:
        return ""
    # OCR breaks lines where the label wraps, not between ingredients
    after = " ".join(text[heading.end() :].split())
    end = _FULL_STOP.search(after)
    return after[: end.start()] if end else after


def _parsed_text(body: object) -> str:
    """ParsedResults[0].ParsedText, checked step by step (it's untrusted JSON)."""
    if not isinstance(body, dict):
        return ""
    results = body.get("ParsedResults")
    if not isinstance(results, list) or not results or not isinstance(results[0], dict):
        log.warning("ocr.space error: %s", body.get("ErrorMessage"))
        return ""
    text = results[0].get("ParsedText")
    return text if isinstance(text, str) else ""


def read_label_with_ocr(jpeg: bytes) -> str | None:
    """The ingredient list, or None if OCR can't help (no key, error, no list found)."""
    key = ocr_space_key()
    if not key or len(jpeg) > MAX_FILE_BYTES:
        return None
    try:
        response = httpx.post(
            OCR_URL,
            headers={"apikey": key},
            files={"file": ("label.jpg", jpeg, "image/jpeg")},
            data=OCR_OPTIONS,
            timeout=OCR_TIMEOUT_S,
        )
        response.raise_for_status()
        body = response.json()
    except (httpx.HTTPError, ValueError) as err:  # network error, timeout, bad status, not JSON
        log.warning("ocr.space failed: %s", err)
        return None
    return ingredient_list(_parsed_text(body)) or None
