"""Replace wedding/ in a complete Pages archive, preserving every other path."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', required=True, type=Path,
                    help='The currently published complete archive, including wedding2/.')
args = parser.parse_args()
digest = lambda data: hashlib.sha256(data).hexdigest()
baseline_hash = digest(args.base.read_bytes())
with zipfile.ZipFile(args.base) as archive:
    baseline = {name: archive.read(name) for name in archive.namelist()
                if not name.endswith('/')}
assert 'wedding/index.html' in baseline
assert 'wedding2/index.html' in baseline, 'Use the complete two-version baseline.'

mount = project / 'dist/client/wedding'
assert (mount / 'index.html').is_file(), 'Run npm run build first.'
preserved = {name: data for name, data in baseline.items()
             if not name.startswith('wedding/')}
files = dict(preserved)
for path in sorted(mount.rglob('*')):
    if path.is_file():
        files['wedding/' + path.relative_to(mount).as_posix()] = path.read_bytes()

output = project / 'release/wedding-pages.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(files.items()):
        archive.writestr(name, data)
with zipfile.ZipFile(output) as archive:
    assert all(archive.read(name) == data for name, data in preserved.items())
    assert all(archive.read(name) == data for name, data in files.items())
manifest = {
    'baseArchive': str(args.base.resolve()), 'baseSha256': baseline_hash,
    'archive': str(output), 'archiveSha256': digest(output.read_bytes()),
    'bytes': output.stat().st_size, 'files': len(files),
    'preservedFiles': {name: digest(data) for name, data in preserved.items()},
    'weddingFiles': {name: digest(data) for name, data in files.items()
                     if name.startswith('wedding/')},
}
(project / 'release/package-manifest.json').write_text(
    json.dumps(manifest, indent=2) + '\n')
print(f'Replaced wedding/; preserved {len(preserved)} files, including wedding2/ and all shared controls.')
print(f'{output}: {len(files)} files, {output.stat().st_size} bytes')
print(manifest['archiveSha256'])
