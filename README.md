# World Flipper Server — Batch 2A Player Bootstrap

Batch 2A extends the clean Batch 1 foundation through the first World Flipper game-side bootstrap flow.

## Implemented flow

```text
Kakao/OpenAPI guest identity
        |
        | ZAT
        v
/latest/api/index.php/tool/signup
        |
        +-- ensure one World Flipper Player for the Account
        +-- create/reuse VIEWER session
        |
        v
/latest/api/index.php/load
        |
        +-- validate ZAT + VIEWER belong to the same Account
        +-- daily login maintenance
        +-- pooled EXP maintenance
        +-- load PlayerSnapshot from SQLite
        +-- present client-compatible player payload
```

`Account` and `Player` are intentionally separate concepts:

- `modules/identity` owns Kakao-compatible account identity and ZAT/ZRT/VIEWER sessions.
- `modules/player` owns World Flipper mutable game state.
- `modules/bootstrap` orchestrates the two for `/tool/signup` and `/load`.

## New in Batch 2A

- `002-player-bootstrap` SQLite migration.
- `modules/player` with models, factory, repository, service, and presenter.
- Default World Flipper player seed matching legacy Starpoint bootstrap behavior.
- VIEWER session issuance/reuse in `IdentityService`.
- `/latest/api/index.php/tool/get_header_response`.
- `/latest/api/index.php/tool/signup`.
- `/latest/api/index.php/load`.
- CDN asset version provider decoupled from the future asset route module.
- Integration test covering guest login -> signup -> load.

## Still intentionally not implemented

- `/asset/version_info` and `/asset/get_path` (Batch 2B).
- Tutorial mutation routes (Batch 2C).
- Character/equipment/gacha/quest write operations.
- Save import/export.
- Rush event serialization on `/load`.
- Admin UI and seasonal systems.

The database tables included here are only those required to recreate the normal legacy `/load` snapshot and its initial player state. Feature-specific writes will migrate into their own modules in later batches rather than growing a new `wdfpData.ts`.

## Setup

```powershell
Copy-Item .env.example .env
npm install
npm run typecheck
npm test
npm run dev
```

The default runtime paths are:

```text
var/database/world-flipper.db
.cdn/
```

Both are ignored by Git. For development with an existing CDN, point `CDN_DIR` at that directory in `.env`.

## Expected endpoints at this point

```text
POST /openapi/service/v3/util/country/get
POST /openapi/service/v4/device/accessToken/create
POST /openapi/service/v4/auth/loginDevice
POST /openapi/service/v3/zat/login
POST /openapi/service/v3/agreement/getForLogin
POST /openapi/service/v3/push/token/register
POST /openapi/service/v3/player/heartbeat
POST /openapi/service/v3/promotion/checkUrlPromotion

GET  /infodesk/v2/appGroup
GET  /infodesk/v2/app

POST /latest/api/index.php/tool/get_header_response
POST /latest/api/index.php/tool/signup
POST /latest/api/index.php/load

GET  /healthz
```

## Compatibility choices

This batch preserves the legacy initial player values and client payload shape used by Starpoint, including default character `1`, default party groups, initial drawn quests, periodic reward points, box-gacha state, options, and other load-time compatibility fields.

A few security/architecture improvements are intentional and should not affect a valid client:

- a VIEWER session must belong to the same Account as the supplied ZAT;
- the legacy Account -> Player boundary is preserved; bootstrap selects the first bound Player, matching Starpoint behavior;
- server time comes from the injected `Clock` rather than scattered `new Date()` calls;
- `available_asset_version` comes from a content service instead of importing a route module.
