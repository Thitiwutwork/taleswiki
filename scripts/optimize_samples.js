const fs = require('fs');
const path = require('path');

const srcPath = 'E:/talesItem/frontend/public/data/items_sample.json';
const allItems = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// Group by position_id and keep up to 60 top items per slot
const byPos = {};
for (const it of allItems) {
  const p = it.position_id;
  byPos[p] = byPos[p] || [];
  if (byPos[p].length < 60) {
    byPos[p].push({
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
    });
  }
}

const sampled = Object.values(byPos).flat();
fs.writeFileSync(srcPath, JSON.stringify(sampled), 'utf8');

// Export initial 60 items into initial-items.data.ts
const targetFile = 'E:/talesItem/frontend/src/app/data/initial-items.data.ts';
const initial60 = sampled.slice(0, 60);

fs.writeFileSync(
  targetFile,
  'import { Item } from "../models/item.model";\n\nexport const INITIAL_ITEMS_DATA: Item[] = ' + JSON.stringify(initial60) + ';\n',
  'utf8'
);

const zlib = require('zlib');
const gz = zlib.gzipSync(JSON.stringify(sampled));
console.log('Successfully optimized items_sample.json:');
console.log('  Items count:', sampled.length);
console.log('  Raw size:', (fs.statSync(srcPath).size / 1024).toFixed(1), 'KB');
console.log('  Gzip transfer size:', (gz.length / 1024).toFixed(1), 'KB');
