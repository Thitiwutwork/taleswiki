// Tales Runner Item Database & Search API
// Node.js Backend Server using built-in node:http and node:sqlite

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const BASE_DIR = path.resolve(__dirname, '..');

// Locate SQLite DB (with auto-decompress of .gz if needed)
let dbPath = path.join(BASE_DIR, 'data', 'items.sqlite');
if (!fs.existsSync(dbPath)) {
  const gzPath = path.join(BASE_DIR, 'data', 'items.sqlite.gz');
  if (fs.existsSync(gzPath)) {
    console.log(`[*] Decompressing ${gzPath} -> ${dbPath}...`);
    const zlib = require('node:zlib');
    const decompressed = zlib.gunzipSync(fs.readFileSync(gzPath));
    fs.writeFileSync(dbPath, decompressed);
    console.log(`[+] Database unpacked successfully (${(decompressed.length / (1024 * 1024)).toFixed(1)} MB).`);
  }
}
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(BASE_DIR, 'items.sqlite');
}
if (!fs.existsSync(dbPath)) {
  dbPath = path.resolve(BASE_DIR, '..', 'Full_Talesrunner1.5', 'Talesrunner', 'extracted_items', 'items.sqlite');
}

console.log(`[*] Opening SQLite Database: ${dbPath}`);
const db = new DatabaseSync(dbPath, { readOnly: true });

// Locate Icons Directory
const iconsDir = path.join(BASE_DIR, 'public', 'icons');
let frontendDistDir = path.join(BASE_DIR, 'frontend', 'dist', 'frontend', 'browser');
if (!fs.existsSync(frontendDistDir)) {
  frontendDistDir = path.join(BASE_DIR, 'frontend', 'dist', 'tales-item', 'browser');
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Helper: JSON response
function sendJson(res, statusCode, data) {
  const jsonStr = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache',
  });
  res.end(jsonStr);
}

// Helper: Strip formatting tags like <color=...>, </color>, <smallbold>, etc.
function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (_) {
    return fallback;
  }
}

function cleanTags(str) {
  if (typeof str !== 'string' || !str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/<+[^>]*>/g, '')
    .replace(/<[^>]*$/g, '')
    .trim();
}

