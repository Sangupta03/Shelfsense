"""Endpoint tests. The vision call is always faked, so this never touches the paid API."""

from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.main as main
from app.vision import VisionUnavailable

TOKEN = "test-token"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("PARSER_TOKEN", TOKEN)
    return TestClient(main.app)


def auth() -> dict[str, str]:
    return {"X-Parser-Token": TOKEN}


def png_bytes() -> bytes:
    out = BytesIO()
    Image.new("RGB", (120, 80), "white").save(out, format="PNG")
    return out.getvalue()


def upload_photo(client, data: bytes | None = None, filename="label.png", mime="image/png"):
    files = {"image": (filename, data if data is not None else png_bytes(), mime)}
    return client.post("/parse/image", files=files, headers=auth())


def test_health_needs_no_token(client):
    assert client.get("/health").json() == {"ok": True}


def test_missing_token_is_rejected(client):
    assert client.post("/parse/text", json={"text": "aqua"}).status_code == 401


def test_wrong_token_is_rejected(client):
    res = client.post("/parse/text", json={"text": "aqua"}, headers={"X-Parser-Token": "nope"})
    assert res.status_code == 401


def test_parse_text_returns_the_contract_shape(client):
    res = client.post("/parse/text", json={"text": "Aqua (Water), Niacinam1de, Vitamin B3"}, headers=auth())
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "text"
    assert body["rawText"] == "Aqua (Water), Niacinam1de, Vitamin B3"
    assert [i["position"] for i in body["items"]] == [1, 2, 3]
    assert [i["inci"] for i in body["items"]] == ["AQUA", "NIACINAMIDE", "NIACINAMIDE"]


def test_empty_text_is_a_validation_error(client):
    assert client.post("/parse/text", json={"text": ""}, headers=auth()).status_code == 422


def test_parse_image_uses_the_same_pipeline(client, monkeypatch):
    # fake vision model: pretend it read this text off the photo
    monkeypatch.setattr(main, "read_label", lambda jpeg: "Aqua, Glycolic Acid, Glycerin")
    res = upload_photo(client)
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "image"
    assert [i["inci"] for i in body["items"]] == ["AQUA", "GLYCOLIC ACID", "GLYCERIN"]


def test_no_ingredient_list_found(client, monkeypatch):
    monkeypatch.setattr(main, "read_label", lambda jpeg: "")
    res = upload_photo(client)
    assert res.status_code == 422


def test_vision_switched_off_gives_503(client, monkeypatch):
    def no_key(jpeg):
        raise VisionUnavailable("off")

    monkeypatch.setattr(main, "read_label", no_key)
    res = upload_photo(client)
    assert res.status_code == 503


def test_non_image_upload_is_rejected(client):
    res = upload_photo(client, b"hello", "x.txt", "text/plain")
    assert res.status_code == 422
