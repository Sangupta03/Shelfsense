"""Tidies a label photo before we send it anywhere.

Phones save photos sideways and let an EXIF tag say "rotate me", which many tools
ignore. Phones also shoot 12+ megapixels. The vision model is billed by image size
and gains nothing past ~1568px, so shrinking first makes the call faster AND cheaper.
"""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 4 * 1024 * 1024  # matches the API's limit (Vercel caps request bodies at 4.5 MB)
MAX_SIDE = 1568


class ImageError(ValueError):
    """The upload can't be used. The message is safe to show to the user."""


def prepare_image(data: bytes) -> bytes:
    if not data:
        raise ImageError("The file is empty.")
    if len(data) > MAX_BYTES:
        raise ImageError("That photo is over 4 MB.")

    try:
        img = Image.open(BytesIO(data))
        img.load()  # actually decode it - open() alone only reads the header
    except (UnidentifiedImageError, OSError) as err:
        raise ImageError("That file isn't an image we can read. Try a JPG or PNG.") from err

    img = ImageOps.exif_transpose(img)  # rotate it the way the phone meant
    img = img.convert("RGB")  # JPEG has no transparency, and this also drops PNG alpha
    img.thumbnail((MAX_SIDE, MAX_SIDE))  # keeps the aspect ratio, never upscales

    out = BytesIO()
    img.save(out, format="JPEG", quality=85)  # re-saving also strips the original EXIF (GPS etc.)
    return out.getvalue()
