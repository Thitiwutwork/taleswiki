const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const db = new DatabaseSync('data/items.sqlite', { readOnly: true });

// 1. Build baseName -> baseId map
const allItems = db.prepare("SELECT id, name, obtain_sources FROM items").all();

const nameToId = new Map();
for (const it of allItems) {
  const n = it.name.trim();
  if (!nameToId.has(n)) nameToId.set(n, it.id);
}

// 2. Build reverse exchange map: target_id -> [reward_ids]
const exchangeMap = {}; // target_id -> array of reward ids

for (const it of allItems) {
  try {
    const sources = JSON.parse(it.obtain_sources || '[]');
    for (const s of sources) {
      if (s.type === 'exchange' && s.target_id) {
        if (!exchangeMap[s.target_id]) exchangeMap[s.target_id] = [];
        if (!exchangeMap[s.target_id].includes(it.id)) {
          exchangeMap[s.target_id].push(it.id);
        }
      }
    }
  } catch (e) {}
}

console.log('Direct target_ids mapped:', Object.keys(exchangeMap).length);

// 3. Connect quantity bundles (e.g. "X 1 ชิ้น", "X 10 ชิ้น") to base item's rewards
let bundleLinked = 0;
for (const it of allItems) {
  if (exchangeMap[it.id]) continue; // already has direct rewards
  const clean = it.name.replace(/\s*\d+\s*(?:ชิ้น|ครั้ง|วัน|ปี)$/, '').replace(/\s*\([^)]*\)$/, '').trim();
  if (clean && clean !== it.name && nameToId.has(clean)) {
    const baseId = nameToId.get(clean);
    if (exchangeMap[baseId] && exchangeMap[baseId].length > 0) {
      exchangeMap[it.id] = exchangeMap[baseId];
      bundleLinked++;
    }
  }
}

console.log('Bundle items successfully linked:', bundleLinked);
console.log('Total items with exchange targets now:', Object.keys(exchangeMap).length);

// Check sample bundle items
console.log('129522 (หินแห่งความปรารถนา 20 ปี):', exchangeMap[129522]?.length);
console.log('129523 (หินแห่งความปรารถนา 20 ปี 1 ชิ้น):', exchangeMap[129523]?.length);
console.log('127146 (ตั๋วแลกการ์ด 3 ดาว 5 ชิ้น):', exchangeMap[127146]?.length);

// Write to public/data/exchange_map.json
fs.writeFileSync('frontend/public/data/exchange_map.json', JSON.stringify(exchangeMap));
console.log('Wrote frontend/public/data/exchange_map.json successfully!');
