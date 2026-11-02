import urllib.request
import os
import json
from PIL import Image
import io
import numpy as np

os.makedirs(r'E:\talesItem\frontend\public\img\characters_standing', exist_ok=True)
os.makedirs(r'E:\talesItem\public\img\characters_standing', exist_ok=True)

# Direct URLs for character illustrations
ONSTOVE_URLS = {
    'ab': 'https://static.wikia.nocookie.net/talesrunner/images/d/d5/Abel_Onstove.png/revision/latest',
    'bd': 'https://static.wikia.nocookie.net/talesrunner/images/1/1b/Bada_Onstove.png/revision/latest',
    'ha': 'https://static.wikia.nocookie.net/talesrunner/images/5/55/Harang_Onstove.png/revision/latest',
    'ka': 'https://static.wikia.nocookie.net/talesrunner/images/6/61/Kai_Onstove.png/revision/latest',
    'kr': 'https://static.wikia.nocookie.net/talesrunner/images/3/3d/Kuro_Onstove.png/revision/latest',
    'la': 'https://static.wikia.nocookie.net/talesrunner/images/8/89/Lala_Onstove.png/revision/latest',
    'lu': 'https://static.wikia.nocookie.net/talesrunner/images/c/c0/Lucy_Onstove.png/revision/latest',
    'mk': 'https://static.wikia.nocookie.net/talesrunner/images/a/ad/Maki_onstove.png/revision/latest',
    'mi': 'https://static.wikia.nocookie.net/talesrunner/images/1/11/Miho_Onstove.png/revision/latest',
    'rd': 'https://static.wikia.nocookie.net/talesrunner/images/3/3a/R_Onstove.png/revision/latest',
    'rg': 'https://static.wikia.nocookie.net/talesrunner/images/5/5c/Rough_onstove.png/revision/latest',
    'rg2': 'https://static.wikia.nocookie.net/talesrunner/images/5/5c/Rough_onstove.png/revision/latest',
    'sh': 'https://static.wikia.nocookie.net/talesrunner/images/f/fb/Shiho_Onstove.png/revision/latest',
    'vr': 'https://static.wikia.nocookie.net/talesrunner/images/7/7d/Vera_Onstove.png/revision/latest',
    'og': 'https://static.wikia.nocookie.net/talesrunner/images/4/42/Wukong_Onstove.png/revision/latest',
    'yk': 'https://static.wikia.nocookie.net/talesrunner/images/a/ae/Yuki_Onstove.png/revision/latest',
    'ce': 'https://static.wikia.nocookie.net/talesrunner/images/c/cf/CeliaRender.png/revision/latest',
    'do': 'https://static.wikia.nocookie.net/talesrunner/images/5/5d/DamyeonRender.png/revision/latest',
    'kh': 'https://static.wikia.nocookie.net/talesrunner/images/7/7b/ChloeRender.png/revision/latest',
}

RENEWED_URLS = {
    'cw': 'https://static.wikia.nocookie.net/talesrunner/images/a/a2/Charlierenewed.jpg/revision/latest',
    'mm': 'https://static.wikia.nocookie.net/talesrunner/images/5/59/Mingmingrenewed.jpg/revision/latest',
    'rn': 'https://static.wikia.nocookie.net/talesrunner/images/8/8e/Linarenewed.jpg/revision/latest',
    'bb': 'https://static.wikia.nocookie.net/talesrunner/images/d/d3/Bigborenewed.jpg/revision/latest',
    'dn': 'https://static.wikia.nocookie.net/talesrunner/images/c/c7/Dndrenewed.jpg/revision/latest',
}

# Local Shinchan images
SHINCHAN_LOCAL = {
    'jg': r'E:\talesItem\frontend\public\img\shinchan_chars\npcimg01.png',
    'cs': r'E:\talesItem\frontend\public\img\shinchan_chars\npcimg02.png',
    'yr_ne': r'E:\talesItem\frontend\public\img\shinchan_chars\npcimg03.png',
    'hu_ma': r'E:\talesItem\frontend\public\img\shinchan_chars\npcimg04.png',
    'mg': r'E:\talesItem\frontend\public\img\shinchan_chars\npcimg05.png',
}

headers = {'User-Agent': 'Mozilla/5.0'}

# 1. Download Onstove / Render transparent PNGs
for code, u in ONSTOVE_URLS.items():
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            im = Image.open(io.BytesIO(data))
            out_p1 = rf'E:\talesItem\frontend\public\img\characters_standing\{code}.png'
            out_p2 = rf'E:\talesItem\public\img\characters_standing\{code}.png'
            im.save(out_p1)
            im.save(out_p2)
            print(f'Saved {code} (Onstove): {im.size}')
    except Exception as e:
        print(f'Error {code}: {e}')

# 2. Process Renewed characters (make transparent background)
for code, u in RENEWED_URLS.items():
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            im = Image.open(io.BytesIO(resp.read())).convert('RGBA')
            corner = im.getpixel((0, 0))[:3]
            arr = np.array(im)
            rgb = arr[:, :, :3]
            diff = np.abs(rgb.astype(int) - np.array(corner).astype(int)).max(axis=2)
            mask = diff < 22
            arr[mask, 3] = 0
            out_im = Image.fromarray(arr)
            out_p1 = rf'E:\talesItem\frontend\public\img\characters_standing\{code}.png'
            out_p2 = rf'E:\talesItem\public\img\characters_standing\{code}.png'
            out_im.save(out_p1)
            out_im.save(out_p2)
            print(f'Saved {code} (Renewed + Transparent): {out_im.size}')
    except Exception as e:
        print(f'Error {code}: {e}')

# 3. Copy Shinchan images
for code, src in SHINCHAN_LOCAL.items():
    if os.path.exists(src):
        im = Image.open(src)
        out_p1 = rf'E:\talesItem\frontend\public\img\characters_standing\{code}.png'
        out_p2 = rf'E:\talesItem\public\img\characters_standing\{code}.png'
        im.save(out_p1)
        im.save(out_p2)
        print(f'Saved {code} (Shinchan): {im.size}')

print('All character standing artwork downloaded and processed successfully!')
