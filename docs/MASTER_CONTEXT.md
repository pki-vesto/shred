# Master Context

Entry point voor autonome agents. Lees in deze volgorde:

1. Dit bestand.
2. [02_AUTONOMOUS_BUILD_DIRECTIVE.md](02_AUTONOMOUS_BUILD_DIRECTIVE.md) — hoogste prioriteit: definitie van gereed, verboden gedrag, kwaliteitsregels.
3. [03_PROJECT_HANDBOOK.md](03_PROJECT_HANDBOOK.md) — product, architectuur, modules.
4. [CURRENT_STATE.md](CURRENT_STATE.md) — wat er nú live is.
5. [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md) + [ROADMAP.md](ROADMAP.md) — wat er nog moet.
6. [ARCHITECTURE.md](ARCHITECTURE.md) → [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md) en het relevante engine-document.

## Wat Shred is
Single-user, self-hosted, offline-first fitness-PWA voor Peter (training, voeding, body composition, herstel, fitness intelligence). Vanilla HTML/CSS/JS + IndexedDB; Node/Express/SQLite backend; Docker op Ubuntu; Tailscale als netwerkgrens; Whisper (STT) en Claude Haiku (parsing) self-hosted/extern-tekst-only; Health Core als centrale observations-datastore.

## Invarianten (niet breken)
- Geen frontend framework, geen nieuwe DB/ORM/cloud-service zonder expliciete opdracht.
- Single-user; geen auth/login/multi-user/social/billing.
- Tailscale is de security-grens, geen publieke exposure.
- Breek geen exercise IDs, sync type/key-vormen, product IDs, photo metadata, SW asset-paden, Health Core metric keys of bestaande IndexedDB-state.
- Migraties additief-first en rollbackbaar; SW `CACHE_VERSION` bumpen bij shell-wijzigingen.
- Health Core dual-write is best-effort en mag sync nooit blokkeren.
- Docs horen in dezelfde wijziging bij als gedrag/schema/architectuur verandert.

## Werkwijze
Kleinste coherente wijziging → verifieer (tests/harness, zie [19_CLAUDE_CODE_GUIDELINES.md](19_CLAUDE_CODE_GUIDELINES.md)) → docs + CURRENT_STATE + PRODUCT_BACKLOG bij → afronden. Datamodel-wijzigingen volgen het sync-type-contract (client read/write, server table/upsert/select, migratie, Health Core-impact).
