from pathlib import Path
import hashlib,json,shutil
root=Path(__file__).resolve().parents[1];base=root.parents[1]/'recovery/published-main-8c4f847'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
# Payload is an overlay, never a replacement tree. All old chunks/previews survive.
files=[]
for f in sorted((root/'build').rglob('*')):
 if not f.is_file():continue
 rel=f.relative_to(root/'build').as_posix();old=base/'docs'/rel
 if old.exists() and sha(old)==sha(f):continue
 files.append({'path':'docs/'+rel,'localPath':str(f),'sha256':sha(f),'bytes':f.stat().st_size})
for f in sorted((root/'dist/assets').rglob('*')):
 if not f.is_file():continue
 rel=f.relative_to(root/'dist').as_posix();old=base/'dist'/rel
 if old.exists() and sha(old)==sha(f):continue
 if f.suffix not in ['.png','.webp'] and rel!='assets/approved-atlases/manifest.json':raise Exception('Unreviewed changed media '+str(f))
 files.append({'path':'docs/'+rel,'localPath':str(f),'sha256':sha(f),'bytes':f.stat().st_size})
source=[]
for folder in ['dist','tests','tools','scripts']:
 for f in sorted((root/folder).rglob('*')):
  if not f.is_file():continue
  rel=f.relative_to(root).as_posix();old=base/rel
  if old.exists() and sha(old)==sha(f):continue
  source.append({'path':rel,'sha256':sha(f),'bytes':f.stat().st_size,'baselineSha256':sha(old) if old.is_file() else None})
for rel in ['package.json','package-lock.json','vite.config.js']:
 f=root/rel;source.append({'path':rel,'sha256':sha(f),'bytes':f.stat().st_size})
external=[]
for rel,local in [('assets/mobile-viewport-CKi2spbv.js',base/'docs/assets/mobile-viewport-CKi2spbv.js'),('assets/ui-preview-WMU7-lXW.css',base/'docs/assets/ui-preview-WMU7-lXW.css'),('nearby-safe-band.mjs',root.parent/'hud-occlusion-candidate/payload/nearby-safe-band.mjs'),('nearby-safe-band-ordinary.css',root.parent/'ordinary-hud-candidate/payload/nearby-safe-band-ordinary.css')]:
 external.append({'path':'docs/'+rel,'sha256':sha(local),'bytes':local.stat().st_size,'localPath':str(local)})
report={'validation':json.loads((root/'reports/FINAL_VALIDATION.json').read_text()),'status':'FROZEN_CANDIDATE_PENDING_INDEPENDENT_AUDIT','basePublishedCommit':'46c2b16d179264b07035757cf4dbb6dea2804922','sourceRecoveryBase':'8c4f847','overlayOnly':True,'deletePaths':[],'files':files,'fileCount':len(files),'totalBytes':sum(x['bytes'] for x in files),'sourceChanges':source,'existingPinnedDependencies':external,'scope':['Ordinary UI parity, bounded image recovery and verified BFCache lifecycle','69 portraits; 18 new/replaced images, farmer field12 body+AA and single atlas','Previously approved latest56-only two hidden route cells; historical55 unchanged','Ordinary HUD safe band and original PWA install/update semantics retained'],'excluded':['QA storage facade/status/banner','Private harbor/water/prologue geometry or art','Audio activation','Back-navigation guard'],'limitations':['Current field actor height and art scale unchanged; not final visual-quality approval','iOS and real network failure recovery not yet device-tested','Exact published shell compiled dependency retained because its source was not recovered','All prior previews and old generated chunks must remain served']}
(root/'ORDINARY_CONVERGENCE_MANIFEST_V1.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'bytes':report['totalBytes'],'sourceFiles':len(source),'manifestSha256':sha(root/'ORDINARY_CONVERGENCE_MANIFEST_V1.json')}))
