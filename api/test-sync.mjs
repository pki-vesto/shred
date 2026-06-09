// Sync-contract integratietest (#187, en dekt het nieuwe measurements-type).
// Mount de ECHTE sync-router op een wegwerp-express + wegwerp-shred.db (temp
// DATA_DIR, CORE_DB bewust niet gezet → dual-write is no-op). Raakt geen echte
// data.
//
//   node api/test-sync.mjs   (host of container; vereist express + better-sqlite3)

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shred-sync-test-'));
process.env.DATA_DIR = tmp;
delete process.env.CORE_DB;            // dual-write uit voor een gefocuste test

const express = (await import('express')).default;
const { sync } = await import('./routes/sync.js');

const app = express();
app.use(express.json());
app.use('/api/sync', sync);
const server = app.listen(0);
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const post = (records) => fetch(base + '/api/sync', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ records })
}).then(r => r.json());
const getSince = (since) => fetch(`${base}/api/sync?since=${since}`).then(r => r.json());

// 1) POST nieuw measurements-record wordt geaccepteerd
let r = await post([{ type: 'measurements', key: '5', value: { waist: 90, hip: 98 }, updatedAt: 2000 }]);
assert.equal(r.accepted, 1, 'measurements geaccepteerd');
assert.equal(r.rejected, 0);

// 2) GET sinds 0 geeft het record met juiste vorm terug (round-trip JSON)
let g = await getSince(0);
const rec = g.records.find(x => x.type === 'measurements' && x.key === '5');
assert.ok(rec, 'measurements komt terug in GET');
assert.equal(rec.value.waist, 90);
assert.equal(rec.value.hip, 98);
assert.equal(rec.updatedAt, 2000);

// 3) LWW: oudere update wordt afgewezen, nieuwere geaccepteerd
assert.equal((await post([{ type: 'measurements', key: '5', value: { waist: 1 }, updatedAt: 1000 }])).rejected, 1, 'oudere afgewezen');
assert.equal((await post([{ type: 'measurements', key: '5', value: { waist: 87 }, updatedAt: 3000 }])).accepted, 1, 'nieuwere geaccepteerd');
g = await getSince(0);
assert.equal(g.records.find(x => x.type === 'measurements' && x.key === '5').value.waist, 87, 'laatste schrijver wint');

// 4) since-filter: niets nieuws na de laatste serverTime
assert.equal((await getSince(g.serverTime)).records.filter(x => x.type === 'measurements').length, 0, 'since-filter werkt');

// 5) onbekend type wordt afgewezen, breekt niets
assert.equal((await post([{ type: 'verzonnen', key: 'x', value: 1, updatedAt: 9 }])).rejected, 1, 'onbekend type afgewezen');

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ sync-contract test: measurements round-trip + LWW + since-filter groen');
