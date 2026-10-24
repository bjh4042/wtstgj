from pathlib import Path
import hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1];v1=root.with_name('ordinary-integrated-v1');base=root.parents[1]/'recovery/published-main-8c4f847'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def record(p,rel=None):
 return {'path':rel or p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
def dump(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
expected='67d9ac48bd7570c9a64e438884e89dc22513b6835c9d616638be25e71a6bd547'
assert sha(v1/'ORDINARY_CONVERGENCE_MANIFEST_V1.json')==expected
before=json.loads((root/'reports/baseline-before.json').read_text())
assert all(sha(v1/rel)==h for rel,h in before.items()),'V1 baseline was changed'
changed=[p.relative_to(root).as_posix() for p in sorted((root/'dist').rglob('*')) if p.is_file() and (not (v1/p.relative_to(root)).is_file() or sha(p)!=sha(v1/p.relative_to(root)))]
assert changed==['dist/story/progression-service.mjs','dist/world/entry.mjs'],changed
assert all((root/p.relative_to(v1)).exists() for p in (v1/'dist').rglob('*') if p.is_file())
# The entire inherited asset/data surface is byte-exact, not only the changed portraits.
protected=[]
for folder in ['dist/assets','dist/data','dist/pwa']:
 rows=[record(p) for p in sorted((root/folder).rglob('*')) if p.is_file()]
 assert all(sha(v1/row['path'])==row['sha256'] for row in rows),folder
 protected.append({'scope':folder,'count':len(rows),'files':rows})
assert len([p for p in (root/'dist/assets/approved-battle-trainers').rglob('*') if p.suffix in ['.png','.webp']])==69
for rel in ['dist/ordinary/slots.mjs','dist/ordinary/launch.mjs','dist/compatibility/save-slots.mjs','dist/compatibility/gameplay-release.mjs','dist/world/definition.mjs','dist/world/service.mjs']:
 assert sha(root/rel)==sha(v1/rel),rel
# Walk only literal ES-module imports reachable from the true ordinary entry.
# Variable imports and runtime media/data URLs inherit V1 byte-exact source/data.
def imports(text):
 return set(re.findall(r'''(?:\bfrom\s*|\bimport\s*\(\s*)(["'])([^"']+)\1''',text)+re.findall(r'''\bimport\s*(["'])([^"']+)\1''',text))
for rel in changed:assert imports((root/rel).read_text())==imports((v1/rel).read_text()),'Changed dependency boundary: '+rel
pending=[root/'dist/ordinary-boot.mjs'];visited=set();missing=[]
while pending:
 p=pending.pop().resolve()
 if p in visited:continue
 visited.add(p)
 for _,spec in imports(p.read_text()):
  if not spec.startswith('.'):continue
  q=(p.parent/spec.split('?',1)[0].split('#',1)[0]).resolve()
  if not q.is_file():missing.append({'from':p.relative_to(root).as_posix(),'import':spec})
  elif q.suffix in ['.js','.mjs','.css']:pending.append(q)
assert not missing,missing
closure={'status':'PASS','baselineManifestSha256':expected,'baselineSnapshotFilesUnchanged':len(before),'changedRuntimeFiles':changed,'changedImportSets':'identical to V1','literalEntryGraphFiles':len(visited),'missingLiteralImports':missing,'literalEntryGraph':[record(p) for p in sorted(visited)],'protectedScopes':protected,'dynamicBoundary':'All inherited asset/data and every runtime module except these two message-only edits are byte-exact V1. Variable shell/HUD dependencies remain pinned below. This is not browser/network evidence.'}
dump(root/'reports/SOURCE_CLOSURE.json',closure)
# Publishable payload is always an additive/replacement overlay, never a tree deletion.
files=[]
for p in sorted((root/'build').rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(root/'build').as_posix();old=base/'docs'/rel
 if old.is_file() and sha(old)==sha(p):continue
 files.append({**record(p,'docs/'+rel),'localPath':str(p)})
for p in sorted((root/'dist/assets').rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(root/'dist').as_posix();old=base/'dist'/rel
 if old.is_file() and sha(old)==sha(p):continue
 assert p.suffix in ['.png','.webp'] or rel=='assets/approved-atlases/manifest.json',rel
 files.append({**record(p,'docs/'+rel),'localPath':str(p)})
sources=[]
for folder in ['dist','tests','tools','scripts']:
 for p in sorted((root/folder).rglob('*')):
  if not p.is_file():continue
  rel=p.relative_to(root).as_posix();old=base/rel
  if old.is_file() and sha(old)==sha(p):continue
  sources.append({**record(p),'baselineSha256':sha(old) if old.is_file() else None})
for rel in ['package.json','package-lock.json','vite.config.js']:
 sources.append(record(root/rel))
external=[]
for rel,local in [('assets/mobile-viewport-CKi2spbv.js',base/'docs/assets/mobile-viewport-CKi2spbv.js'),('assets/ui-preview-WMU7-lXW.css',base/'docs/assets/ui-preview-WMU7-lXW.css'),('nearby-safe-band.mjs',root.parent/'hud-occlusion-candidate/payload/nearby-safe-band.mjs'),('nearby-safe-band-ordinary.css',root.parent/'ordinary-hud-candidate/payload/nearby-safe-band-ordinary.css')]:
 external.append({**record(local,'docs/'+rel),'localPath':str(local)})
validation=json.loads((root/'reports/FINAL_VALIDATION.json').read_text());assert validation['status']=='PASS_CANDIDATE_PENDING_INDEPENDENT_AND_BROWSER'
manifest={'status':'FROZEN_NOTICE_V2_PENDING_INDEPENDENT_AUDIT','priorManifestSha256':expected,'sourceRecoveryBase':'8c4f847','lastKnownPublicPreviewCommit':'792107ea9c93370c6d4eb7304ff4466781240561','ordinaryPromotion':False,'overlayOnly':True,'deletePaths':[],'files':files,'fileCount':len(files),'totalBytes':sum(x['bytes'] for x in files),'sourceChanges':sources,'sourceChangeCount':len(sources),'existingPinnedDependencies':external,'validation':validation,'sourceClosureSha256':sha(root/'reports/SOURCE_CLOSURE.json'),'changedRuntimeFilesFromV1':changed,'scope':['Localize rejected story prerequisites; P03 explicitly directs first Harin victory.','Contextual status is dismissible with B and clears on interaction/menu/choice/dialogue/battle/sequence. Save/error/battle-outcome notices retain their previous priority.','Reproducible candidate build copies four exact PWA static resources before the unmodified PWA worker generator.'],'preserved':['All progression predicates/operations/rewards and save APIs','All 69 portraits, farmer field12, all other atlases, every data and map source','Real PWA module, original install/update semantics, V3 BFCache lifecycle and ordinary HUD'],'excluded':['Exit guard wiring','Private map/art/audio work','QA storage/banner/Lv100 seed in production','Any public repository or deployment write'],'limitations':['DOM tests use deterministic headless bindings, not a real browser.','Updated V2 has not yet received independent audit or browser QA.','Real iOS, genuine failed-network recovery, PWA installation and portrait entrance timing remain unverified.','Inherited GM004 rear placeholder HOLD remains; not a load regression.','Generic npm run build still assumes PWA resources pre-copied; use node tools/build-ordinary-notice-v2.mjs for this candidate.']}
p=root/'ORDINARY_NOTICE_MANIFEST_V2.json';dump(p,manifest)
archive=root.parent/'ORDINARY_NOTICE_CANDIDATE_V2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for row in files:z.write(row['localPath'],'payload/'+row['path'])
 for row in sources:z.write(root/row['path'],'source/'+row['path'])
 for row in external:z.write(row['localPath'],'pinned/'+row['path'])
 for f in sorted((root/'reports').glob('*')):
  if f.is_file():z.write(f,'reports/'+f.name)
 z.write(p,p.name);z.write(root/'README.md','README.md')
result={'status':'FROZEN','manifestSha256':sha(p),'archiveSha256':sha(archive),'archiveBytes':archive.stat().st_size,'overlayCount':len(files),'overlayBytes':manifest['totalBytes'],'sourceChanges':len(sources),'sourceClosureSha256':sha(root/'reports/SOURCE_CLOSURE.json')}
dump(root/'FREEZE_RECEIPT.json',result);print(json.dumps(result,indent=2))
