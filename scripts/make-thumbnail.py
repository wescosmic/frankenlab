"""Build the YouTube thumbnail from the strongest frame of the demo.

A thumbnail is read at 210 pixels wide, so the type has to be big and the
image has to be one idea. The alert-lit bench is that image: a plant, a soil,
a probe, a divider, a comparator and a lamp that should not be on yet.

The left third is scrimmed so the headline is legible over the scene, and the
type uses the application's own design tokens, so the thumbnail reads as the
product rather than as a poster for it.

Run it from the repository root:

    python scripts/make-thumbnail.py
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "images" / "the-bench-alert.png"
TARGET = ROOT / "docs" / "devpost" / "youtube-thumbnail.png"

# Design tokens, from src/app/globals.css.
VOID = "#05070d"
TEXT = "#e6ecf7"
MUTED = "#8b9ab5"
ACCENT = "#4fd1c5"

WIDTH, HEIGHT = 1280, 720
FONTS = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a font, falling back to Arial if the preferred one is missing."""
    for candidate in (FONTS / name, FONTS / "arial.ttf"):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def scrim(image: Image.Image, width: int) -> Image.Image:
    """Fade the void colour in from the left, so type stays legible."""
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for x in range(width):
        alpha = int(235 * (1 - x / width) ** 1.6)
        draw.line((x, 0, x, image.height), fill=(5, 7, 13, alpha))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    face: ImageFont.FreeTypeFont,
    fill: str,
    spacing: float = 5.0,
) -> None:
    """Draw text with letter spacing. Pillow has no tracking of its own."""
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=face, fill=fill)
        x += draw.textlength(character, font=face) + spacing


def main() -> int:
    if not SOURCE.exists():
        print(f"missing {SOURCE}")
        return 1

    with Image.open(SOURCE) as original:
        frame = original.convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)

    canvas = scrim(frame, 760)
    draw = ImageDraw.Draw(canvas)

    kicker_face = font("segoeuib.ttf", 26)
    headline_face = font("segoeuib.ttf", 60)
    subline_face = font("segoeui.ttf", 27)
    link_face = font("consolab.ttf", 22)

    draw.rectangle((60, 104, 66, 146), fill=ACCENT)
    tracked(draw, (84, 108), "FRANKENLAB", kicker_face, ACCENT)

    draw.text((60, 176), "A plant's thirst", font=headline_face, fill=TEXT)
    draw.text((60, 246), "trips a real circuit.", font=headline_face, fill=TEXT)

    draw.text(
        (60, 340),
        "Four sciences. One simulation.",
        font=subline_face,
        fill=MUTED,
    )
    draw.text(
        (60, 382),
        "Built with Kiro.",
        font=subline_face,
        fill=MUTED,
    )

    tracked(draw, (60, 630), "FRANKENLAB.VERCEL.APP", link_face, ACCENT)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(TARGET, "PNG", optimize=True)
    size = TARGET.stat().st_size
    print(f"{TARGET.name}  {WIDTH}x{HEIGHT}  {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
