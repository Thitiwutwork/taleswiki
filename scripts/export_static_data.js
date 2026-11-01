const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'items.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

// 1. Export filters.json
const positions = db.prepare(`
  SELECT position_id as id, position_name as name, COUNT(*) as count 
  FROM items 
  GROUP BY position_id, position_name 
  ORDER BY count DESC
`).all();

const characters = db.prepare(`
  SELECT character_id as id, character_name as name, COUNT(*) as count 
  FROM items 
  GROUP BY character_id, character_name 
  ORDER BY id ASC
`).all();

const sources = [
  { id: 'all', name: 'ทั้งหมด (All Sources)' },
  { id: 'shop_tr', name: 'ร้านค้าในเกม (TR)' },
  { id: 'shop_cash', name: 'ร้านค้าในเกม (Cash)' },
  { id: 'alchemist', name: 'ห้องเล่นแร่แปรธาตุ (Alchemist)' },
  { id: 'exchange', name: 'ระบบแลกเปลี่ยน (Exchange)' },
  { id: 'cube', name: 'เปิดกล่องของขวัญ / คิวบ์ (Cube Reward)' },
  { id: 'level', name: 'รางวัลเลเวลอัป (Level Reward)' },
  { id: 'event', name: 'กิจกรรม / พิเศษ (Event / Special)' }
];

const filterData = { positions, characters, sources };
fs.writeFileSync(path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'filters.json'), JSON.stringify(filterData, null, 2));

// 2. Export sample items for fitting room and search fallback
const items = db.prepare(`
  SELECT id, name, description, position_id, position_name, character_id, character_name, icon_file, stats, obtain_methods
  FROM items 
  WHERE icon_file IS NOT NULL AND icon_file != '' AND name IS NOT NULL AND name != ''
  ORDER BY id DESC 
  LIMIT 2500
`).all().map(r => {
  let parsedStats = [];
  if (r.stats) {
    try {
      parsedStats = typeof r.stats === 'string' && r.stats.startsWith('[') ? JSON.parse(r.stats) : r.stats.split('\n').filter(Boolean);
    } catch {
      parsedStats = [r.stats];
    }
  }
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    position_id: r.position_id,
    position_name: r.position_name,
    character_id: r.character_id,
    character_name: r.character_name,
    icon_file: r.icon_file,
    stats: parsedStats,
    obtain_methods: r.obtain_methods
  };
});

const outPath = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'items_sample.json');
fs.writeFileSync(outPath, JSON.stringify(items));
console.log('Successfully exported filters.json and items_sample.json (count:', items.length, ', size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB)');
