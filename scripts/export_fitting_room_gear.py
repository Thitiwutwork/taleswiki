import os
import sqlite3
import json
import shutil

db_path = r'E:\talesItem\data\items.sqlite'
icons_src = r'E:\talesItem\public\icons'
icons_dst = r'E:\talesItem\frontend\public\icons'
out_json = r'E:\talesItem\frontend\public\data\items_sample.json'

os.makedirs(icons_dst, exist_ok=True)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Fitting room target position IDs
target_positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

items = []
copied_icons = 0

for pos in target_positions:
    # Query items that have an icon_file that exists in icons_src, prioritizing items with stats
    cursor.execute("""
        SELECT id, name, description, position_id, position_name, character_id, character_name, icon_file, stats, obtain_methods
        FROM items
        WHERE position_id = ? AND icon_file IS NOT NULL AND icon_file != '' AND name IS NOT NULL AND name != ''
        ORDER BY (CASE WHEN stats IS NOT NULL AND stats != '' THEN 1 ELSE 0 END) DESC, id DESC
        LIMIT 150
    """, (pos,))
    rows = cursor.fetchall()
    
    for r in rows:
        icon_name = r['icon_file']
        src_icon_path = os.path.join(icons_src, icon_name)
        
        # Check if icon exists in icons_src
        if os.path.exists(src_icon_path):
            dst_icon_path = os.path.join(icons_dst, icon_name)
            if not os.path.exists(dst_icon_path):
                shutil.copy2(src_icon_path, dst_icon_path)
                copied_icons += 1
            
            stats_raw = r['stats']
            parsed_stats = []
            if stats_raw:
                try:
                    if stats_raw.startswith('['):
                        parsed_stats = json.loads(stats_raw)
                    else:
                        parsed_stats = [s.strip() for s in stats_raw.split('\n') if s.strip()]
                except:
                    parsed_stats = [stats_raw]
            
            items.append({
                'id': r['id'],
                'name': r['name'],
                'description': r['description'] or '',
                'position_id': r['position_id'],
                'position_name': r['position_name'],
                'character_id': r['character_id'],
                'character_name': r['character_name'],
                'icon_file': icon_name,
                'stats': parsed_stats,
                'obtain_methods': r['obtain_methods'] or ''
            })

conn.close()

with open(out_json, 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Exported {len(items)} fitting room equipment items to {out_json}")
print(f"Copied {copied_icons} item icons to {icons_dst}")
