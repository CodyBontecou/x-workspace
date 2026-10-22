"""Build a deterministic store ZIP containing only production extension files."""
import hashlib
import json
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text())
files = {'manifest.json', 'background.js', 'popup.html', 'popup.js', 'LICENSE'}
for script in manifest['content_scripts']:
    files.update(script.get('js', []))
    files.update(script.get('css', []))
files.update(manifest['icons'].values())
files.update(manifest['action']['default_icon'].values())
for filename in files:
    source = ROOT / filename
    assert source.is_file(), f'Missing package file: {filename}'
for size, filename in manifest['icons'].items():
    data = (ROOT / filename).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (int(size), int(size))
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
package = out / f'x-workspace-{manifest["version"]}.zip'
with zipfile.ZipFile(package, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for filename in sorted(files):
        info = zipfile.ZipInfo(filename, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (ROOT / filename).read_bytes())
digest = hashlib.sha256(package.read_bytes()).hexdigest()
package.with_suffix('.zip.sha256').write_text(f'{digest}  {package.name}\n')
print(f'{package}\n{len(files)} production files; SHA256 {digest}')

assets = ['store/listing.md', 'store/promo-440x280.png', 'store/screenshot-bot-list.jpg', 'store/screenshot-focused-chat.jpg', 'PRIVACY.md', 'icons/icon-128.png']
if all((ROOT / filename).is_file() for filename in assets):
    kit = out / f'x-workspace-{manifest["version"]}-store-kit.zip'
    with zipfile.ZipFile(kit, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(package, package.name)
        archive.write(package.with_suffix('.zip.sha256'), package.name + '.sha256')
        for filename in assets:
            archive.write(ROOT / filename, filename)
    print(f'Store materials: {kit}')
