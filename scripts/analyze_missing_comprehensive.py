import sqlite3
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner')
from build_full_database import read_file_from_pkg, decode_utf16

game_dir = r'E:\talesrunner\Full_Talesrunner1.5\Talesrunner'

# Exchange system info
raw_exch_info = decode_utf16(read_file_from_pkg(os.path.join(game_dir, 'tr4.pkg'), r'script\clientiteminfo\essenexchangesysteminfo.txt'))
raw_exch_req = decode_utf16(read_file_from_pkg(os.path.join(game_dir, 'tr4.pkg'), r'script\clientiteminfo\essenexchangesystemconsumelist.txt'))

exch_results = {}
for l in raw_exch_info.splitlines():
    if not l.strip() or l.startswith('//') or l.startswith('_'): continue
    pts = l.split(',')
    if len(pts) >= 5 and pts[0].isdigit() and pts[4].isdigit():
        exch_results[int(pts[0])] = int(pts[4])

# Map consumed ticket/item -> result item
consume_to_result = {}
for l in raw_exch_req.splitlines():
    if not l.strip() or l.startswith('//') or l.startswith('_'): continue
    pts = l.split(',')
    if len(pts) >= 4 and pts[0].isdigit() and pts[2].isdigit():
        eid = int(pts[0])
        req_id = int(pts[2])
        if eid in exch_results:
            target_id = exch_results[eid]
            consume_to_result.setdefault(req_id, []).append(target_id)

print(f"Total consumed items in exchange recipes: {len(consume_to_result)}")

conn = sqlite3.connect(r'E:\talesItem\data\items.sqlite')
c = conn.cursor()

c.execute("SELECT id, name, position_id FROM items WHERE (icon_file IS NULL OR icon_file = '') AND position_id IN (200, 201, 202, 1045, 9999)")
missing_tickets = c.fetchall()
print(f"Missing tickets/exchange items: {len(missing_tickets)}")

matched_tickets = 0
for tid, tname, pos in missing_tickets:
    if tid in consume_to_result:
        targets = consume_to_result[tid]
        c.execute(f"SELECT icon_file FROM items WHERE id IN ({','.join(str(t) for t in targets)}) AND icon_file IS NOT NULL AND icon_file != '' LIMIT 1")
        row = c.fetchone()
        if row and row[0]:
            matched_tickets += 1

print(f"Matched tickets via exchange target: {matched_tickets} / {len(missing_tickets)}")
