import sqlite3
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner')
from build_full_database import read_file_from_pkg, decode_utf16

db_path = r'E:\talesItem\data\items.sqlite'
game_dir = r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner'

conn = sqlite3.connect(db_path)
c = conn.cursor()

# 1. Existing icons in directory
icons_dir = r'E:\talesItem\public\icons'
existing_icon_files = set(f.lower() for f in os.listdir(icons_dir))

# 2. Known items with icons
c.execute("SELECT id, name, position_id, character_id, icon_file FROM items WHERE icon_file IS NOT NULL AND icon_file != ''")
known_items = c.fetchall()

strict_map = {}
pos_map = {}
clean_map = {}

def clean_item_name(n):
    if not n: return ''
    n2 = re.sub(r'\s*\((?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น|EXP.*|TR.*)\)', '', n)
    n2 = re.sub(r'\s*\[(?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น)\]', '', n2)
    n2 = re.sub(r'\s*\d+\s*(?:วัน|ชิ้น)', '', n2)
    return n2.strip()

for iid, name, pos_id, char_id, icon in known_items:
    if icon.lower() in existing_icon_files:
        name_str = name.strip()
        strict_map[(name_str, pos_id, char_id)] = icon
        pos_map[(name_str, pos_id)] = icon
        clean_name = clean_item_name(name_str)
        if (clean_name, pos_id) not in clean_map:
            clean_map[(clean_name, pos_id)] = icon
        if clean_name not in clean_map:
            clean_map[clean_name] = icon

# 3. Set mappings
raw_set = decode_utf16(read_file_from_pkg(os.path.join(game_dir, 'tr4.pkg'), r'script\clientiteminfo\tblavataritemsetdesc.txt'))
set_to_members = {}
for l in raw_set.splitlines():
    if not l.strip() or l.startswith('//') or l.startswith('_'): continue
    pts = l.split(',')
    if len(pts) >= 2 and pts[0].isdigit() and pts[1].isdigit():
        set_to_members.setdefault(int(pts[0]), []).append(int(pts[1]))

c.execute("SELECT id, icon_file FROM items WHERE icon_file IS NOT NULL AND icon_file != ''")
id_to_icon = dict(c.fetchall())

# 4. Exchange mappings
raw_exch_info = decode_utf16(read_file_from_pkg(os.path.join(game_dir, 'tr4.pkg'), r'script\clientiteminfo\essenexchangesysteminfo.txt'))
raw_exch_req = decode_utf16(read_file_from_pkg(os.path.join(game_dir, 'tr4.pkg'), r'script\clientiteminfo\essenexchangesystemconsumelist.txt'))
exch_results = {}
for l in raw_exch_info.splitlines():
    if not l.strip() or l.startswith('//') or l.startswith('_'): continue
    pts = l.split(',')
    if len(pts) >= 5 and pts[0].isdigit() and pts[4].isdigit():
        exch_results[int(pts[0])] = int(pts[4])

consume_to_result = {}
for l in raw_exch_req.splitlines():
    if not l.strip() or l.startswith('//') or l.startswith('_'): continue
    pts = l.split(',')
    if len(pts) >= 4 and pts[0].isdigit() and pts[2].isdigit():
        eid = int(pts[0])
        req_id = int(pts[2])
        if eid in exch_results:
            consume_to_result.setdefault(req_id, []).append(exch_results[eid])

# 5. Process Missing Items
c.execute("SELECT id, name, position_id, character_id, item_kind FROM items WHERE icon_file IS NULL OR icon_file = ''")
missing_items = c.fetchall()

updates = []
for iid, name, pos_id, char_id, ikind in missing_items:
    icon = None
    clean_name = clean_item_name(name)

    if f"{iid}.png".lower() in existing_icon_files:
        icon = f"{iid}.png"
    elif ikind > 0 and f"{ikind}.png".lower() in existing_icon_files:
        icon = f"{ikind}.png"

    if not icon:
        icon = strict_map.get((name, pos_id, char_id))
    if not icon:
        icon = pos_map.get((name, pos_id))
    if not icon:
        icon = clean_map.get((clean_name, pos_id))
    if not icon:
        icon = clean_map.get(clean_name)

    if not icon and iid in set_to_members:
        for mid in set_to_members[iid]:
            if mid in id_to_icon and id_to_icon[mid]:
                icon = id_to_icon[mid]
                break

    if not icon and iid in consume_to_result:
        for tid in consume_to_result[iid]:
            if tid in id_to_icon and id_to_icon[tid]:
                icon = id_to_icon[tid]
                break

    if icon:
        updates.append((icon, f"/api/icons/{icon}", iid))

print(f"Applying {len(updates):,} icon updates to items.sqlite...")
c.executemany("UPDATE items SET icon_file = ?, icon_url = ? WHERE id = ?", updates)
conn.commit()

c.execute("SELECT COUNT(*) FROM items WHERE icon_file IS NOT NULL AND icon_file != ''")
total_with_icons = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM items")
total_items = c.fetchone()[0]
print(f"Database updated! Items with icons: {total_with_icons:,} / {total_items:,} ({total_with_icons/total_items*100:.1f}%)")

conn.close()
