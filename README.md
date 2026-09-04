# World Flipper Server — Batch 1 Foundation

This is the first clean architectural slice extracted from Starpoint behavior.

## Scope

Implemented in this batch:

- Fastify composition root separated from `main.ts`.
- Kakao/OpenAPI compatibility routes required for guest bootstrap.
- Infodesk captured compatibility responses.
- JSON / base64 MessagePack transport codec.
- SQLite account/session persistence with in-database migrations.
- Identity service separated from Fastify and SQLite.
- Injected clock and cryptographic token generator.
- Static CDN mounting at `/patch/Live/2.0.0`.
- `/v3/promotion/checkUrlPromotion` compatibility stub.
- Unit test for guest account creation/session issuance.

Not yet implemented:

- `/latest/api/index.php` World Flipper game API.
- Player creation/default player data.
- Viewer sessions.
- Tutorial, quests, gacha, inventory, characters, etc.
- Admin UI.
- Seasonal systems.

## Architecture

```text
World Flipper client
        |
        v
Fastify transport adapters
        |
        +-- protocol/worldflipper  (wire codec)
        +-- protocol/kakao         (captured Kakao contracts)
        |
        v
modules/identity
        |
        v
IdentityRepository
        |
        v
SQLite adapter
```

The binary CDN is a separate delivery plane and is intentionally not stored in Git.

## Setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The default runtime paths are:

```text
var/database/world-flipper.db
.cdn/
```

Both are ignored by Git. For a real deployment, point `CDN_DIR` at an external data directory instead.

## Useful commands

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

## Compatibility notes intentionally preserved for now

A few suspicious behaviors from the legacy emulator are deliberately kept during this first migration slice so refactoring does not become protocol redesign:

- `loginDevice` presents `firstLogin: true` on the wire even for an existing account.
- ZAT recovery builds the legacy alias from `appId + deviceId + os` because the ZAT request does not contain `serialNo`.
- Device access token and Infodesk signatures are captured compatibility values.
- Agreement response keeps the captured Kakao ID and timestamp conventions.

These should be changed only after contract captures/tests prove what the Global client actually requires.

## Next source files needed

For Batch 2 (World Flipper bootstrap/player creation), provide the legacy equivalents of:

```text
src/routes/api/index.ts
src/data/initializers/wdfpData.ts
src/data/utils.ts
```

If `src/routes/api/index.ts` imports helper functions from another route/lib file, include those imports too.
