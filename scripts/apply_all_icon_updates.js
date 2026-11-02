const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('data/items.sqlite');

function cleanItemName(n) {
  if (!n) return '';
  let n2 = n.replace(/\s*\((?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น|EXP.*|TR.*)\)/g, '');
  n2 = n2.replace(/\s*\[(?:ซ่อมแซม|\d+\s*วัน|ถาวร|\d+\s*ชิ้น|ชิ้น)\]/g, '');
  n2 = n2.replace(/\s*\d+\s*(?:วัน|ชิ้น|ครั้ง|ปี|ชม\.|month|day)/gi, '');
  return n2.trim();
}

// 1. Build lookup maps from known items with valid icons
const knownItems = db.prepare("SELECT id, name, icon_file, position_id FROM items WHERE icon_file IS NOT NULL AND icon_file != ''").all();

const exactMap = new Map();
const cleanMap = new Map();
const themeCoinMap = new Map();
const themeTicketMap = new Map();
const themeBoxMap = new Map();
const themePkgMap = new Map();

for (const it of knownItems) {
  const name = it.name.trim();
  exactMap.set(name, it.icon_file);

  const c = cleanItemName(name);
  if (c && !cleanMap.has(c)) {
    cleanMap.set(c, it.icon_file);
  }

  // Theme coins / tickets
  const coinMatch = name.match(/^(?:เหรียญ)(.+)$/);
  if (coinMatch) {
    const theme = cleanItemName(coinMatch[1]);
    if (theme && !themeCoinMap.has(theme)) themeCoinMap.set(theme, it.icon_file);
  }
  const ticketMatch = name.match(/^(?:ตั๋ว|คูปอง)(.+)$/);
  if (ticketMatch) {
    const theme = cleanItemName(ticketMatch[1]);
    if (theme && !themeTicketMap.has(theme)) themeTicketMap.set(theme, it.icon_file);
  }
  const boxMatch = name.match(/^(?:กล่อง|ถุง)(.+)$/);
  if (boxMatch) {
    const theme = cleanItemName(boxMatch[1]);
    if (theme && !themeBoxMap.has(theme)) themeBoxMap.set(theme, it.icon_file);
  }
  const pkgMatch = name.match(/^(?:แพ็ก|แพ็กเกจ|เซ็ต)(.+)$/);
  if (pkgMatch) {
    const theme = cleanItemName(pkgMatch[1]);
    if (theme && !themePkgMap.has(theme)) themePkgMap.set(theme, it.icon_file);
  }
}

// 2. Iterate through all items without icons
const missing = db.prepare("SELECT id, name, position_id, position_name FROM items WHERE icon_file IS NULL OR icon_file = ''").all();
console.log('Total items currently missing icon_file:', missing.length);

const updates = [];

for (const it of missing) {
  const name = it.name.trim();
  const c = cleanItemName(name);
  let resolvedIcon = null;

  // Rule 1: Exact clean name match
  if (exactMap.has(c)) {
    resolvedIcon = exactMap.get(c);
  } else if (cleanMap.has(c)) {
    resolvedIcon = cleanMap.get(c);
  }

  // Rule 2: Gacha machines and spin tickets
  if (!resolvedIcon && (name.includes('เครื่องหมุนไข่') || name.includes('หมุนไข่'))) {
    const theme = cleanItemName(name.replace(/^(?:ใช้)?เครื่องหมุนไข่\s*/, ''));
    if (name.startsWith('ใช้เครื่องหมุนไข่')) {
      resolvedIcon = themeCoinMap.get(theme) || themeTicketMap.get(theme) || themeBoxMap.get(theme);
    } else {
      resolvedIcon = themeBoxMap.get(theme) || themeCoinMap.get(theme) || themeTicketMap.get(theme);
    }
  }

  // Rule 3: Tickets / Coupons (ตั๋ว / คูปอง) -> Target item
  if (!resolvedIcon && (name.startsWith('ตั๋ว') || name.startsWith('คูปอง'))) {
    const target = cleanItemName(name.replace(/^(?:ตั๋ว|คูปอง)\s*/, ''));
    if (exactMap.has(target)) {
      resolvedIcon = exactMap.get(target);
    } else if (cleanMap.has(target)) {
      resolvedIcon = cleanMap.get(target);
    }
  }

  // Rule 4: Package / Sets (แพ็กเกจ / แพ็ก / เซ็ต) -> Target theme box or member
  if (!resolvedIcon && (name.startsWith('แพ็กเกจ') || name.startsWith('แพ็ก') || name.startsWith('เซ็ต'))) {
    const target = cleanItemName(name.replace(/^(?:แพ็กเกจ|แพ็ก|เซ็ต)\s*/, ''));
    if (themeBoxMap.has(target)) {
      resolvedIcon = themeBoxMap.get(target);
    } else if (exactMap.has(target)) {
      resolvedIcon = exactMap.get(target);
    } else if (cleanMap.has(target)) {
      resolvedIcon = cleanMap.get(target);
    }
  }

  // Rule 5: Boxes (กล่อง...) -> Theme box or item
  if (!resolvedIcon && name.startsWith('กล่อง')) {
    const target = cleanItemName(name.replace(/^กล่อง\s*/, ''));
    if (themeBoxMap.has(target)) {
      resolvedIcon = themeBoxMap.get(target);
    } else if (exactMap.has(target)) {
      resolvedIcon = exactMap.get(target);
    }
  }

  // Rule 6: Coins / Tokens (เหรียญ...)
  if (!resolvedIcon && name.startsWith('เหรียญ')) {
    const target = cleanItemName(name.replace(/^เหรียญ\s*/, ''));
    if (themeCoinMap.has(target)) {
      resolvedIcon = themeCoinMap.get(target);
    }
  }

  if (resolvedIcon) {
    updates.push({ id: it.id, name: it.name, icon_file: resolvedIcon });
  }
}

console.log(`[+] Applying icon updates to SQLite for ${updates.length} items...`);
const updateStmt = db.prepare('UPDATE items SET icon_file = ? WHERE id = ?');
db.exec('BEGIN TRANSACTION');
for (const u of updates) {
  updateStmt.run(u.icon_file, u.id);
}
db.exec('COMMIT');
console.log('🎉 SQLite updated successfully!');

// Generate Supabase SQL update file
const sqlStatements = updates.map(u => 
  `UPDATE items SET icon_file = '${u.icon_file.replace(/'/g, "''")}' WHERE id = ${u.id};`
).join('\n');

const sqlPath = path.resolve('scripts', 'supabase_update_icons.sql');
fs.writeFileSync(sqlPath, sqlStatements, 'utf8');
console.log(`[+] Generated Supabase SQL script: ${sqlPath} (${updates.length} statements)`);

// Verify 127547-127551
console.log('\n--- Verify 127547-127551 in SQLite ---');
const checkNeedles = db.prepare('SELECT id, name, icon_file FROM items WHERE id BETWEEN 127547 AND 127551').all();
console.log(checkNeedles);
