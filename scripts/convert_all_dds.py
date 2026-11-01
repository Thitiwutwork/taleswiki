import os
import sys
from PIL import Image

dirs_to_check = [
    r'E:\talesItem\frontend\public\img\skins',
    r'E:\talesItem\frontend\public\img\characters',
    r'E:\talesItem\frontend\public\img\shinchan_chars',
    r'E:\talesItem\frontend\public\icons',
    r'E:\talesItem\public\img\skins',
    r'E:\talesItem\public\img\characters',
]

converted_count = 0
total_checked = 0

for target_dir in dirs_to_check:
    if not os.path.exists(target_dir):
        continue
    for fname in os.listdir(target_dir):
        fpath = os.path.join(target_dir, fname)
        if not os.path.isfile(fpath):
            continue
        total_checked += 1
        with open(fpath, 'rb') as f:
            header = f.read(4)
        if header == b'DDS ':
            try:
                im = Image.open(fpath)
                lower = fname.lower()
                if lower.endswith(('.jpg', '.jpeg')):
                    if im.mode != 'RGB':
                        im = im.convert('RGB')
                    im.save(fpath, 'JPEG', quality=90, optimize=True)
                else:
                    # Save as PNG
                    im.save(fpath, 'PNG', optimize=True)
                converted_count += 1
                print(f"[CONVERTED] {fname} ({im.size}, {im.mode})")
            except Exception as e:
                print(f"[ERROR] Failed to convert {fname}: {e}")

print(f"\nDone! Checked {total_checked} files. Converted {converted_count} DDS files to standard PNG/JPEG.")
