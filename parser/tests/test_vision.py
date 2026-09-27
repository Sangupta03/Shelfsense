"""vision.py with a fake Gemini client - checks our handling, not the model."""

from types import SimpleNamespace

import pytest
from google.genai import errors

import app.vision as vision


class FakeModels:
    def __init__(self, reply: str | None):
        self.reply = reply
        self.last_call: dict = {}

    def generate_content(self, **kwargs):
        self.last_call = kwargs
        return SimpleNamespace(text=self.reply)


def install_fake(monkeypatch, reply: str | None) -> FakeModels:
    models = FakeModels(reply)
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr(vision.genai, "Client", lambda **_: SimpleNamespace(models=models))
    return models


def test_returns_the_copied_text(monkeypatch):
    fake = install_fake(monkeypatch, "  Aqua, Glycerin  ")
    assert vision.read_label(b"jpeg-bytes") == "Aqua, Glycerin"

    # the photo goes up as a jpeg part, followed by our strict prompt
    photo, prompt = fake.last_call["contents"]
    assert photo.inline_data.mime_type == "image/jpeg"
    assert prompt == vision.PROMPT


def test_none_reply_means_no_list(monkeypatch):
    install_fake(monkeypatch, "NONE")
    assert vision.read_label(b"jpeg-bytes") == ""


def test_empty_reply_means_no_list(monkeypatch):
    install_fake(monkeypatch, None)  # Gemini gives text=None when nothing came back
    assert vision.read_label(b"jpeg-bytes") == ""


def test_no_api_key_switches_it_off(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    with pytest.raises(vision.VisionUnavailable):
        vision.read_label(b"jpeg-bytes")


class RateLimitedThenOk:
    """First model is rate limited, the second one answers."""

    def __init__(self):
        self.models_tried: list[str] = []

    def generate_content(self, **kwargs):
        self.models_tried.append(kwargs["model"])
        if len(self.models_tried) == 1:
            raise errors.ClientError(429, {"error": {"message": "quota", "status": "RESOURCE_EXHAUSTED"}})
        return SimpleNamespace(text="Aqua, Glycerin")


def test_rate_limit_moves_to_the_next_model(monkeypatch):
    fake = RateLimitedThenOk()
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setenv("GEMINI_MODEL", "model-a, model-b")
    monkeypatch.setattr(vision.genai, "Client", lambda **_: SimpleNamespace(models=fake))

    assert vision.read_label(b"jpeg-bytes") == "Aqua, Glycerin"
    assert fake.models_tried == ["model-a", "model-b"]


def test_every_model_busy_is_a_vision_error(monkeypatch):
    class AlwaysBusy:
        def generate_content(self, **kwargs):
            raise errors.ServerError(503, {"error": {"message": "overloaded", "status": "UNAVAILABLE"}})

    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setenv("GEMINI_MODEL", "model-a,model-b")
    monkeypatch.setattr(vision.genai, "Client", lambda **_: SimpleNamespace(models=AlwaysBusy()))

    with pytest.raises(vision.VisionError, match="busy"):
        vision.read_label(b"jpeg-bytes")


def test_a_bad_key_does_not_try_other_models(monkeypatch):
    calls = []

    class BadKey:
        def generate_content(self, **kwargs):
            calls.append(kwargs["model"])
            raise errors.ClientError(403, {"error": {"message": "bad key", "status": "PERMISSION_DENIED"}})

    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setenv("GEMINI_MODEL", "model-a,model-b")
    monkeypatch.setattr(vision.genai, "Client", lambda **_: SimpleNamespace(models=BadKey()))

    with pytest.raises(vision.VisionError):
        vision.read_label(b"jpeg-bytes")
    assert calls == ["model-a"]
