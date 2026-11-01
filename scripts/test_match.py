import sqlite3
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'E:\talesItem\data\items.sqlite')
c = conn.cursor()

# Get all items with icons
c.execute("SELECT name, position_id, character_id, icon_file FROM items WHERE icon_file IS NOT NULL AND icon_file != ''")
known_items = c.fetchall()

name_to_icon_strict = {}
name_to_icon_pos = {}
name_to_icon_broad = {}

for name, pos_id, char_id, icon in known_items:
    name_clean = name.strip()
    name_to_icon_strict[(name_clean, pos_id, char_id)] = icon
    name_to_icon_pos[(name_clean, pos_id)] = icon
    if name_clean not in name_to_icon_broad:
        name_to_icon_broad[name_clean] = icon

def clean_item_name(n):
    n2 = re.sub(r'\s*\((?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น|EXP.*|TR.*)\)', '', n)
    n2 = re.sub(r'\s*\[(?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น)\]', '', n2)
    n2 = re.sub(r'\s*\d+\s*(?:วัน|ชิ้น)', '', n2)
    return n2.strip()

# Now check missing items
c.execute("SELECT id, name, position_id, character_id FROM items WHERE icon_file IS NULL OR icon_file = ''")
missing = c.fetchall()
print(f'Total missing: {len(missing)}')

matched_count = 0
sample_matches = []
for iid, name, pos_id, char_id in missing:
    cleaned = clean_item_name(name)
    icon = (name_to_icon_strict.get((name, pos_id, char_id)) or
            name_to_icon_pos.get((name, pos_id)) or
            name_to_icon_strict.get((cleaned, pos_id, char_id)) or
            name_to_icon_pos.get((cleaned, pos_id)) or
            name_to_icon_broad.get(name) or
            name_to_icon_broad.get(cleaned))
    if icon:
        matched_count += 1
        if len(sample_matches) < 25:
            sample_matches.append((iid, name, '->', cleaned, '=>', icon))

print(f'Matched by name/variant fallback: {matched_count} / {len(missing)} ({matched_count/len(missing)*100:.1f}%)')
for s in sample_matches:
    print(' ', s)