// 1. GET /api/filters
function handleGetFilters(req, res) {
  try {
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
      ORDER BY id DESC
    `).all();

    const sources = [
      { id: 'all', name: 'ทั้งหมด (All Sources)' },
      { id: 'shop_tr', name: 'ร้านค้าในเกม (TR)' },
      { id: 'shop_cash', name: 'ร้านค้าในเกม (Cash)' },
      { id: 'alchemist', name: 'ห้องเล่นแร่แปรธาตุ (Alchemist)' },
      { id: 'exchange', name: 'ระบบแลกเปลี่ยน (Exchange)' },
      { id: 'cube', name: 'เปิดกล่องของขวัญ / คิวบ์ (Cube Reward)' },
      { id: 'level', name: 'รางวัลเลเวลอัป (Level Reward)' },
      { id: 'event', name: 'กิจกรรม / พิเศษ (Event / Special)' },
    ];

    sendJson(res, 200, { positions, characters, sources });
  } catch (err) {
    console.error('Error in /api/filters:', err);
    sendJson(res, 500, { error: err.message });
  }
}

// 2. GET /api/items (Search & Filter)
function handleGetItems(req, res, parsedUrl) {
  try {
    const q = (parsedUrl.query.q || '').trim();
    const position = parsedUrl.query.position;
    const character = parsedUrl.query.character;
    const source = parsedUrl.query.source;
    const hasStats = parsedUrl.query.has_stats === 'true';
    const page = Math.max(1, parseInt(parsedUrl.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(parsedUrl.query.limit, 10) || 36));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const params = [];

    // Search query with smart relevance & name-matching priority
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        // Build base filters for pre-check
        const baseWhere = [];
        const baseParams = [];
        if (position !== undefined && position !== '' && position !== 'all') {
          if (typeof position === 'string' && position.includes(',')) {
            const pids = position.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
            if (pids.length > 0) {
              baseWhere.push(`position_id IN (${pids.map(() => '?').join(',')})`);
              baseParams.push(...pids);
            }
          } else {
            baseWhere.push('position_id = ?');
            baseParams.push(parseInt(position, 10));
          }
        }
        if (character !== undefined && character !== '' && character !== 'all') {
          const charId = parseInt(character, 10);
          const strictChar = parsedUrl.query.strict_char === 'true';
          if (strictChar || charId === 0) {
            baseWhere.push('character_id = ?');
            baseParams.push(charId);
          } else {
            baseWhere.push('(character_id = ? OR character_id = 0)');
            baseParams.push(charId);
          }
        }

        // Check if matching item name exists
        const nameWhere = [...baseWhere, ...words.map(() => 'name LIKE ?')];
        const nameParams = [...baseParams, ...words.map(w => `%${w}%`)];
        const checkSql = `SELECT 1 FROM items ${nameWhere.length > 0 ? 'WHERE ' + nameWhere.join(' AND ') : ''} LIMIT 1`;
        let hasNameMatch = false;
        try {
          hasNameMatch = !!db.prepare(checkSql).get(...nameParams);
        } catch (_) {}

        if (hasNameMatch) {
          // Name matches exist: restrict to item name so unrelated items don't leak into search results
          for (const w of words) {
            whereClauses.push('name LIKE ?');
            params.push(`%${w}%`);
          }
        } else {
          // Fallback: search in description, stats, or obtain_methods
          for (const w of words) {
            whereClauses.push('(name LIKE ? OR description LIKE ? OR stats LIKE ? OR obtain_methods LIKE ?)');
            const wild = `%${w}%`;
            params.push(wild, wild, wild, wild);
          }
        }
      }
    }

    // Position filter (supports comma-separated list like 11,13)
    if (position !== undefined && position !== '' && position !== 'all') {
      if (typeof position === 'string' && position.includes(',')) {
        const pids = position.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
        if (pids.length > 0) {
          whereClauses.push(`position_id IN (${pids.map(() => '?').join(',')})`);
          params.push(...pids);
        }
      } else {
        whereClauses.push('position_id = ?');
        params.push(parseInt(position, 10));
      }
    }

    // Character filter: includes character-specific items AND universal items (character_id = 0)
    if (character !== undefined && character !== '' && character !== 'all') {
      const charId = parseInt(character, 10);
      const strictChar = parsedUrl.query.strict_char === 'true';
      if (strictChar || charId === 0) {
        whereClauses.push('character_id = ?');
        params.push(charId);
      } else {
        whereClauses.push('(character_id = ? OR character_id = 0)');
        params.push(charId);
      }
    }

    // Source filter
    if (source && source !== 'all') {
      if (source === 'shop_tr') {
        whereClauses.push('(game_money > 0 OR obtain_methods LIKE ?)');
        params.push('%TR%');
      } else if (source === 'shop_cash') {
        whereClauses.push('(cash > 0 OR obtain_methods LIKE ?)');
        params.push('%Cash%');
      } else if (source === 'alchemist') {
        whereClauses.push('obtain_methods LIKE ?');
        params.push('%แปรธาตุ%');
      } else if (source === 'exchange') {
        whereClauses.push('obtain_methods LIKE ?');
        params.push('%แลกเปลี่ยน%');
      } else if (source === 'cube') {
        whereClauses.push('obtain_methods LIKE ?');
        params.push('%คิวบ์%');
      } else if (source === 'level') {
        whereClauses.push('obtain_methods LIKE ?');
        params.push('%เลเวล%');
      } else if (source === 'event') {
        whereClauses.push('obtain_methods LIKE ?');
        params.push('%กิจกรรม%');
      }
    }

    // Has Stats filter
    if (hasStats) {
      whereClauses.push("stats != '' AND stats IS NOT NULL");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total matches
    const countSql = `SELECT COUNT(*) as total FROM items ${whereSql}`;
    const totalRow = db.prepare(countSql).get(...params);
    const total = totalRow ? totalRow.total : 0;

    // Fetch paginated results with relevance ranking
    let orderSql = `
      CASE WHEN icon_file IS NOT NULL AND icon_file != '' THEN 0 ELSE 1 END ASC,
      id DESC
    `;
    const orderParams = [];

    if (q) {
      orderSql = `
        CASE
          WHEN name = ? THEN 1
          WHEN name LIKE ? THEN 2
          WHEN name LIKE ? THEN 3
          ELSE 4
        END ASC,
        CASE WHEN icon_file IS NOT NULL AND icon_file != '' THEN 0 ELSE 1 END ASC,
        id ASC
      `;
      orderParams.push(q, `${q}%`, `%${q}%`);
    }

    const selectSql = `
      SELECT id, name, category_id, character_id, character_name,
             position_id, position_name, item_kind, level_req,
             game_money, cash, description, stats, obtain_methods, obtain_sources,
             icon_file, icon_url
      FROM items
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(selectSql).all(...params, ...orderParams, limit, offset);

    // Transform rows
    const items = rows.map(r => ({
      ...r,
      name: cleanTags(r.name),
      description: cleanTags(r.description),
      stats: r.stats ? r.stats.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_methods: r.obtain_methods ? r.obtain_methods.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_sources: safeJsonParse(r.obtain_sources),
    }));

    sendJson(res, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    console.error('Error in /api/items:', err);
    sendJson(res, 500, { error: err.message });
  }
}

// 3. GET /api/items/:id
function handleGetItemById(res, itemId) {
  try {
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    if (!row) {
      return sendJson(res, 404, { error: 'Item not found' });
    }
    const item = {
      ...row,
      name: cleanTags(row.name),
      description: cleanTags(row.description),
      stats: row.stats ? row.stats.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_methods: row.obtain_methods ? row.obtain_methods.split(' | ').map(cleanTags).filter(Boolean) : [],
      obtain_sources: safeJsonParse(row.obtain_sources),
    };
    sendJson(res, 200, item);
  } catch (err) {
    console.error('Error in /api/items/:id:', err);
    sendJson(res, 500, { error: err.message });
  }
}

// 4. Static Icon File Serving
function handleServeIcon(res, filename) {
  const safeFilename = path.basename(filename);
  const filePath = path.join(iconsDir, safeFilename);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 for icon
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Icon not found');
    }

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// Locate Characters File
const charsPath = path.join(BASE_DIR, 'data', 'characters.json');
let charactersData = [];
if (fs.existsSync(charsPath)) {
  try {
    charactersData = JSON.parse(fs.readFileSync(charsPath, 'utf8'));
  } catch (e) {
    console.error('Failed to load characters.json', e);
  }
}

function handleGetCharacters(res) {
  sendJson(res, 200, charactersData);
}

function handleServeImg(res, filename) {
  const safeRelPath = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(BASE_DIR, 'public', 'img', safeRelPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'image/png';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=86400',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// 5. Static Frontend Serving
function handleServeStatic(res, reqPath) {
  let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = 'index.html';
  let fullPath = path.join(frontendDistDir, safePath);

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA router
      fullPath = path.join(frontendDistDir, 'index.html');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(fullPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Tales Runner Item Search</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>🎮 Tales Runner Item Search API Server</h1>
              <p>Backend is running successfully on port ${PORT}.</p>
              <p><a href="/api/items?limit=10">Test /api/items</a> | <a href="/api/filters">Test /api/filters</a></p>
            </body>
          </html>
        `);
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    });
  });
}

// Create HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    return res.end('Method Not Allowed');
  }

  // Routing
  if (pathname === '/api/characters') {
    return handleGetCharacters(res);
  }

  if (pathname === '/api/filters') {
    return handleGetFilters(req, res);
  }

  if (pathname === '/api/items') {
    return handleGetItems(req, res, parsedUrl);
  }

  const itemMatch = pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemMatch) {
    return handleGetItemById(res, parseInt(itemMatch[1], 10));
  }

  const iconMatch = pathname.match(/^\/(?:api\/)?icons\/(.+)$/);
  if (iconMatch) {
    return handleServeIcon(res, iconMatch[1]);
  }

  const imgMatch = pathname.match(/^\/img\/(.+)$/);
  if (imgMatch) {
    return handleServeImg(res, imgMatch[1]);
  }

  // Default: Frontend static files
  return handleServeStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(`[+] Tales Runner Item Search Server running at http://localhost:${PORT}`);
  console.log(`    - API Endpoints:`);
  console.log(`      GET http://localhost:${PORT}/api/items?q=ปีก`);
  console.log(`      GET http://localhost:${PORT}/api/filters`);
  console.log(`      GET http://localhost:${PORT}/api/icons/<filename>`);
});
