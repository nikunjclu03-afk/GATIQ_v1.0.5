from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "img"
BUILD_DIR = ROOT / "build"
JS_DIR = ROOT / "js"
FINAL_LOGO_NAME = "Logo-final.png"


def make_linear_gradient(size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int], horizontal: bool = True) -> Image.Image:
    width, height = size
    base = Image.new("RGBA", size)
    pixels = base.load()
    for y in range(height):
        for x in range(width):
            factor = x / max(width - 1, 1) if horizontal else y / max(height - 1, 1)
            pixels[x, y] = (
                int(start[0] + (end[0] - start[0]) * factor),
                int(start[1] + (end[1] - start[1]) * factor),
                int(start[2] + (end[2] - start[2]) * factor),
                255,
            )
    return base


def apply_mask(base: Image.Image, mask: Image.Image) -> Image.Image:
    return Image.composite(base, Image.new("RGBA", base.size, (0, 0, 0, 0)), mask)


def brand_image(inner_fill: tuple[int, int, int], output_name: str) -> Path:
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer sweep
    outer_mask = Image.new("L", (size, size), 0)
    outer_draw = ImageDraw.Draw(outer_mask)
    outer_draw.pieslice((70, 40, 468, 390), 180, 354, fill=255)
    outer_draw.pieslice((124, 94, 414, 336), 180, 354, fill=0)
    outer_draw.polygon([(232, 69), (471, 69), (417, 125), (225, 125)], fill=255)
    outer_draw.rounded_rectangle((120, 125, 322, 206), 40, fill=255)
    outer_grad = make_linear_gradient((size, size), (125, 199, 255), (24, 228, 241))
    img.alpha_composite(apply_mask(outer_grad, outer_mask))

    # Main core body
    core_mask = Image.new("L", (size, size), 0)
    core_draw = ImageDraw.Draw(core_mask)
    core_draw.rounded_rectangle((120, 146, 386, 302), 76, fill=255)
    core_draw.polygon([(240, 225), (438, 225), (393, 286), (205, 286)], fill=255)
    core_draw.polygon([(112, 224), (225, 224), (242, 287), (145, 287)], fill=255)
    core_grad = make_linear_gradient((size, size), (8, 84, 194), (7, 33, 62))
    img.alpha_composite(apply_mask(core_grad, core_mask))

    # Cutout / inner channel
    inner_mask = Image.new("L", (size, size), 0)
    inner_draw = ImageDraw.Draw(inner_mask)
    inner_draw.pieslice((155, 108, 418, 330), 182, 352, fill=255)
    inner_draw.pieslice((205, 152, 368, 286), 180, 354, fill=0)
    inner_draw.polygon([(234, 164), (414, 164), (360, 215), (253, 215), (208, 264), (326, 264), (391, 264), (354, 322), (231, 322), (165, 247)], fill=255)
    inner_fill_layer = Image.new("RGBA", (size, size), (*inner_fill, 255))
    img.alpha_composite(apply_mask(inner_fill_layer, inner_mask))

    # Front wing stripes
    stripe_colors = [(17, 117, 255), (40, 208, 255), (187, 232, 255)]
    stripe_shapes = [
        [(58, 255), (174, 255), (196, 274), (82, 274)],
        [(70, 286), (186, 286), (208, 305), (94, 305)],
        [(84, 317), (201, 317), (223, 335), (111, 335)],
    ]
    for color, shape in zip(stripe_colors, stripe_shapes):
        stripe = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        stripe_draw = ImageDraw.Draw(stripe)
        stripe_draw.polygon(shape, fill=color + (255,))
        img.alpha_composite(stripe)

    # Silver lower arc
    silver_mask = Image.new("L", (size, size), 0)
    silver_draw = ImageDraw.Draw(silver_mask)
    silver_draw.arc((158, 255, 418, 430), 25, 165, fill=255, width=18)
    silver_grad = make_linear_gradient((size, size), (112, 138, 168), (240, 246, 255))
    img.alpha_composite(apply_mask(silver_grad, silver_mask))

    # Soft highlight
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.ellipse((95, 54, 300, 212), fill=(255, 255, 255, 40))
    highlight = highlight.filter(ImageFilter.GaussianBlur(9))
    img.alpha_composite(highlight)

    # Drop shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse((148, 328, 378, 364), fill=(0, 0, 0, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    final_img = Image.alpha_composite(shadow, img)

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    output_path = IMG_DIR / output_name
    final_img.save(output_path)
    return output_path


def write_logo_data(logo_path: Path) -> None:
    encoded = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    target = JS_DIR / "logo-data.js"
    target.write_text(f"const PDF_LOGO_BASE64 = 'data:image/png;base64,{encoded}';\n", encoding="utf8")


def build_brand_png(source_path: Path, output_name: str) -> Path:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    output_path = IMG_DIR / output_name
    with Image.open(source_path).convert("RGBA") as img:
        img.save(output_path, format="PNG", optimize=True)
    return output_path


def fit_image_to_square(source_path: Path, size: int = 512) -> Image.Image:
    with Image.open(source_path).convert("RGBA") as img:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        contained = img.copy()
        contained.thumbnail((size, size), Image.Resampling.LANCZOS)
        offset = ((size - contained.width) // 2, (size - contained.height) // 2)
        canvas.alpha_composite(contained, offset)
        return canvas


def build_ico(source_path: Path) -> None:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    icon_image = fit_image_to_square(source_path, size=512)
    icon_image.save(BUILD_DIR / "icon.png", format="PNG", optimize=True)
    icon_image.save(BUILD_DIR / "icon.ico", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])


def main() -> None:
    dark = IMG_DIR / "gatiq-mark-dark.png"
    light = IMG_DIR / "gatiq-mark-light.png"
    final_logo = IMG_DIR / FINAL_LOGO_NAME

    if final_logo.exists():
        dark = build_brand_png(final_logo, "gatiq-mark-dark.png")
        light = build_brand_png(final_logo, "gatiq-mark-light.png")
    else:
        if not dark.exists():
            dark = brand_image((10, 23, 45), "gatiq-mark-dark.png")
        if not light.exists():
            light = brand_image((245, 248, 255), "gatiq-mark-light.png")

    build_ico(dark)
    write_logo_data(dark)
    source_name = final_logo.name if final_logo.exists() else f"{dark.name}, {light.name}"
    print(f"Generated assets from: {source_name}, icon.ico")


if __name__ == "__main__":
    main()
