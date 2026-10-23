#!/usr/bin/env python3
"""Lossless RGBA packing only. Originals and approved derivatives are never written.
Requires Python 3, Pillow and NumPy. Run --verify-only after packing to audit all cells.
The public manifest is standalone: no machine paths or private archive identifiers.
"""
import argparse, hashlib, json, os, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

PAD = 2
DIRECTIONS = ('FRONT', 'RIGHT', 'LEFT', 'BACK')
POSES = ('IDLE', 'A', 'B')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read_export(path, name):
    text = path.read_text()
    tail = text.split('export const ' + name + '=', 1)[1].lstrip()
    if tail.startswith('Object.freeze('):
        tail = tail[len('Object.freeze('):]
    return json.JSONDecoder().raw_decode(tail)[0]

def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def png_atomic(path, image):
    import io
    output = io.BytesIO()
    image.save(output, format='PNG', optimize=True)
    atomic(path, output.getvalue())
    return sha(output.getvalue())

def inputs(root):
    return {
        'npc': read_export(root/'dist/art/approved-npc-bindings.mjs', 'APPROVED_NPC_FRAMES'),
        'player': read_export(root/'dist/art/approved-player-bindings.mjs', 'APPROVED_PLAYER_FRAMES'),
        'species': read_export(root/'dist/approved-species-data.mjs', 'APPROVED_SPECIES_DATA')['records'],
    }

def pack(root):
    data = inputs(root)
    manifest = {'version': 'approved-lossless-atlas-v1', 'padding': PAD,
                'pixelOperation': 'Exact RGBA copy, nearest-edge extrusion only outside source rectangle; no resizing, recoloring or alpha compositing.',
                'sampling': 'Use each frame source rectangle; no mipmaps; clamp UVs to rectangle for GPU rendering.',
                'atlases': {}, 'frames': {'npc': {}, 'player': {}, 'species': {}}}
    for kind in ('npc', 'player', 'species'):
        identities = sorted(data[kind]) if kind == 'species' else sorted({key.split('.')[0] for key in data[kind]})
        for identity in identities:
            if kind == 'species':
                slots = [(f'{identity}.{side}', data[kind][identity][side]) for side in ('front', 'back')]
                columns, rows, cw, ch = 2, 1, 514 + PAD*2, 514 + PAD*2
            else:
                slots = [(f'{identity}.{direction}.{pose}', data[kind][f'{identity}.{direction}.{pose}']) for direction in DIRECTIONS for pose in POSES]
                columns, rows = 3, 4
                cw = max(f['width'] for _, f in slots) + PAD*2
                ch = max(f['height'] for _, f in slots) + PAD*2
                assert ch <= 192 + PAD*2
            atlas = Image.new('RGBA', (columns*cw, rows*ch))
            atlas_id = f'{kind}/{identity}'
            for index, (key, original) in enumerate(slots):
                left, top = index % columns*cw, index//columns*ch
                if not original.get('src'):
                    assert kind == 'species' and identity in ('SPECIES_004', 'SPECIES_132') and key.endswith('.back')
                    manifest['frames'][kind][key] = {'atlas': atlas_id, 'rect': [left, top, cw, ch], 'source': None, 'status': 'user-deferred', 'src': None, 'transparentSlot': True}
                    continue
                path = root/'dist'/original['src'].removeprefix('./')
                raw = path.read_bytes()
                assert sha(raw) == original['sha256'], f'Source hash changed: {key}'
                with Image.open(path) as image:
                    pixels = np.array(image.convert('RGBA'))
                h, w = pixels.shape[:2]
                assert [w, h] == [original['width'], original['height']]
                # Bottom aligned, centered per slot; original bottom-center anchors stay exact.
                x, y = left + PAD + (cw-PAD*2-w)//2, top + ch-PAD-h
                padded = np.pad(pixels, ((PAD,PAD),(PAD,PAD),(0,0)), mode='edge')
                atlas.paste(Image.fromarray(padded), (x-PAD,y-PAD))
                if kind == 'species':
                    sx, sy, sw, sh = original['source']
                else:
                    l,t,r,b = original['bounds']; sx,sy,sw,sh = l,t,r-l,b-t
                frame = {'atlas': atlas_id, 'rect': [x,y,w,h], 'source': [x+sx,y+sy,sw,sh],
                         'width': w, 'height': h, 'bounds': original.get('bounds',[sx,sy,sx+sw,sy+sh]),
                         'anchor': [sx+sw/2,sy+sh], 'atlasAnchor': [x+sx+sw/2,y+sy+sh],
                         'slot': [left,top,cw,ch], 'status': original.get('status','approved-derivative'),
                         'derivativeSha256': sha(raw), 'sourceSha256': original['sourceSha256'], 'rgbaSha256': sha(pixels.tobytes())}
                manifest['frames'][kind][key] = frame
            rel = f'assets/approved-atlases/{atlas_id}.png'
            digest = png_atomic(root/'dist'/rel, atlas)
            manifest['atlases'][atlas_id] = {'src': rel, 'width': atlas.width, 'height': atlas.height, 'sha256': digest, 'columns': columns, 'rows': rows, 'cellWidth': cw, 'cellHeight': ch}
    assert len(manifest['atlases']) == 214
    payload = json.dumps(manifest, ensure_ascii=False, separators=(',',':'))
    atomic(root/'dist/approved-atlas-data.mjs', ('// Generated by tools/pack-approved-atlases.py. Lossless approved derivatives only.\nexport const APPROVED_ATLAS_DATA='+payload+';\n').encode())
    atomic(root/'dist/assets/approved-atlases/manifest.json', (payload+'\n').encode())
    return manifest

