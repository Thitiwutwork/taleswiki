import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect(r'E:\talesItem\data\items.sqlite')
c = conn.cursor()
c.execute("SELECT id, name, position_name, character_name, icon_file, obtain_methods FROM items WHERE name LIKE '%ชุดกีฬา 20 ปี%'")
for r in c.fetchall():
    print(r)
