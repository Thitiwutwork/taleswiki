const fs = require('fs');
const path = require('path');

const chars = JSON.parse(fs.readFileSync('E:/talesItem/frontend/public/data/characters.json', 'utf8'));
const skins = JSON.parse(fs.readFileSync('E:/talesItem/frontend/public/data/room_skins.json', 'utf8'));
const filters = JSON.parse(fs.readFileSync('E:/talesItem/frontend/public/data/filters.json', 'utf8'));

// Also pick 60 popular items as instant initial items conforming to Item interface
const rawItems = JSON.parse(fs.readFileSync('E:/talesItem/frontend/public/data/items_sample.json', 'utf8')).slice(0, 60);
const items = rawItems.map(it => ({
  id: it.id,
  name: it.name,
  category_id: it.category_id || 0,
  character_id: it.character_id || 0,
  character_name: it.character_name || 'ทุกตัวละคร (All)',
  position_id: it.position_id,
  position_name: it.position_name,
  item_kind: it.item_kind || 0,
  level_req: it.level_req || 0,
  game_money: it.game_money || 0,
  cash: it.cash || 0,
  description: it.description || '',
  stats: it.stats || [],
  obtain_methods: Array.isArray(it.obtain_methods) ? it.obtain_methods : (it.obtain_methods ? [it.obtain_methods] : []),
  icon_file: it.icon_file || null,
  icon_url: it.icon_url || null
}));

const targetDir = 'E:/talesItem/frontend/src/app/data';
fs.mkdirSync(targetDir, { recursive: true });

fs.writeFileSync(
  path.join(targetDir, 'characters.data.ts'),
  'import { CharacterInfo } from "../models/character.model";\n\nexport const CHARACTERS_DATA: CharacterInfo[] = ' + JSON.stringify(chars) + ';\n'
);

fs.writeFileSync(
  path.join(targetDir, 'skins.data.ts'),
  'import { RoomSkin } from "../models/character.model";\n\nexport const ROOM_SKINS_DATA: RoomSkin[] = ' + JSON.stringify(skins) + ';\n'
);

fs.writeFileSync(
  path.join(targetDir, 'filters.data.ts'),
  'import { FiltersResponse } from "../models/item.model";\n\nexport const FILTERS_DATA: FiltersResponse = ' + JSON.stringify(filters) + ';\n'
);

fs.writeFileSync(
  path.join(targetDir, 'initial-items.data.ts'),
  'import { Item } from "../models/item.model";\n\nexport const INITIAL_ITEMS_DATA: Item[] = ' + JSON.stringify(items) + ';\n'
);

console.log('Successfully regenerated TypeScript data modules!');
