import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

chars_path = r'E:\talesItem\data\characters.json'
with open(chars_path, 'r', encoding='utf-8') as f:
    chars = json.load(f)

for c in chars:
    cid = c['id']
    # All characters have char_{id}.png in /img/characters/
    c['image_url'] = f'/img/characters/char_{cid}.png'
    # Ensure valid icon_file
    if cid == 38: # Nene
        c['icon_file'] = 'char_38.png'
    elif cid == 40: # Masao
        c['icon_file'] = 'char_40.png'
    elif cid == 49: # Jab
        c['icon_file'] = 'char_49.png'

with open(chars_path, 'w', encoding='utf-8') as f:
    json.dump(chars, f, ensure_ascii=False, indent=2)

print(f"Updated {len(chars)} characters in characters.json with official standing artwork!")
for c in chars[:10]:
    print(f"  {c['id']:2d}: {c['name']} -> image_url={c['image_url']}, icon_file={c['icon_file']}")
