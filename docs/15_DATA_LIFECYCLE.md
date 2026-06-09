# Data Lifecycle

## Bronnen Van Waarheid

Shred heeft meerdere lagen:

- IndexedDB: lokale werkset en offline bron voor de client.
- `shred.db`: server-sync anchor en backup target.
- filesystem `data/photos`: server photo blobs.
- Health Core `core.db`: centrale observations datastore.

## IndexedDB

Database:

- `shred-db`
- version `1`

Stores:

- `kv` voor app state en sync meta;
- `photos` voor lokale blobs;
- `queue` voor offline voice opnames.

`state` is de in-memory bron voor UI. `saveState()` persisted snapshots naar `kv`.

## SQLite

Server tables:

- `meta`
- `day_log`
- `sets`
- `exercise_notes`
- `weights`
- `foods`
- `products`
- `meal_templates`
- `slot_choices`
- `photos`

SQLite draait WAL met `synchronous=NORMAL` en foreign keys aan.

## Sync

Record contract:

```json
{
  "type": "sets",
  "key": "bench:5",
  "value": [],
  "updatedAt": 1710000000000
}
```

LWW:

- server accepteert alleen `updatedAt > current`;
- client accepteert incoming alleen als `rec.updatedAt > localTs`;
- server wint ties.

## Offline Queue

Voice queue bevat audio en context wanneer `/api/meals/voice` niet bereikbaar is. Verwerking gebeurt vóór gewone state sync.

Regels:

- queue items mogen niet dubbel loggen;
- voorstellen moeten bevestigd worden;
- audio moet na succesvolle verwerking worden verwijderd of als verwerkt gemarkeerd.

## Backups

Complete backup target:

- `~/shred/data/`
- `.env`

Aanbevolen procedure staat in `README.md`: stop API, tar data + env, start API.

Health Core heeft eigen backup/rollback in `/home/peter/health-core`.

## Exports

Toekomstige exports:

- JSON export van volledige Shred state;
- CSV per domein;
- Health Core observation export;
- end-of-program report.

Exports mogen geen data muteren.

## Migraties

Migratieprincipes:

- additive waar mogelijk;
- oude data bewaren;
- localStorage migratie blijft rollback-safe;
- producthistorie niet breken;
- sync tables backward compatible;
- Health Core formula version documenteren.

## Conflict Afhandeling

Huidig: LWW.

Risico:

- twee devices wijzigen hetzelfde record offline;
- laatst gesyncte timestamp wint.

Mitigatie toekomstig:

- recordgranulariteit fijn genoeg houden;
- destructive edits bevestigen;
- conflict log voor risicovolle domeinen zoals notes/recepten;
- serverTime gebruiken voor toekomstige monotonic timestamps.

