"""Step 1 of the pipeline: messy label text -> a clean list of ingredient strings.

Real labels are chaos: bullets instead of commas, "Ingredients:" headers,
"+/- may contain" sections, commas INSIDE brackets, and names like
"1,2-hexanediol" that have a comma in the name itself.
"""

import re
import unicodedata

# everything that separates ingredients besides a comma
_SEPARATORS = re.compile(r"[•·●▪|;\n\r\t]|\(and\)")  # "(and)" joins the two ingredients of a blend

# label words that aren't ingredients
_NOISE = [
    re.compile(r"\bmay contain\b\s*:?"),
    re.compile(r"\[?\+/-\]?"),
    re.compile(r"\binci\s*:"),
]

_HEADER = re.compile(r"\bingredients?\s*:")

_FANCY_CHARS = {
    "’": "'",  # curly apostrophe
    "‘": "'",
    "–": "-",  # en dash
    "—": "-",  # em dash
    "*": "",  # "*organic" footnote markers
}


def normalize(text: str) -> str:
    """Lowercase, tidy odd characters and turn every kind of separator into a comma."""
    text = unicodedata.normalize("NFKC", text).lower()
    for fancy, plain in _FANCY_CHARS.items():
        text = text.replace(fancy, plain)

    # anything before "ingredients:" is marketing copy, so drop it
    header = _HEADER.search(text)
    if header:
        text = text[header.end() :]

    for pattern in _NOISE:
        text = pattern.sub(" ", text)

    text = _SEPARATORS.sub(",", text)
    return re.sub(r"[ ]{2,}", " ", text).strip()


def _is_number_comma(text: str, i: int) -> bool:
    """True for the comma in '1,2-hexanediol' - digit on both sides."""
    return 0 < i < len(text) - 1 and text[i - 1].isdigit() and text[i + 1].isdigit()


def _tidy(part: str) -> str:
    return part.strip(" .:-,")


def split_ingredients(text: str) -> list[str]:
    """Split on commas, but never inside brackets and never inside numbers."""
    text = normalize(text)
    parts: list[str] = []
    current: list[str] = []
    depth = 0  # how many brackets deep we are

    for i, ch in enumerate(text):
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth = max(0, depth - 1)  # a stray ")" shouldn't break everything

        if ch == "," and depth == 0 and not _is_number_comma(text, i):
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))

    return [cleaned for cleaned in (_tidy(p) for p in parts) if cleaned]
