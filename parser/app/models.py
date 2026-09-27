"""Request/response shapes. They mirror ParseResult in shared/ on the TS side."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ParseTextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ParsedItem(BaseModel):
    position: int
    raw: str
    inci: str | None
    confidence: int = Field(ge=0, le=100)
    status: Literal["matched", "check", "unknown"]


class ParseResult(BaseModel):
    # python style inside (raw_text), camelCase on the wire (rawText) for the TS side
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    source: Literal["text", "image"]
    raw_text: str = Field(alias="rawText")
    items: list[ParsedItem]
