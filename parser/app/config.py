"""Settings, read from environment variables.

Locally they come from parser/.env. On Vercel they're set in the project settings.
"""

import os
from pathlib import Path

PARSER_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = PARSER_DIR.parent


def load_env_file(path: Path) -> None:
    """Tiny .env reader: KEY=value lines, # comments. Real env vars always win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(PARSER_DIR / ".env")

# cheap + fast "flash-lite" tier. (gemini-2.0-flash-lite was shut down in June 2026,
# and this is Google's named replacement for it.) Change it with GEMINI_MODEL.
DEFAULT_MODEL = "gemini-3.1-flash-lite"
# the data lives inside the parser, so it gets deployed together with it
DATA_DIR = Path(os.environ.get("DATA_DIR", PARSER_DIR / "data"))


def parser_token() -> str:
    return os.environ.get("PARSER_TOKEN", "")


def gemini_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "")


def gemini_models() -> list[str]:
    """GEMINI_MODEL can be one model or a fallback list: "model-a,model-b,model-c"."""
    raw = os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL
    models = [m.strip() for m in raw.split(",") if m.strip()]
    return models or [DEFAULT_MODEL]
