"""Crop the 18 pre-drawn bear pieces from source-sprite-sheet-transparent.png."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "bears" / "source-sprite-sheet-transparent.png"

ROWS = {
    "red": (0, 195),
    "pink": (195, 380),
    "green": (380, 596),
}

COLUMNS = {
    "head": (0, 195),
    "torso": (195, 480),
    "arm-left": (480, 665),
    "arm-right": (665, 830),
    "leg-left": (830, 960),
    "leg-right": (960, 1128),
}

PADDING = 6


def crop_visible(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError("Expected a visible sprite inside every grid cell")
    left, top, right, bottom = bounds
    left = max(0, left - PADDING)
    top = max(0, top - PADDING)
    right = min(cell.width, right + PADDING)
    bottom = min(cell.height, bottom + PADDING)
    return cell.crop((left, top, right, bottom))


def main() -> None:
    sheet = Image.open(SOURCE).convert("RGBA")
    if sheet.size != (1128, 596):
        raise RuntimeError(f"Unexpected sprite-sheet size: {sheet.size}")
    # Ignore the thin dark screenshot edge at the outer canvas boundary.
    pixels = sheet.load()
    for y in range(sheet.height):
        for x in range(sheet.width):
            if x < 5 or y < 5 or x >= sheet.width - 5 or y >= sheet.height - 5:
                pixels[x, y] = (0, 0, 0, 0)

    for color, (top, bottom) in ROWS.items():
        output_dir = ROOT / "images" / "bears" / color
        output_dir.mkdir(parents=True, exist_ok=True)
        for part, (left, right) in COLUMNS.items():
            cell = sheet.crop((left, top, right, bottom))
            crop_visible(cell).save(output_dir / f"{part}.png")


if __name__ == "__main__":
    main()
