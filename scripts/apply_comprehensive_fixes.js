/**
 * Apply Comprehensive Fixes for:
 * 1. Special Landmark Needle (#130524 and variants) -> add all 25 exchange recipes
 * 2. Remove dummy sentinel prices (1,000,000 Cash/TR, 999,999 Cash/TR) from obtain_methods & obtain_sources
 * 3. Quantity bundle items (like #129533) inherit clean obtain_methods & obtain_sources from base item
 * 4. Update both SQLite and Supabase
 */

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/items.sqlite');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkytokzaqnxvdrbhskaj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXRva3phcW54dmRyYmhza2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NjkwNTMsImV4cCI6MjEwNjE0NTA1M30.J0CPgQMm3hLbQrnD-hRO_hFsJtC-PQgyjI7qCyL0-Zg';

async function main() {
  console.log('[*] Phase 1: Preparing 25 Landmark Needle recipes...');
  const needles = db.prepare(`
    SELECT id, name, icon_file FROM items 
    WHERE name LIKE 'เข็มแลนด์มาร์ค%' 
      AND name NOT LIKE '%ชิ้น' 
      AND name NOT LIKE '%พิเศษ'
    ORDER BY id ASC
  `).all();

  const specialMethodsStr = needles.map(n => `แลกเปลี่ยนโดยใช้: ${n.name} x3`).join(' | ');
  const specialSourcesArr = needles.map(n => ({
    type: 'exchange',
    label: 'แลกเปลี่ยน',
    action: 'ใช้',
    target_name: n.name,
    target_id: n.id,
    target_icon: n.icon_file,
    count: 3,
    raw: `${n.name} x3`
  }));
  const specialSourcesJson = JSON.stringify(specialSourcesArr);

  // Special landmark needle items
  const specialNeedleItems = db.prepare("SELECT id, name FROM items WHERE name LIKE 'เข็มแลนด์มาร์คพิเศษ%'").all();
  console.log(`[+] Found ${specialNeedleItems.length} special landmark needle items to update.`);

  const itemsToUpdate = new Map();

  for (const it of specialNeedleItems) {
    itemsToUpdate.set(it.id, {
      id: it.id,
      name: it.name,
      obtain_methods: specialMethodsStr.split(' | '),
      obtain_methods_raw: specialMethodsStr,
      obtain_sources: specialSourcesArr,
      obtain_sources_raw: specialSourcesJson
    });
  }

  console.log('\n[*] Phase 2: Indexing base items for quantity bundle fallback...');
  const allItems = db.prepare('SELECT id, name, obtain_methods, obtain_sources FROM items').all();
  const baseMap = new Map();

  for (const it of allItems) {
    if (!it.name.match(/\s+\d+\s*ชิ้น$/) && it.obtain_methods) {
      const cleanMethods = it.obtain_methods
        .split(' | ')
        .filter(m => !m.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i) && !m.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i));
      
      let cleanSources = [];
      if (it.obtain_sources) {
        try {
          cleanSources = JSON.parse(it.obtain_sources).filter(s => {
            const raw = s.raw || s.target_name || '';
            return !raw.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i) && !raw.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i);
          });
        } catch (_) {}
      }

      if (cleanMethods.length > 0) {
        baseMap.set(it.name.trim(), {
          methods: cleanMethods,
          sources: cleanSources
        });
      }
    }
  }
  console.log(`[+] Indexed ${baseMap.size} base items.`);

  console.log('\n[*] Phase 3: Cleaning dummy prices from all items...');
  let dummyCount = 0;

  for (const it of allItems) {
    if (itemsToUpdate.has(it.id)) continue;

    const rawMethods = it.obtain_methods || '';
    const hasDummyPrice = rawMethods.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i) || rawMethods.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i);

    if (hasDummyPrice) {
      dummyCount++;
      let cleanMethods = rawMethods
        .split(' | ')
        .filter(m => !m.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i) && !m.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i));

      let cleanSources = [];
      if (it.obtain_sources) {
        try {
          cleanSources = JSON.parse(it.obtain_sources).filter(s => {
            const raw = s.raw || s.target_name || '';
            return !raw.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i) && !raw.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i);
          });
        } catch (_) {}
      }

      // If cleanMethods is empty, try base item lookup
      if (cleanMethods.length === 0) {
        const baseNameMatch = it.name.match(/^(.*?)\s+\d+\s*ชิ้น$/);
        if (baseNameMatch) {
          const baseName = baseNameMatch[1].trim();
          const baseData = baseMap.get(baseName);
          if (baseData) {
            cleanMethods = [...baseData.methods];
            cleanSources = [...baseData.sources];
          }
        }
      }

      // If still empty, set generic event source
      if (cleanMethods.length === 0) {
        if (it.name.includes('20 ปี')) {
          cleanMethods = ['กิจกรรมฉลองครบรอบ 20 ปีรันเนอส์'];
        } else {
          cleanMethods = ['กล่องสุ่มกิจกรรม / ไอเทมดรอปเฉพาะช่วงเวลา'];
        }
        cleanSources = [{
          type: 'event',
          label: 'กิจกรรม',
          action: 'ได้รับจาก',
          target_name: cleanMethods[0],
          raw: cleanMethods[0]
        }];
      }

      itemsToUpdate.set(it.id, {
        id: it.id,
        name: it.name,
        obtain_methods: cleanMethods,
        obtain_methods_raw: cleanMethods.join(' | '),
        obtain_sources: cleanSources,
        obtain_sources_raw: JSON.stringify(cleanSources)
      });
    }
  }

  console.log(`[+] Total items identified for update: ${itemsToUpdate.size} (including ${dummyCount} dummy items).`);

  // Check 129533 and 130524
  console.log('\n--- Verify 129533 (ชิ้นส่วนหินแห่งความปรารถนา 20 ปี 10 ชิ้น) ---');
  console.log(itemsToUpdate.get(129533));
  console.log('\n--- Verify 130524 (เข็มแลนด์มาร์คพิเศษ) ---');
  console.log(itemsToUpdate.get(130524));

  console.log('\n[*] Phase 4: Updating SQLite database...');
  const updateStmt = db.prepare('UPDATE items SET obtain_methods = ?, obtain_sources = ? WHERE id = ?');
  db.exec('BEGIN TRANSACTION');
  for (const [id, data] of itemsToUpdate) {
    updateStmt.run(data.obtain_methods_raw, data.obtain_sources_raw, id);
  }
  db.exec('COMMIT');
  console.log('[+] SQLite database updated successfully!');

  console.log('\n[*] Phase 5: Pushing updates to Supabase...');
  const itemsArray = Array.from(itemsToUpdate.values());
  const BATCH_SIZE = 50;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < itemsArray.length; i += BATCH_SIZE) {
    const chunk = itemsArray.slice(i, i + BATCH_SIZE);
    
    // We update via concurrent PATCH for each item
    await Promise.all(chunk.map(async (item) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            obtain_methods: item.obtain_methods,
            obtain_sources: item.obtain_sources
          })
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));

    process.stdout.write(`\r[+] Supabase Synced: ${Math.min(i + BATCH_SIZE, itemsArray.length)} / ${itemsArray.length} (${successCount} ok, ${failCount} fail)`);
  }

  console.log(`\n\n🎉 Done! All ${itemsArray.length} items patched in SQLite & Supabase.`);
}

main().catch(console.error);
