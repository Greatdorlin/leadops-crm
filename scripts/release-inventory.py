"""Read-only source/provenance inventory. Output belongs in the confidential review folder."""
import argparse, csv, hashlib, json, pathlib, re, subprocess
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
root=pathlib.Path.cwd();out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
def git(*args):return subprocess.check_output(['git',*args],text=True)
files=git('ls-files','-z').split('\0');files=[f for f in files if f]
history=git('log','--all','--reverse','--format=COMMIT %H|%aI|%an','--name-only','--diff-filter=A')
origins={};current=None
for line in history.splitlines():
 if line.startswith('COMMIT '):current=line[7:].split('|',2)
 elif line.strip() and current:origins.setdefault(line.strip(),current)
patterns={
 'prior_brand':r'fly[ _-]?connect|pathway[ _-]?finder',
 'provider_name':r'NeonLeadStore|\bNEON_[A-Z_]+|neon\.tech',
 'old_domain':r'create-great-events|creategreatevents|flyconnect\.[a-z]+|pathwayfinder\.[a-z]+',
 'domain_terms':r'\b(travel|visa|study|relocation|assessment|advisor|destination)\b',
 'identity':r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',
}
rows=[];findings=[];migration_hashes={}
for f in files:
 path=root/f
 if not path.is_file():continue
 data=path.read_bytes();origin=origins.get(f,['unknown','',''])
 row={'file':f,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'first_reachable_commit':origin[0],'commit_date':origin[1],'git_author':origin[2],'legal_assignment':'Unverified: Git authorship is not legal title'};rows.append(row)
 if f.startswith('drizzle/'):migration_hashes[f]=row['sha256']
 try:lines=data.decode('utf8').splitlines()
 except UnicodeDecodeError:continue
 for i,line in enumerate(lines,1):
  for kind,regex in patterns.items():
   if re.search(regex,line,re.I):
    if f.startswith('drizzle/'):category='4: historical evidence; preserve'
    elif f.startswith(('docs/','AGENTS')):category='4: documentation/history; inspect current claims'
    elif kind=='identity':category='5: inspect identity/access purpose; fixture is not an access rule'
    elif kind=='prior_brand' and f.endswith('labels.ts'):category='3: stored-value normalization; preserve compatibility'
    elif kind=='provider_name':category='3: storage/provider compatibility; neutral runtime name where safe'
    else:category='2: inspect consumer; legitimate industry presets are not automatically obsolete'
    findings.append({'file':f,'line':i,'kind':kind,'classification':category,'evidence':'Matched named pattern; source is available at the file and line. Content omitted to avoid exposing secrets.'})
for name,items in [('file-provenance.csv',rows),('legacy-findings.csv',findings)]:
 with (out/name).open('w',newline='') as stream:
  w=csv.DictWriter(stream,fieldnames=list(items[0]) if items else ['file']);w.writeheader();w.writerows(items)
(out/'migration-hashes.json').write_text(json.dumps(migration_hashes,indent=2)+'\n')
summary={'head':git('rev-parse','HEAD').strip(),'tree':git('rev-parse','HEAD^{tree}').strip(),'tracked_files_examined':len(rows),'findings':len(findings),'reachable_commits':int(git('rev-list','--all','--count').strip()),'history_scope':'Locally reachable Git objects only; pre-import origins and legal assignments require external evidence.','finding_counts':{k:sum(f['kind']==k for f in findings) for k in patterns}}
(out/'inventory-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
