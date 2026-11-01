import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'E:\talesItem\data\characters.json', 'r', encoding='utf-8') as f:
    chars = json.load(f)

icons = os.listdir(r'E:\talesItem\public\icons')
icons_set = set(f.lower() for f in icons)

missing_char_icons = []
for c in chars:
    code = c.get('code')
    char_icon = f'{code}_character_000.png'
    found = char_icon.lower() in icons_set
    matching = [f for f in icons if f.lower().startswith(f'{code}_character')]
    status = "EXISTS" if found else "MISSING"
    if not found:
        missing_char_icons.append((c['id'], c['name'], code))
    print(f"{c['id']:2d} | {c['name']:15s} | code={code:4s} | {char_icon} [{status}] | found={len(matching)}")

print(f"\nMissing character icons: {len(missing_char_icons)}")
for m in missing_char_icons:
    print(" ", m)
