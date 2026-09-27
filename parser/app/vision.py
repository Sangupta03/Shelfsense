"""Reads the ingredient text off a label photo with Gemini (a vision LLM).

The model's only job is to COPY text. It doesn't match or judge anything -
split.py and match.py do that - so results stay testable and repeatable.
"""

import logging

from google import genai
from google.genai import errors, types

from app.config import gemini_key, gemini_models

log = logging.getLogger(__name__)

PROMPT = (
    "Copy ONLY the ingredient list from this label, exactly as printed, comma-separated. "
    "If you cannot find an ingredient list, reply NONE."
)

# 429 = rate limited, 503 = overloaded. Free-tier limits are per model,
# so on either one we try the next model in GEMINI_MODEL instead of failing.
TRY_NEXT_MODEL = {429, 503}


class VisionUnavailable(RuntimeError):
    """No API key configured, so photo reading is switched off."""


class VisionError(RuntimeError):
    """The API call itself failed."""


def _ask(client: genai.Client, model: str, jpeg: bytes) -> str:
    response = client.models.generate_content(
        model=model,
        # the photo and the instruction go in together, photo first
        contents=[types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), PROMPT],
        config=types.GenerateContentConfig(max_output_tokens=2000),
    )
    return (response.text or "").strip()  # .text is None when the model sent nothing back


def read_label(jpeg: bytes) -> str:
    """Returns the ingredient text, or "" when the model says there's no list."""
    key = gemini_key()
    if not key:
        raise VisionUnavailable(
            "Photo reading isn't set up on this server. Paste the ingredient list instead."
        )

    client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=25_000))  # ms
    text = None
    for model in gemini_models():
        try:
            text = _ask(client, model, jpeg)
            break
        except errors.APIError as err:
            if err.code not in TRY_NEXT_MODEL:
                raise VisionError("The label reader couldn't be reached. Please try again.") from err
            log.warning("%s answered %s, trying the next model", model, err.code)

    if text is None:  # every model in the list was busy
        raise VisionError("The label reader is busy right now. Try again in a minute, or paste the text.")
    if not text or text.upper().startswith("NONE"):
        return ""
    return text
