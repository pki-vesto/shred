import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR || '/data';
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'photos'), { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'shred.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS day_log (
    day        INTEGER PRIMARY KEY,
    completed  TEXT,
    notes      TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    ex_id      TEXT NOT NULL,
    day        INTEGER NOT NULL,
    sets       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (ex_id, day)
  );

  CREATE TABLE IF NOT EXISTS exercise_notes (
    ex_id      TEXT NOT NULL,
    day        INTEGER NOT NULL,
    note       TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (ex_id, day)
  );

  CREATE TABLE IF NOT EXISTS weights (
    day        INTEGER PRIMARY KEY,
    kg         REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS foods (
    day          INTEGER PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id           TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meal_templates (
    id           TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS slot_choices (
    day          INTEGER PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS measurements (
    day          INTEGER PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY,
    week       INTEGER NOT NULL,
    filename   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_meta_updated     ON meta(updated_at);
  CREATE INDEX IF NOT EXISTS idx_day_log_updated  ON day_log(updated_at);
  CREATE INDEX IF NOT EXISTS idx_sets_updated     ON sets(updated_at);
  CREATE INDEX IF NOT EXISTS idx_exercise_notes_updated ON exercise_notes(updated_at);
  CREATE INDEX IF NOT EXISTS idx_weights_updated  ON weights(updated_at);
  CREATE INDEX IF NOT EXISTS idx_foods_updated     ON foods(updated_at);
  CREATE INDEX IF NOT EXISTS idx_products_updated  ON products(updated_at);
  CREATE INDEX IF NOT EXISTS idx_templates_updated ON meal_templates(updated_at);
  CREATE INDEX IF NOT EXISTS idx_slot_choices_updated ON slot_choices(updated_at);
  CREATE INDEX IF NOT EXISTS idx_measurements_updated ON measurements(updated_at);
  CREATE INDEX IF NOT EXISTS idx_photos_updated    ON photos(updated_at);
`);

// Migratie: oude foods-schema (meals_added/extras kolommen) -> generieke
// value-kolom met opaque JSON. Bestaande rijen worden behouden als
// { mealsAdded, extras } zodat de client ze daarna client-side kan migreren.
const foodCols = db.prepare("PRAGMA table_info(foods)").all().map(c => c.name);
if (foodCols.includes('meals_added')) {
  const migrate = db.transaction(() => {
    db.exec(`CREATE TABLE foods_new (
      day INTEGER PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
    )`);
    const rows = db.prepare('SELECT day, meals_added, extras, updated_at FROM foods').all();
    const ins = db.prepare('INSERT INTO foods_new (day, value, updated_at) VALUES (?, ?, ?)');
    for (const r of rows) {
      const value = JSON.stringify({
        mealsAdded: safeParse(r.meals_added, []),
        extras: safeParse(r.extras, [])
      });
      ins.run(r.day, value, r.updated_at);
    }
    db.exec('DROP TABLE foods');
    db.exec('ALTER TABLE foods_new RENAME TO foods');
    db.exec('CREATE INDEX IF NOT EXISTS idx_foods_updated ON foods(updated_at)');
  });
  migrate();
  console.log('[shred] migrated foods table to generic value column');
}

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

export const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
