"""Add wedding2 to the existing Pages archive without rebuilding wedding/."""

from pathlib import Path
import argparse
import hashlib
import json
import shutil
import zipfile

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', type=Path, required=True, help='Existing complete archive to update; provide explicitly')
args = parser.parse_args()
output = project / '.local-review/cloudflare-wedding2'
site = output / 'site'
archive = output / 'wedding-comparison-pages.zip'
digest = lambda data: hashlib.sha256(data).hexdigest()
base_sha256 = digest(args.base.read_bytes())

with zipfile.ZipFile(args.base) as baseline:
    original = {name: baseline.read(name) for name in baseline.namelist() if not name.endswith('/')}
assert 'wedding/index.html' in original
assert (project / 'dist/index.html').is_file()
files = {name: data for name, data in original.items() if not name.startswith('wedding2/')}
for path in sorted((project / 'dist').rglob('*')):
    if path.is_file():
        files['wedding2/' + path.relative_to(project / 'dist').as_posix()] = path.read_bytes()

worker = original['_worker.js'].decode()
if "pathname === '/wedding2'" not in worker:
    old_route = "pathname === '/wedding' || pathname.startsWith('/wedding/')"
    assert worker.count(old_route) == 1, 'Review the existing worker before changing its routes.'
    worker = worker.replace(old_route, old_route + " || pathname === '/wedding2' || pathname.startsWith('/wedding2/')")
    worker = worker.replace('mounted only at /wedding;', 'mounted at /wedding and /wedding2;')
files['_worker.js'] = worker.encode()
routes = json.loads(original['_routes.json'])
for route in ['/wedding2', '/wedding2/*']:
    if route not in routes['exclude']:
        routes['exclude'].append(route)
files['_routes.json'] = (json.dumps(routes, indent=2) + '\n').encode()
headers = original['_headers'].decode()
if '/wedding2/assets/*' not in headers:
    headers += '\n/wedding2/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/wedding2/img/*\n  Cache-Control: public, max-age=86400\n\n/wedding2/fonts/*\n  Cache-Control: public, max-age=86400\n'
files['_headers'] = headers.encode()

controls = {'_worker.js', '_routes.json', '_headers'}
protected = {name: digest(data) for name, data in original.items() if name not in controls and not name.startswith('wedding2/')}
assert all(files[name] == original[name] for name in protected)
if site.exists():
    shutil.rmtree(site)
site.mkdir(parents=True)
for name, data in files.items():
    target = site / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, data in sorted(files.items()):
        bundle.writestr(name, data)
manifest = {
    'baseArchive': str(args.base), 'baseSha256': base_sha256,
    'archive': str(archive), 'archiveSha256': digest(archive.read_bytes()),
    'files': len(files), 'bytes': archive.stat().st_size,
    'preservedFiles': protected,
    'newFiles': {name: digest(data) for name, data in files.items() if name.startswith('wedding2/')},
    'changedControls': sorted(name for name in controls if files[name] != original[name]),
}
(output / 'package-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({key: manifest[key] for key in ['archive', 'archiveSha256', 'files', 'bytes']}, indent=2))
print(f'Preserved {len(protected)} existing files byte for byte; added {len(manifest["newFiles"])} files under wedding2/.')
