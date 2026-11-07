"""Collect exact-lock metadata and installed licence texts without granting legal clearance."""
import argparse,csv,hashlib,json,pathlib,re,shutil
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args();out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
lockbytes=pathlib.Path('package-lock.json').read_bytes();lock=json.loads(lockbytes);root=json.loads(pathlib.Path('package.json').read_text());rows=[]
textdir=out/'third-party-license-texts';textdir.mkdir(exist_ok=True)
for path,data in lock['packages'].items():
 if not path:continue
 folder=pathlib.Path(path);manifest=folder/'package.json';installed=json.loads(manifest.read_text()) if manifest.exists() else {}
 name=installed.get('name') or data.get('name') or path.split('node_modules/')[-1];version=data.get('version','unknown');declared=data.get('license') or installed.get('license') or 'UNKNOWN'
 if not isinstance(declared,str):declared=json.dumps(declared)
 texts=[]
 if folder.exists():
  for f in folder.iterdir():
   if f.is_file() and re.match(r'^(licen[sc]e|copying|notice|third.party.licen)',f.name,re.I):
    dest=textdir/(name.replace('/','_')+'@'+version)/f.name;dest.parent.mkdir(exist_ok=True);shutil.copyfile(f,dest);texts.append(str(dest.relative_to(out)))
 standalone=pathlib.Path('.next/standalone')/path/'package.json'
 review=any(x in declared.upper() for x in ['GPL','MPL','EUPL','CC-BY','FSL','UNKNOWN']) or declared=='BSD'
 rows.append({'package':name,'version':version,'lock_path':path,'declared_license':declared,'dev_only_as_locked':bool(data.get('dev')),'optional':bool(data.get('optional')),'direct':name in root.get('dependencies',{}) or name in root.get('devDependencies',{}),'present_in_local_standalone':standalone.exists(),'installed_license_texts':';'.join(texts),'manual_review':review})
with (out/'license-inventory.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
report={'lock_sha256':hashlib.sha256(lockbytes).hexdigest(),'packages':len(rows),'installed_packages_with_collected_notices':sum(bool(r['installed_license_texts']) for r in rows),'missing_installed_notice_files':sum(not bool(r['installed_license_texts']) for r in rows),'manual_review':[r for r in rows if r['manual_review']],'scope_note':'Lockfile includes optional packages for other platforms. Dev flags are package-manager metadata; actual artifact membership is recorded separately. Notice collection is limited to installed top-level licence/notice files, not a legal clearance or complete native-binary source offer.'}
(out/'license-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='manual_review'}))
