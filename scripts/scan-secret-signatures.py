"""Limited read-only high-confidence signature scan. Does not replace a credential audit."""
import argparse,json,pathlib,re,subprocess,hashlib
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args()
pattern=r'AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{40,}|xox[baprs]-[0-9A-Za-z-]{16,}|sk_live_[0-9A-Za-z]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
commits=subprocess.check_output(['git','rev-list','--all'],text=True).splitlines();findings=[]
for commit in commits:
 r=subprocess.run(['git','grep','-I','-n','-E',pattern,commit,'--','.',':(exclude)package-lock.json',':(exclude)scripts/scan-secret-signatures.py'],capture_output=True,text=True)
 if r.returncode not in [0,1]:raise RuntimeError('History scan failed')
 for line in r.stdout.splitlines():
  parts=line.split(':',3)
  if len(parts)==4:findings.append({'commit':parts[0],'file':parts[1],'line':parts[2],'evidence_sha256':hashlib.sha256(parts[3].encode()).hexdigest()})
report={'reachable_commits_scanned':len(commits),'findings':findings,'limitations':['Only named high-confidence signatures were checked.','Generic passwords, custom tokens, database URL variants and credentials outside reachable Git objects are not covered.','A zero count does not prove secrets were never exposed.']};pathlib.Path(a.output).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'commits':len(commits),'signature_matches':len(findings)}))
