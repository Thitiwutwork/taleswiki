const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/items.sqlite');

console.log('Sanitizing items.sqlite with transaction...');

const rows = db.prepare("SELECT id, name, obtain_sources, obtain_methods FROM items WHERE obtain_sources IS NOT NULL AND obtain_sources != ''").all();

const bogusClothingPattern = /(?:แว่น|รองเท้า|กางเกง|เสื้อ|กี่เพ้า|กระโปรง|เท้าสาว|ทรงปิ่น|หางม้า|บัลเลต์|หมวย)/;
const containerPattern = /(?:กล่อง|ถุง|หีบ|แพ็ก|แพ็กเกจ|เซ็ต|ตู้|ซอง|กระปุก|โถ|กระเช้า|ไข่|ตู้หมุนไข่|ตั๋ว|คูปอง)/;

let updated = 0;
let bogusRemoved = 0;
let sentinelsRemoved = 0;

const updateStmt = db.prepare("UPDATE items SET obtain_sources = ?, obtain_methods = ? WHERE id = ?");

db.exec('BEGIN TRANSACTION');

for (const r of rows) {
  let sources = [];
  try {
    sources = JSON.parse(r.obtain_sources || '[]');
  } catch (e) {
    continue;
  }

  let modified = false;
  const cleanSources = [];

  for (const s of sources) {
    const raw = ((s.raw || '') + ' ' + (s.target_name || ''));
    // 1. Sentinel prices
    if (raw.match(/(?:1,?000,?000|999,?999|9,?999,?999|1000000)\s*(?:Cash|TR)/i) || (s.type === 'shop' && s.count && s.count >= 999999)) {
      modified = true;
      sentinelsRemoved++;
      continue;
    }

    // 2. Bogus box drops
    if (s.type === 'box' || s.type === 'gacha') {
      if ((s.target_id && s.target_id <= 100) || (s.target_name && bogusClothingPattern.test(s.target_name)) || (s.target_name && !containerPattern.test(s.target_name))) {
        modified = true;
        bogusRemoved++;
        continue;
      }
    }

    cleanSources.push(s);
  }

  if (modified) {
    const cleanMethods = cleanSources.map(s => {
      if (s.action && s.target_name) {
        return `${s.action}: ${s.target_name}${s.count ? ' x' + s.count : ''}`;
      }
      return s.raw || s.label;
    }).filter(Boolean);

    const methodsStr = cleanMethods.length > 0 ? cleanMethods.join(' | ') : 'กิจกรรมภายในเกม / รางวัลพิเศษ';
    const sourcesStr = cleanSources.length > 0 ? JSON.stringify(cleanSources) : JSON.stringify([{
      type: 'other',
      label: 'กิจกรรม / พิเศษ',
      action: '',
      raw: 'กิจกรรมภายในเกม / รางวัลพิเศษ'
    }]);

    updateStmt.run(sourcesStr, methodsStr, r.id);
    updated++;
  }
}

db.exec('COMMIT');

console.log(`Finished sanitizing!`);
console.log(`- Items updated: ${updated}`);
console.log(`- Bogus box entries purged: ${bogusRemoved}`);
console.log(`- Sentinel price entries purged: ${sentinelsRemoved}`);
