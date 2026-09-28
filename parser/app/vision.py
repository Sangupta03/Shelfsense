"""Reads the ingredient text off a label photo with Gemini (a vision LLM).

The model's only job is to COPY text. It doesn't match or judge anything -
split.py and match.py do that - so results stay testable and repeatable.
"""

import logging
import time

import httpx
from google import genai
from google.genai import errors, types

from app.config import gemini_key, gemini_models

log = logging.getLogger(__name__)

# Real product photos are messy: curved bottles, shine, tiny print, several languages.
# The instruction says where to look and what to do when it's hard to read.
PROMPT = (
    "This is a photo of a skincare or cosmetic product. Find its ingredient list - it usually "
    "starts with 'Ingredients', 'INCI' or 'Composition', and is often in small print on the back. "
    "If the label repeats the list in several languages, use the English/INCI one. "
    "Write ONLY the ingredient names, one per line, in the order they appear - no heading, "
    "no marketing text, no directions. If a few words are hard to read, write what you can. "
    "If there is no ingredient list in the photo at all, reply NONE."
)
# ("one per line" instead of "copy exactly as printed": word-for-word copying of a
#  well-known label can trip Gemini's RECITATION filter, which returns an empty answer.)

# Problems another model can fix: model not found/retired (404), rate limited (429), server error (500),
# overloaded (503), timed out (504). Free-tier limits are per model, so the next one often works.
TRY_NEXT_MODEL = {404, 429, 500, 503, 504}

# Nobody waits 40 s for a photo. Give Gemini ~15 s in total, then tell the user straight away.
CALL_TIMEOUT_MS = 12_000  # one Gemini call (a normal answer takes 2-5 s)
TOTAL_BUDGET_S = 15  # all models together

BUSY_MESSAGE = (
    "The label reader is busy right now. Tap Paste to add the ingredients as text, or try again in a minute."
)


class VisionUnavailable(RuntimeError):
    """No API key configured, so photo reading is switched off."""


class VisionError(RuntimeError):
    """The API call failed in a way another attempt won't fix (e.g. a bad key)."""


class VisionBusy(VisionError):
    """Every model we tried was busy, rate limited or too slow. Worth retrying later."""


class NoAnswer(Exception):
    """The model stopped without any text (e.g. finish_reason RECITATION). Another model may answer."""


def _ask(client: genai.Client, model: str, jpeg: bytes) -> str:
    response = client.models.generate_content(
        model=model,
        # the photo and the instruction go in together, photo first
        contents=[types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"), PROMPT],
        config=types.GenerateContentConfig(max_output_tokens=2000),
    )
    text = (response.text or "").strip()  # .text is None when the model sent nothing back
    if not text:
        # a real "no list here" comes back as the word NONE, so empty means the answer was blocked
        reason = response.candidates[0].finish_reason if response.candidates else "no candidates"
        raise NoAnswer(str(reason))
    return text


def read_label(jpeg: bytes) -> str:
    """Returns the ingredient text, or "" when the model says there's no list."""
    key = gemini_key()
    if not key:
        raise VisionUnavailable(
            "Photo reading isn't set up on this server. Paste the ingredient list instead."
        )

    client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=CALL_TIMEOUT_MS))
    started = time.monotonic()

    for model in gemini_models():
        if time.monotonic() - started > TOTAL_BUDGET_S:
            log.warning("gemini: out of time before trying %s", model)
            break
        try:
            text = _ask(client, model, jpeg)
        except errors.APIError as err:
            # log the real reason, so the Vercel logs show WHY a photo failed
            log.warning("gemini %s failed: %s %s", model, err.code, err.message)
            if err.code not in TRY_NEXT_MODEL:
                raise VisionError("The label reader couldn't read this photo. Please try again.") from err
            continue
        except httpx.HTTPError as err:  # network trouble or a timeout - also temporary
            log.warning("gemini %s network error: %s", model, err)
            continue
        except NoAnswer as err:  # blocked or empty answer - the next model usually answers
            log.warning("gemini %s gave no answer: %s", model, err)
            continue
        return "" if text.upper().startswith("NONE") else text

    raise VisionBusy(BUSY_MESSAGE)  # every model was busy, or we ran out of time
