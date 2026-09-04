# Batch 3A — Reward foundation

This batch introduces the server-side reward/economy grant boundary used by quest, gacha, and shop.

## Added

- `content/master/character.json` — only the master file required by reward character grants.
- `src/content/master-data/character-catalog.ts`
- `src/content/master-data/json-character-catalog.ts`
- `src/modules/reward/reward.models.ts`
- `src/modules/reward/reward.repository.ts`
- `src/modules/reward/reward.repository.sqlite.ts`
- `src/modules/reward/reward.service.ts`
- `src/modules/reward/reward.presenter.ts`
- `tests/integration/reward.service.test.ts`

## Changed

- `.env.example` adds `MASTER_DATA_DIR=content/master`.
- `src/app/config.ts` exposes `masterDataDir` for later Phase 3 modules.

## No route changes

3A intentionally exposes no HTTP endpoint. Quest, gacha, and shop will call `RewardService` in 3B–3D. Legacy `src/routes/api/**` is reference code only and should not be edited.

## Guarantees covered by tests

- item grants
- equipment grants and World Flipper stack semantics
- new character grants
- duplicate-character stack + dupe-item conversion
- beads / mana / EXP-pool grants
- atomic rollback for an invalid reward batch
