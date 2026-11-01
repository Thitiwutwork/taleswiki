import sys
import os
import json

sys.path.append(r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner')
from build_full_database import read_file_from_pkg

pkg_path = r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner\tr10.pkg'
out_dir = r'E:\talesItem\public\img\characters'
os.makedirs(out_dir, exist_ok=True)

with open(r'E:\talesItem\data\characters.json', 'r', encoding='utf-8') as f:
    chars = json.load(f)

extracted = []
missing = []
for c in chars:
    cid = c['id']
    fpath = f'gui2\\trknightage\\trkheroimg\\trkheroimg_{cid:03d}.png'
    data = read_file_from_pkg(pkg_path, fpath)
    if data:
        out_name = f'char_{cid}.png'
        with open(os.path.join(out_dir, out_name), 'wb') as f:
            f.write(data)
        extracted.append((cid, c['name'], out_name, len(data)))
    else:
        missing.append((cid, c['name']))

print(f'Successfully extracted {len(extracted)} character illustrations!')
for cid, name, fn, sz in extracted:
    print(f'  ID {cid:2d}: {name} -> {fn} ({sz} bytes)')

print(f'\nMissing {len(missing)} character illustrations:')
for cid, name in missing:
    print(f'  ID {cid:2d}: {name}')
