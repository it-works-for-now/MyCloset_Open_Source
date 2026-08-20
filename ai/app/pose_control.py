from __future__ import annotations

from PIL import Image, ImageDraw

_KEYPOINTS: tuple[tuple[float, float] | None, ...] = (
    (0.50, 0.10),  # nose
    (0.50, 0.20),  # neck
    (0.38, 0.24),  # right shoulder
    (0.30, 0.40),  # right elbow
    (0.27, 0.56),  # right wrist
    (0.62, 0.24),  # left shoulder
    (0.70, 0.40),  # left elbow
    (0.73, 0.56),  # left wrist
    (0.43, 0.52),  # right hip
    (0.41, 0.73),  # right knee
    (0.40, 0.93),  # right ankle
    (0.57, 0.52),  # left hip
    (0.59, 0.73),  # left knee
    (0.60, 0.93),  # left ankle
    (0.47, 0.09),  # right eye
    (0.53, 0.09),  # left eye
    (0.44, 0.10),  # right ear
    (0.56, 0.10),  # left ear
)

_LIMBS: tuple[tuple[int, int], ...] = (
    (2, 3),
    (2, 6),
    (3, 4),
    (4, 5),
    (6, 7),
    (7, 8),
    (2, 9),
    (9, 10),
    (10, 11),
    (2, 12),
    (12, 13),
    (13, 14),
    (2, 1),
    (1, 15),
    (15, 17),
    (1, 16),
    (16, 18),
)

_COLORS: tuple[tuple[int, int, int], ...] = (
    (255, 0, 0),
    (255, 85, 0),
    (255, 170, 0),
    (255, 255, 0),
    (170, 255, 0),
    (85, 255, 0),
    (0, 255, 0),
    (0, 255, 85),
    (0, 255, 170),
    (0, 255, 255),
    (0, 170, 255),
    (0, 85, 255),
    (0, 0, 255),
    (85, 0, 255),
    (170, 0, 255),
    (255, 0, 255),
    (255, 0, 170),
    (255, 0, 85),
)


def build_standing_openpose_image(width: int, height: int) -> Image.Image:
    """Create a thick, full-body OpenPose-style conditioning image.

    The image locks daily-look output to one relaxed standing person. It avoids
    a pose-detector dependency because the API currently has no person image.
    """
    canvas = Image.new("RGB", (width, height), "black")
    draw = ImageDraw.Draw(canvas)
    line_width = max(4, round(max(width, height) / 256))
    point_radius = max(4, round(line_width * 0.9))

    def point(index: int) -> tuple[int, int]:
        keypoint = _KEYPOINTS[index - 1]
        if keypoint is None:
            raise ValueError(f"Missing keypoint {index} in standing pose.")
        return round(keypoint[0] * width), round(keypoint[1] * height)

    for (first, second), color in zip(_LIMBS, _COLORS, strict=False):
        draw.line((point(first), point(second)), fill=color, width=line_width)
    for keypoint, color in zip(_KEYPOINTS, _COLORS, strict=True):
        if keypoint is None:
            continue
        x, y = round(keypoint[0] * width), round(keypoint[1] * height)
        draw.ellipse(
            (x - point_radius, y - point_radius, x + point_radius, y + point_radius),
            fill=color,
        )
    return canvas
