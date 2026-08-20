from io import BytesIO

from PIL import Image, ImageOps


class InvalidImageError(ValueError):
    pass


def prepare_image(raw_bytes: bytes, max_side: int) -> Image.Image:
    try:
        with Image.open(BytesIO(raw_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (OSError, ValueError) as error:
        raise InvalidImageError("The uploaded file is not a valid image.") from error

    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return image