def verify(root, manifest):
    originals = inputs(root)
    counts = {kind:0 for kind in originals}
    deferred = []
    scale_samples = 0
    for atlas_id, meta in manifest['atlases'].items():
        path = root/'dist'/meta['src']
        assert sha(path.read_bytes()) == meta['sha256']
        with Image.open(path) as image:
            atlas = np.array(image.convert('RGBA'))
        assert image.size == (meta['width'], meta['height']) and max(image.size) < 4096
        kind = atlas_id.split('/')[0]
        for key, frame in manifest['frames'][kind].items():
            if frame['atlas'] != atlas_id: continue
            x,y,w,h = frame['rect']
            cell = atlas[y:y+h,x:x+w]
            if frame['status'] == 'user-deferred':
                assert not cell.any() and frame['source'] is None and frame['src'] is None
                deferred.append(key); continue
            original = originals[kind][key] if kind != 'species' else originals[kind][key.rsplit('.',1)[0]][key.rsplit('.',1)[1]]
            path = root/'dist'/original['src'].removeprefix('./')
            assert sha(path.read_bytes()) == frame['derivativeSha256'] == original['sha256']
            with Image.open(path) as image:
                expected = np.array(image.convert('RGBA'))
            assert np.array_equal(cell, expected), f'RGBA mismatch {key}'
            assert sha(cell.tobytes()) == frame['rgbaSha256']
            padded = np.pad(expected, ((PAD,PAD),(PAD,PAD),(0,0)), mode='edge')
            assert np.array_equal(atlas[y-PAD:y+h+PAD,x-PAD:x+w+PAD], padded), f'Extrusion mismatch {key}'
            # Bilinear footprints at subpixel edges are identical to independently
            # clamped sprites across typical display scale and DPR combinations.
            for scale in (38/192, 64/512, 128/512, .5, 1, 1.5, 2):
                for dpr in (1, 1.25, 1.5, 2, 3):
                    offset = min(.499, .5/(scale*dpr))
                    for px,py in ((-offset,-offset),(w-1+offset,-offset),(-offset,h-1+offset),(w-1+offset,h-1+offset)):
                        ix,iy = int(np.floor(px)),int(np.floor(py)); dx,dy = px-ix,py-iy
                        actual = np.zeros(4); reference = np.zeros(4)
                        for ox,oy,weight in ((0,0,(1-dx)*(1-dy)),(1,0,dx*(1-dy)),(0,1,(1-dx)*dy),(1,1,dx*dy)):
                            actual += atlas[y+iy+oy,x+ix+ox]*weight
                            reference += expected[min(h-1,max(0,iy+oy)),min(w-1,max(0,ix+ox))]*weight
                        assert np.array_equal(actual,reference), f'Bilinear bleed {key}'
                        scale_samples += 1
            counts[kind] += 1
    assert counts == {'npc':660,'player':24,'species':312}, counts
    assert sorted(deferred) == ['SPECIES_004.back','SPECIES_132.back']
    return {'status':'passed', 'atlases':len(manifest['atlases']), 'verifiedExactRGBAFrames':counts, 'transparentDeferredSlots':sorted(deferred), 'extrudedBordersVerified':sum(counts.values()), 'bilinearScaleDprEdgeSamples':scale_samples, 'maxTextureDimension':max(max(a['width'],a['height']) for a in manifest['atlases'].values()), 'atlasPngBytes':sum((root/'dist'/a['src']).stat().st_size for a in manifest['atlases'].values()), 'families': {kind: {'atlases':sum(key.startswith(kind+'/') for key in manifest['atlases']), 'pngBytes':sum((root/'dist'/a['src']).stat().st_size for key,a in manifest['atlases'].items() if key.startswith(kind+'/'))} for kind in counts}, 'browserDprScreenshotTest':'not run by this pixel-level verifier', 'originalsModified':False}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--verify-only',action='store_true')
    args = parser.parse_args()
    manifest = json.loads((args.root/'dist/assets/approved-atlases/manifest.json').read_text()) if args.verify_only else pack(args.root)
    report = verify(args.root,manifest)
    atomic(args.root/'integration-report/lossless-atlas-verification.json',(json.dumps(report,indent=2)+'\n').encode())
    print(json.dumps(report))
