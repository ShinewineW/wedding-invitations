from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from tempfile import TemporaryDirectory
import argparse, hashlib, json, subprocess, zipfile
p=argparse.ArgumentParser()
p.add_argument('--archive',required=True,type=Path)
p.add_argument('--output',required=True,type=Path)
p.add_argument('--protected-only',action='store_true')
p.add_argument('--origin', required=True, help='Origin of your own deployment, without a path')
p.add_argument('--alias', action='append', default=[], help='Optional additional origin to verify')
a=p.parse_args(); a.output.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(a.archive) as z:
    files={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
sha=lambda b:hashlib.sha256(b).hexdigest()
items=[]
for name,body in files.items():
    if name.startswith('wedding/') or (not a.protected_only and name.startswith('wedding2/')):
        path=name[:-10] if name.endswith('/index.html') else name
        items.append((a.origin.rstrip('/')+'/'+path,200,sha(body)))
if not a.protected_only:
    items += [(origin+'/wedding2/',200,sha(files['wedding2/index.html'])) for origin in a.alias]
    items += [(a.origin.rstrip('/')+'/'+path,status,None) for path,status in [('',404),('wedding/wedding.ics',404),('wedding',308),('wedding2',308)]]
def check(pair):
    i,(url,wanted,expected)=pair
    with TemporaryDirectory(prefix='wedding-http-') as directory:
        body=Path(directory)/f'{i:02}.body'
        result=subprocess.run(['curl','--compressed','-sS','--max-time','60','-o',str(body),'-w','%{http_code}',url],capture_output=True,text=True)
        actual=sha(body.read_bytes()) if body.exists() else None
    return {'url':url,'status':result.stdout,'expectedStatus':wanted,'sha256':actual,'expectedSha256':expected,'passed':result.returncode==0 and result.stdout==str(wanted) and (expected is None or actual==expected),'error':result.stderr}
with ThreadPoolExecutor(max_workers=4) as pool:
    results=list(pool.map(check,enumerate(items)))
report={'archive':str(a.archive),'archiveSha256':sha(a.archive.read_bytes()),'checks':len(results),'passed':all(r['passed'] for r in results),'results':results}
(a.output/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checks':len(results),'passed':report['passed'],'failures':[r for r in results if not r['passed']]},indent=2))
raise SystemExit(0 if report['passed'] else 1)
