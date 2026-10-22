"""Export the imagegen master to browser icon sizes without altering the source."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'icons' / 'bot'
with Image.open(root / 'master.png') as source:
    source = source.convert('RGBA')
    assert source.width == source.height, 'The icon master must be square'
    for size in (16, 32, 48, 128, 256, 512):
        source.resize((size, size), Image.Resampling.LANCZOS).save(root / f'icon-{size}.png')
        print(root / f'icon-{size}.png')
