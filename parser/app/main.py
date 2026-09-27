"""ShelfSense parser service.

GET  /health       -> is it up?
POST /parse/text   -> {text} in, matched ingredient list out
POST /parse/image  -> label photo in, same thing out

Only the Node API should call this, so both parse routes need the shared X-Parser-Token.
"""

import hmac
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile

from app.config import parser_token
from app.image import MAX_BYTES, ImageError, prepare_image
from app.match import get_matcher
from app.models import ParsedItem, ParseResult, ParseTextRequest
from app.split import split_ingredients
from app.vision import VisionError, VisionUnavailable, read_label

app = FastAPI(title="ShelfSense parser", version="1.0.0")


def require_token(x_parser_token: Annotated[str | None, Header()] = None) -> None:
    expected = parser_token()
    # compare_digest takes the same time whether the first or last character is wrong,
    # so nobody can guess the token one character at a time by timing us
    if not expected or not x_parser_token or not hmac.compare_digest(x_parser_token, expected):
        raise HTTPException(status_code=401, detail="Missing or wrong parser token.")


def build_result(source: Literal["text", "image"], text: str) -> ParseResult:
    matcher = get_matcher()
    items = []
    for position, raw in enumerate(split_ingredients(text), start=1):
        found = matcher.match(raw)
        items.append(
            ParsedItem(
                position=position,
                raw=raw,
                inci=found.inci,
                confidence=found.confidence,
                status=found.status,
            )
        )
    return ParseResult(source=source, raw_text=text, items=items)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/parse/text", response_model=ParseResult, dependencies=[Depends(require_token)])
def parse_text(body: ParseTextRequest) -> ParseResult:
    result = build_result("text", body.text)
    if not result.items:
        raise HTTPException(status_code=422, detail="Couldn't find any ingredients in that text.")
    return result


# A plain `def` (not async) on purpose: the Gemini call blocks, and FastAPI runs
# plain defs in a thread pool so one slow photo doesn't freeze every other request.
@app.post("/parse/image", response_model=ParseResult, dependencies=[Depends(require_token)])
def parse_image(image: Annotated[UploadFile, File()]) -> ParseResult:
    data = image.file.read(MAX_BYTES + 1)  # read one byte past the limit to spot big files

    try:
        jpeg = prepare_image(data)
    except ImageError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err

    try:
        text = read_label(jpeg)
    except VisionUnavailable as err:
        raise HTTPException(status_code=503, detail=str(err)) from err
    except VisionError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    if not text:
        raise HTTPException(
            status_code=422,
            detail="Couldn't find an ingredient list in this photo. Try a closer, straighter shot.",
        )

    # the photo bytes go out of scope here and are never written anywhere
    return build_result("image", text)
