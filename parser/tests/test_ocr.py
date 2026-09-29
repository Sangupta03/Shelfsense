"""ocr.py with a fake OCR.space - checks our handling, never calls the real service."""

import httpx

import app.ocr as ocr

# shortened from what OCR.space really returned for two real product photos
FACE_WASH = (
    "how to use: Lather a small amount in your hands.\n"
    "warning: For external use only.\n"
    "Our special blend... INGREDIENTS: AQUA, COCAMIDOPROPYL BETAINE\n"
    "PROPYLENE GLYCOL, PANTHENOL, GLYCERIN, CITRIC ACID.\n"
    "MADE IN INDIA, MKTD. BY HINDUSTAN UNILEVER LIMITED."
)
SERUM = (
    "HOW TO USE\nApply 2-3 drops after cleanser.\n"
    "INGREDIENTS\nAqua, Propylene Glycol, D-Panthenol, Betaine,\n"
    "Glycerin (and) Glyceryl Glucoside, Disodium EDTA.\n"
    "FOR EXTERNAL USE ONLY"
)


def test_keeps_only_the_list_after_a_heading_with_a_colon():
    assert ocr.ingredient_list(FACE_WASH) == (
        "AQUA, COCAMIDOPROPYL BETAINE PROPYLENE GLYCOL, PANTHENOL, GLYCERIN, CITRIC ACID"
    )


def test_keeps_only_the_list_after_a_heading_on_its_own_line():
    assert ocr.ingredient_list(SERUM) == (
        "Aqua, Propylene Glycol, D-Panthenol, Betaine, Glycerin (and) Glyceryl Glucoside, Disodium EDTA"
    )


def test_a_decimal_point_is_not_the_end_of_the_list():
    assert ocr.ingredient_list("Ingredients: Aqua, Retinol 0.5%, Squalane.") == "Aqua, Retinol 0.5%, Squalane"


def test_no_heading_means_no_guessing():
    assert ocr.ingredient_list("Gentle cleanser for sensitive skin. Made in India.") == ""


def fake_post(reply=None, error=None):
    def post(url, **kwargs):
        if error:
            raise error
        return httpx.Response(200, json=reply, request=httpx.Request("POST", url))

    return post


def ok_reply(text: str) -> dict:
    return {"ParsedResults": [{"ParsedText": text, "FileParseExitCode": 1}], "IsErroredOnProcessing": False}


def test_reads_the_list_from_a_good_reply(monkeypatch):
    monkeypatch.setenv("OCR_SPACE_API_KEY", "fake-key")
    monkeypatch.setattr(ocr.httpx, "post", fake_post(ok_reply(SERUM)))
    assert ocr.read_label_with_ocr(b"jpeg").startswith("Aqua, Propylene Glycol")


def test_no_key_means_switched_off(monkeypatch):
    monkeypatch.setenv("OCR_SPACE_API_KEY", "")
    monkeypatch.setattr(ocr.httpx, "post", fake_post(error=AssertionError("must not be called")))
    assert ocr.read_label_with_ocr(b"jpeg") is None


def test_an_error_reply_gives_none(monkeypatch):
    monkeypatch.setenv("OCR_SPACE_API_KEY", "fake-key")
    reply = {"IsErroredOnProcessing": True, "ErrorMessage": ["File failed validation"]}
    monkeypatch.setattr(ocr.httpx, "post", fake_post(reply))
    assert ocr.read_label_with_ocr(b"jpeg") is None


def test_a_timeout_gives_none(monkeypatch):
    monkeypatch.setenv("OCR_SPACE_API_KEY", "fake-key")
    monkeypatch.setattr(ocr.httpx, "post", fake_post(error=httpx.ReadTimeout("slow")))
    assert ocr.read_label_with_ocr(b"jpeg") is None


def test_a_photo_over_1_mb_is_not_sent(monkeypatch):
    monkeypatch.setenv("OCR_SPACE_API_KEY", "fake-key")
    monkeypatch.setattr(ocr.httpx, "post", fake_post(error=AssertionError("must not be called")))
    assert ocr.read_label_with_ocr(b"x" * (ocr.MAX_FILE_BYTES + 1)) is None
