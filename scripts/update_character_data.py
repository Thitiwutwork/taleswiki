import json
import os

standing_dir = r'E:\talesItem\frontend\public\img\characters_standing'
existing_standing = {os.path.splitext(f)[0] for f in os.listdir(standing_dir) if f.endswith('.png')}
print('Existing standing codes:', sorted(existing_standing))

for p in [r'E:\talesItem\data\characters.json', r'E:\talesItem\frontend\public\data\characters.json']:
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            chars = json.load(f)
        
        for c in chars:
            code = c.get('code', '')
            if code in existing_standing:
                c['image_url'] = f'/img/characters_standing/{code}.png'
            else:
                c['image_url'] = None
        
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(chars, f, ensure_ascii=False, indent=2)
        print(f'Updated {p}')

# Now re-generate characters.data.ts
with open(r'E:\talesItem\data\characters.json', 'r', encoding='utf-8') as f:
    chars = json.load(f)

ts_content = '''import { CharacterInfo } from "../models/character.model";

export const CHARACTERS_DATA: CharacterInfo[] = ''' + json.dumps(chars, ensure_ascii=False) + ';\n'

with open(r'E:\talesItem\frontend\src\app\data\characters.data.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print('Updated characters.data.ts with authentic standing images!')
