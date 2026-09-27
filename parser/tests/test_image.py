from io import BytesIO

import pytest
from PIL import Image

from app.image import MAX_BYTES, MAX_SIDE, ImageError, prepare_image


def make_image(width: int, height: int, fmt: str = "PNG", orientation: int | None = None) -> bytes:
    img = Image.new("RGB", (width, height), "white")
    out = BytesIO()
    if orientation is None:
        img.save(out, format=fmt)
    else:
        exif = Image.Exif()
        exif[0x0112] = orientation  # 0x0112 is the EXIF "Orientation" tag
        img.save(out, format="JPEG", exif=exif)
    return out.getvalue()


def open_result(data: bytes) -> Image.Image:
    return Image.open(BytesIO(data))


def test_output_is_always_jpeg():
    assert open_result(prepare_image(make_image(200, 100, "PNG"))).format == "JPEG"


def test_big_images_are_shrunk_keeping_the_shape():
    result = open_result(prepare_image(make_image(4000, 2000, "PNG")))
    assert max(result.size) == MAX_SIDE
    assert result.size == (MAX_SIDE, MAX_SIDE // 2)


def test_small_images_are_not_upscaled():
    assert open_result(prepare_image(make_image(300, 200))).size == (300, 200)


def test_exif_rotation_is_applied():
    # orientation 6 = "rotate 90° clockwise to display", so 400x200 should become 200x400
    result = open_result(prepare_image(make_image(400, 200, orientation=6)))
    assert result.size == (200, 400)


def test_transparent_png_is_converted():
    img = Image.new("RGBA", (50, 50), (255, 0, 0, 0))
    out = BytesIO()
    img.save(out, format="PNG")
    assert open_result(prepare_image(out.getvalue())).mode == "RGB"


def test_not_an_image_is_rejected():
    with pytest.raises(ImageError):
        prepare_image(b"%PDF-1.4 definitely not a photo")


def test_empty_file_is_rejected():
    with pytest.raises(ImageError):
        prepare_image(b"")


def test_too_big_file_is_rejected():
    with pytest.raises(ImageError, match="4 MB"):
        prepare_image(b"0" * (MAX_BYTES + 1))
