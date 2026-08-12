"""Extract the initial M, D, and B as full-canvas layers for scroll animation."""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "mdb-logo-base.png"
OUT_DIR = ROOT / "images" / "letters"


def polygon_alpha(alpha: Image.Image, points: list[tuple[int, int]]) -> Image.Image:
    region = Image.new("L", alpha.size)
    ImageDraw.Draw(region).polygon(points, fill=255)
    return ImageChops.multiply(alpha.point(lambda value: 255 if value >= 5 else 0), region)


def apply_mask(source: Image.Image, mask: Image.Image) -> Image.Image:
    result = source.copy()
    result.putalpha(ImageChops.multiply(source.getchannel("A"), mask))
    pixels = result.load()
    alpha = result.getchannel("A").load()
    for y in range(result.height):
        for x in range(result.width):
            if alpha[x, y] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    alpha = source.getchannel("A")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Each initial touches the following lowercase letter. These boundaries pass
    # through the visually hidden overlap so no piece of o/e joins a falling initial.
    masks = {
        "M": polygon_alpha(alpha, [(350, 185), (560, 185), (560, 450), (350, 450)]),
        "D": polygon_alpha(alpha, [(165, 430), (350, 430), (350, 650), (165, 650)]),
        "B": polygon_alpha(alpha, [(385, 690), (545, 690), (545, 930), (385, 930)]),
    }

    combined = Image.new("L", source.size)
    for name, mask in masks.items():
        combined = ImageChops.lighter(combined, mask)
        apply_mask(source, mask).save(OUT_DIR / f"letter-{name}.png")

    stationary = source.copy()
    stationary_alpha = ImageChops.subtract(alpha, ImageChops.multiply(alpha, combined))
    stationary.putalpha(stationary_alpha)
    stationary.save(ROOT / "images" / "mdb-logo-static.png")

    # Rest-state reconstruction must be pixel-identical to the current source.
    rebuilt = stationary.copy()
    for name in ("M", "D", "B"):
        rebuilt.alpha_composite(Image.open(OUT_DIR / f"letter-{name}.png").convert("RGBA"))
    if ImageChops.difference(source, rebuilt).getbbox():
        raise RuntimeError("Falling-letter rest pose differs from source logo")


if __name__ == "__main__":
    main()
