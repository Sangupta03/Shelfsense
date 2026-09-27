# Test fixtures

The automated tests generate their own tiny images with Pillow, so nothing in here is needed for `pytest`.

For the manual check with real labels, put ~5 clear photos of ingredient lists from your own
products in `real/` (that folder is git-ignored) and run:

```bash
python scripts/try_vision.py tests/fixtures/real
```

Never add photos with faces or hands in them.
