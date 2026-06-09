import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { db, PHOTOS_DIR } from '../db.js';

export const photos = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB hard cap
});

const insertPhoto = db.prepare(`
  INSERT INTO photos (id, week, filename, mime, size, deleted, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  ON CONFLICT(id) DO UPDATE SET week=excluded.week, filename=excluded.filename,
    mime=excluded.mime, size=excluded.size, deleted=0, updated_at=excluded.updated_at
`);
const softDelete = db.prepare(`UPDATE photos SET deleted=1, updated_at=? WHERE id=?`);
const getPhoto   = db.prepare(`SELECT * FROM photos WHERE id=?`);

const EXT_FOR_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic'
};

// POST /api/photos  multipart (file=blob, week=N, id=epoch_ms, ts=iso)
photos.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  // Valideer vóór we naar disk schrijven: een NaN week/id/createdAt zou anders
  // op de SQLite-insert klappen (NOT NULL INTEGER) en een wees-bestand
  // achterlaten.
  const week = parseInt(req.body.week, 10);
  if (!Number.isInteger(week)) return res.status(400).json({ error: 'invalid week' });
  const id = parseInt(req.body.id, 10) || Date.now();
  const parsedTs = Date.parse(req.body.ts);
  const createdAt = Number.isFinite(parsedTs) ? parsedTs : Date.now();
  const mime = req.file.mimetype || 'image/jpeg';
  const ext = EXT_FOR_MIME[mime] || 'bin';
  const filename = `${id}.${ext}`;
  const fullPath = path.join(PHOTOS_DIR, filename);
  fs.writeFileSync(fullPath, req.file.buffer);
  const now = Date.now();
  insertPhoto.run(id, week, filename, mime, req.file.size, createdAt, now);
  res.json({ id, week, filename, mime, size: req.file.size, createdAt, updatedAt: now });
});

// GET /api/photos/:id
photos.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).end();
  const rec = getPhoto.get(id);
  if (!rec || rec.deleted) return res.status(404).end();
  const fullPath = path.join(PHOTOS_DIR, rec.filename);
  if (!fs.existsSync(fullPath)) return res.status(404).end();
  res.set('Content-Type', rec.mime);
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  fs.createReadStream(fullPath).pipe(res);
});

// DELETE /api/photos/:id
photos.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).end();
  const rec = getPhoto.get(id);
  if (!rec) return res.status(404).end();
  const now = Date.now();
  softDelete.run(now, id);
  // Unlink the blob; the record stays so the delete can sync to the other device.
  const fullPath = path.join(PHOTOS_DIR, rec.filename);
  fs.unlink(fullPath, () => {});
  res.json({ id, deleted: true, updatedAt: now });
});
