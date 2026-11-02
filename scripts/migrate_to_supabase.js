#!/usr/bin/env node
/**
 * 🏃‍♂️ Tales Runner Item Wiki - Supabase Migration Script
 * Migrates all 107,869 items from data/items.sqlite to Supabase PostgreSQL.
 *
 * Usage:
 *   node scripts/migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_KEY_OR_ANON_KEY>
 * Or set environment variables:
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_KEY="your-anon-or-service-key"
 *   node scripts/migrate_to_supabase.js
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE_DIR = path.resolve(__dirname, '..');
const dbPath = path.join(BASE_DIR, 'data', 'items.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error(`[-] Error: Database not found at ${dbPath}`);
  process.exit(1);
}

const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log(`
=============================================================================
❌ Missing Supabase Credentials!

Usage:
  node scripts/migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>

Example:
  node scripts/migrate_to_supabase.js https://abcxyz.supabase.co eyJhbGciOi...
=============================================================================
`);
  process.exit(1);
}

// Ensure clean URL
const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/items`;

console.log(`[*] Opening SQLite Database: ${dbPath}`);
const db = new DatabaseSync(dbPath, { readOnly: true });

// Count items
const totalCountRow = db.prepare('SELECT COUNT(*) as total FROM items').get();
const totalItems = totalCountRow ? totalCountRow.total : 0;
console.log(`[+] Total items found in SQLite: ${totalItems.toLocaleString()}`);

const BATCH_SIZE = 500;
const selectStmt = db.prepare(`
  SELECT id, name, category_id, character_id, character_name,
         position_id, position_name, item_kind, level_req,
         game_money, cash, description, stats, obtain_methods, obtain_sources,
         icon_file, icon_url
  FROM items
  ORDER BY id ASC
  LIMIT ? OFFSET ?
`);

function cleanTags(str) {
  if (typeof str !== 'string' || !str) return '';
  return str.replace(/<[^>]+>/g, '').trim();
}

async function uploadBatch(batchItems, retries = 3) {
  const payload = JSON.stringify(batchItems);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: payload
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return true;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`\n[!] Batch failed (Attempt ${attempt}/${retries}): ${err.message}. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function runMigration() {
  console.log(`[*] Starting batch migration to ${endpoint}...`);
  const startTime = Date.now();
  let uploaded = 0;

  for (let offset = 0; offset < totalItems; offset += BATCH_SIZE) {
    const rows = selectStmt.all(BATCH_SIZE, offset);
    if (!rows || rows.length === 0) break;

    const formatted = rows.map(r => ({
      id: r.id,
      name: cleanTags(r.name),
      category_id: r.category_id || 0,
      character_id: r.character_id || 0,
      character_name: r.character_name || '',
      position_id: r.position_id || 0,
      position_name: r.position_name || '',
      item_kind: r.item_kind || 0,
      level_req: r.level_req || 0,
      game_money: r.game_money || 0,
      cash: r.cash || 0,
      description: cleanTags(r.description || ''),
      stats: r.stats ? r.stats.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_methods: r.obtain_methods ? r.obtain_methods.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_sources: r.obtain_sources ? JSON.parse(r.obtain_sources) : [],
      icon_file: r.icon_file || null,
      icon_url: r.icon_url || null
    }));

    await uploadBatch(formatted);
    uploaded += formatted.length;

    const pct = ((uploaded / totalItems) * 100).toFixed(1);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r[+] Uploaded: ${uploaded.toLocaleString()} / ${totalItems.toLocaleString()} items (${pct}%) - ${elapsedSec}s elapsed`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🎉 Migration Completed Successfully! Total: ${uploaded.toLocaleString()} items in ${totalTime}s.`);
}

runMigration().catch(err => {
  console.error('\n[-] Migration failed:', err);
  process.exit(1);
});
