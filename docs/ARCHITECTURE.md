# Architecture

De volledige architectuur staat in [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md) (frontend, backend, sync, service worker, voice, AI, auth-grens). Dit is de korte kaart.

```
iPhone/Mac PWA ──IndexedDB (lokale werkset)
      │  service worker (shell cache + photo cache + API pass-through)
      ▼  https://shred.tail9d0c71.ts.net  (Tailscale Serve termineert TLS)
Caddy :80 ──/api/* → shred-api (Node/Express/SQLite, intern :8089)
          └─ /     → shred (nginx static, ook :8088 fallback)
shred-api ──best-effort──▶ Health Core core.db (dual-write Fase A)
          └─ Whisper (STT, intern) · Claude Haiku (parsing, tekst-only)
```

- **Frontend:** vanilla ES modules, `state` als single source of truth, mutaties via `mutate(type,key)`; `state.ts[type][key]` voedt outbound sync.
- **Sync:** Last-Write-Wins per recordtype; server wint ties. Types: `meta, day_log, sets, exercise_notes, weights, foods, product, template, slot_choices, measurements` + `photo` (metadata; blob apart).
- **Backend:** Express-routers (`health, sync, photos, voice, products`), `better-sqlite3` WAL, recordtype-georiënteerde tabellen.
- **Auth-grens:** geen app-auth; Tailscale (WireGuard + ACL). Docker-poortgrens geborgd door `api/check-auth-boundary.sh`.
- **Health Core:** additieve, best-effort observations dual-write; status/formuleversies via `GET /api/health/core`.

Nieuw sync-type toevoegen = client read/write (`js/sync.js`) + `state` + server `TYPES`-handler + tabel + index + migratie + Health Core-impact + test. Voorbeeld: `measurements` (v1.5.0).
