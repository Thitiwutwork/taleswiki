import sys
import os

sys.path.append(r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner')
from build_full_database import read_file_from_pkg
from PIL import Image
import io

game_dir = r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner'
out_dir = r'E:\talesItem\public\img\skins'
os.makedirs(out_dir, exist_ok=True)

skins = [
    ('tr10.pkg', r'gui2\background\bg_myroom.jpg', 'skin_royal_academy.jpg', 'โรงเรียนเวทมนตร์ (Royal Academy)'),
    ('tr20.pkg', r'gui3\2025_animalvillage\background\bg_2025_animalvillage.png', 'skin_animal_village.png', 'แอนิมอลวิเลจ (Animal Village)'),
    ('tr20.pkg', r'gui3\2024_nightmare\background\bg_2024_nightmare.png', 'skin_nightmare.png', 'ไนต์แมร์ (Nightmare)'),
    ('tr20.pkg', r'gui3\2024_lastchaos\background\bg_2024_lastchaos.jpg', 'skin_last_chaos.jpg', 'ลาสต์เคออส (Last Chaos)'),
    ('tr10.pkg', r'gui2\2022_horizon\background\bg_2022_horizon.png', 'skin_horizon.png', 'ฮอไรซอน (Horizon)'),
    ('tr10.pkg', r'gui2\2021_eclipse\background\bg_2021_eclipse.png', 'skin_eclipse.png', 'อีคลิปส์ (Eclipse)'),
    ('tr10.pkg', r'gui2\2020underworld\background\bg_2020underworld_img.png', 'skin_underworld.png', 'อันเดอร์เวิลด์ (Underworld)'),
    ('tr10.pkg', r'gui2\background\bg_farm_day01.jpg', 'skin_farm.jpg', 'เทลส์ฟาร์ม (Tales Farm)'),
    ('tr10.pkg', r'gui2\2023_desertkingdom\background\bg_2023_winter.jpg', 'skin_desert_kingdom.jpg', 'เดเซิร์ตคิงดอม (Desert Kingdom)'),
]

metadata = []
for pkg, rel_path, out_fn, title in skins:
    pkg_path = os.path.join(game_dir, pkg)
    data = read_file_from_pkg(pkg_path, rel_path)
    if data:
        out_p = os.path.join(out_dir, out_fn)
        with open(out_p, 'wb') as f:
            f.write(data)
        im = Image.open(io.BytesIO(data))
        metadata.append({
            'id': out_fn.split('.')[0],
            'name': title,
            'filename': out_fn,
            'url': f'/img/skins/{out_fn}',
            'width': im.size[0],
            'height': im.size[1]
        })
        print(f"Extracted {title} -> {out_fn} ({im.size})")
    else:
        print(f"FAILED to extract {title} from {pkg}")

import json
meta_path = os.path.join(r'E:\talesItem\data', 'room_skins.json')
with open(meta_path, 'w', encoding='utf-8') as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print(f"\nWrote {len(metadata)} skin metadata to {meta_path}")
