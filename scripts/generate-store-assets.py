"""Render the original vector icon and store promo art. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def icon(size):
    scale = size * 4 / 128
    image = Image.new('RGBA', (size * 4, size * 4))
    draw = ImageDraw.Draw(image)
    def pill(box, radius, fill):
        draw.rounded_rectangle(tuple(round(v * scale) for v in box), radius=round(radius * scale), fill=fill)
    pill((16, 16, 112, 112), 26, '#242128')
    pill((28, 33, 90, 60), 13.5, '#c3a5ff')
    pill((46, 68, 100, 95), 13.5, '#3478f6')
    for x in (42, 53, 64):
        draw.ellipse(tuple(round(v * scale) for v in (x-3, 43.5, x+3, 49.5)), fill='#242128')
    return image.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 32, 48, 128):
    icon(size).save(ROOT / 'icons' / f'icon-{size}.png')

promo = Image.new('RGB', (440 * 3, 280 * 3), '#17151e')
draw = ImageDraw.Draw(promo)
for box, color in [((32, 42, 266, 94), '#c3a5ff'), ((126, 111, 408, 163), '#3478f6'), ((32, 180, 310, 232), '#393340')]:
    draw.rounded_rectangle(tuple(v * 3 for v in box), radius=26 * 3, fill=color)
for x in (64, 87, 110):
    draw.ellipse(((x-4)*3, 64*3, (x+4)*3, 72*3), fill='#242128')
promo.resize((440, 280), Image.Resampling.LANCZOS).save(ROOT / 'store' / 'promo-440x280.png')
