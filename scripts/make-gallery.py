"""Build the Devpost image gallery from the demo frames.

Devpost shows gallery images at 3:2 and accepts up to 15. The frames in
docs/images/ are 1920x1080, so they are scaled to 1200x675 and given a caption
band to reach 1200x800. The band uses the application's own design tokens, so
the gallery reads as the product rather than as a screenshot dump.

Run it from the repository root:

    python scripts/make-gallery.py

The output goes to docs/devpost/, one file per frame, named in the order they
should be uploaded.
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "images"
TARGET = ROOT / "docs" / "devpost"

# Design tokens, from src/app/globals.css.
VOID = "#05070d"
BAND = "#090d16"
LINE = "#1e2942"
TEXT = "#e6ecf7"
MUTED = "#8b9ab5"
ACCENT = "#4fd1c5"

WIDTH, HEIGHT = 1200, 800
FRAME_HEIGHT = 675
BAND_HEIGHT = HEIGHT - FRAME_HEIGHT

FONTS = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a font, falling back to Arial if the preferred one is missing."""
    for candidate in (FONTS / name, FONTS / "arial.ttf"):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    face: ImageFont.FreeTypeFont,
    fill: str,
    spacing: float = 2.6,
) -> None:
    """Draw text with letter spacing. Pillow has no tracking of its own."""
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=face, fill=fill)
        x += draw.textlength(character, font=face) + spacing


def main() -> int:
    if not SOURCE.is_dir():
        print(f"missing source directory: {SOURCE}")
        return 1
    TARGET.mkdir(parents=True, exist_ok=True)

    # (source frame, output name, kicker, title, subtitle, accent)
    gallery = [
        (
            "the-bench-alert.png",
            "01-the-bench-alert.png",
            "PROJECT BIOCIRCUIT",
            "A plant's thirst trips a real circuit.",
            "The alert fires on day 11. The soil decided the day, not a script.",
            "#ff8f5e",
        ),
        (
            "couplings.png",
            "02-couplings.png",
            "NAMED RULES",
            "Every rule that crosses a discipline is declared.",
            "Three disciplines, four couplings, six wires. Cut a wire, the rule goes with it.",
            ACCENT,
        ),
        (
            "measurements.png",
            "03-measurements.png",
            "MEASUREMENTS",
            "Every quantity is named and carries its unit.",
            "Nothing is a bare number pulled from the air.",
            ACCENT,
        ),
        (
            "assistant.png",
            "04-assistant.png",
            "THE ASSISTANT",
            "Every answer ends with what it is worth.",
            "The weakest model in the experiment is named, and its confidence explained.",
            ACCENT,
        ),
        (
            "catalysis.png",
            "05-catalysis.png",
            "CATALYSIS COMPARISON",
            "Same destination. Nine times sooner.",
            "The catalyst moves the speed and provably not the equilibrium.",
            "#f0b350",
        ),
        (
            "kiro-audit.png",
            "06-kiro-audit.png",
            "THE KIRO MOMENT",
            "An agent found our soil physics was wrong.",
            "Sand's field capacity was 0.12, below the published 0.17 to 0.25. The timeline moved three days.",
            ACCENT,
        ),
    ]

    title_face = font("segoeuib.ttf", 30)
    subtitle_face = font("segoeui.ttf", 17)
    kicker_face = font("consolab.ttf", 12)

    for source_name, output_name, kicker, title, subtitle, accent in gallery:
        source_path = SOURCE / source_name
        if not source_path.exists():
            print(f"missing frame: {source_path}")
            return 1

        with Image.open(source_path) as original:
            frame = original.convert("RGB").resize(
                (WIDTH, FRAME_HEIGHT), Image.LANCZOS
            )

        canvas = Image.new("RGB", (WIDTH, HEIGHT), VOID)
        canvas.paste(frame, (0, 0))

        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, FRAME_HEIGHT, WIDTH, HEIGHT), fill=BAND)
        draw.line((0, FRAME_HEIGHT, WIDTH, FRAME_HEIGHT), fill=LINE)
        draw.rectangle((0, FRAME_HEIGHT, 5, HEIGHT), fill=accent)

        tracked(draw, (36, FRAME_HEIGHT + 18), kicker, kicker_face, accent)
        draw.text((36, FRAME_HEIGHT + 42), title, font=title_face, fill=TEXT)
        draw.text((36, FRAME_HEIGHT + 84), subtitle, font=subtitle_face, fill=MUTED)

        output_path = TARGET / output_name
        canvas.save(output_path, "PNG", optimize=True)
        size = output_path.stat().st_size
        print(
            f"{output_name}  {WIDTH}x{HEIGHT}  {size / 1024:.0f} KB  "
            f"ratio {WIDTH / HEIGHT:.2f}"
        )

    print(f"\n{len(gallery)} gallery images written to {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
