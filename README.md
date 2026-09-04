# World Flipper Server — Batch 2B Asset Bootstrap

Batch 2B adds the World Flipper asset/CDN bootstrap flow on top of Batch 2A.

## Implemented flow

```text
/load
  |
  +-- available_asset_version from ModRegistry
  |
  v
/asset/version_info
  |
  +-- platform + locale-specific delayed-asset metadata
  |
  v
/asset/get_path
  |
  +-- initial install -> captured full/short manifest
  +-- fulfill        -> captured full manifest
  +-- outdated res_ver -> mod-only update manifest
  |
  v
/patch/Live/2.0.0/*
```

## New architecture

```text
modules/asset/                 HTTP/application boundary
    asset.contracts.ts
    asset.routes.ts
    asset.service.ts
    asset.presenter.ts

content/cdn/                   CDN/content infrastructure
    cdn.models.ts
    asset-manifest.repository.ts
    json-asset-manifest.repository.ts
    cdn-availability.service.ts
    mod-registry.ts
    asset-version.ts

content/asset-lists/           captured read-only manifests
```

The route layer no longer scans the filesystem, reads environment variables, hashes mod ZIPs, or imports JSON manifests directly.

## Compatibility retained

- Android EN base version `2.1.125`.
- Android KO base version `2.1.121`.
- Android TH base version `2.1.124`.
- iOS uses full manifests, matching legacy Starpoint.
- `asset_size: fulfill` selects the full manifest.
- A differing `res_ver` produces a mod-only update path list.
- Mod ZIPs are advertised as `{$cdnAddress}/mods/<file>`.
- CDN content is still served under `/patch/Live/2.0.0`.

Short-CDN availability now requires both the language's `entities/files` directory and its Android medium CSV, rather than accepting an empty `entities/files` directory by itself.

## pnpm setup

This repository is configured with `node-linker=hoisted` because the current development drive is exFAT and cannot host pnpm's normal symlink layout.

```powershell
Copy-Item .env.example .env
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

If old Starpoint source files are still present in the same working tree, `pnpm typecheck` will type-check those too. Batch 2B is intended to be applied to the clean repo, not mixed with the unported legacy `src/routes/api`, `src/lib`, or `src/data` tree.

## Runtime content paths

```text
var/database/world-flipper.db
content/asset-lists/
.cdn/
```

`.cdn/` remains ignored by Git. `content/asset-lists/` is committed because it is small protocol/master metadata required to reproduce the captured client contract.

## Endpoints added in Batch 2B

```text
POST /latest/api/index.php/asset/version_info
POST /latest/api/index.php/asset/get_path
```

## Still intentionally not implemented

- Tutorial mutations and tutorial gacha (Batch 2C).
- Character/equipment/gacha/quest feature modules.
- CDN validation/unpack tooling rewrite.
- Save import/export.
- Admin UI and seasonal scheduling.
