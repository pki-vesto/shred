// Minimal Promise-based IndexedDB wrapper. No external deps.

export function openDB(name, version, upgrade) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) => upgrade(req.result, e.oldVersion, e.newVersion);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store);
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idb = {
  get:    (db, store, key)        => wrap(tx(db, store, 'readonly').get(key)),
  getAll: (db, store)              => wrap(tx(db, store, 'readonly').getAll()),
  put:    (db, store, value, key) => wrap(tx(db, store, 'readwrite').put(value, key)),
  del:    (db, store, key)        => wrap(tx(db, store, 'readwrite').delete(key)),
  clear:  (db, store)              => wrap(tx(db, store, 'readwrite').clear())
};
