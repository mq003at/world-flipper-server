# Batch 5D — Routing Rework

This overlay replaces the application-level route registration with the current
module convention and removes the unused legacy route trees.

## Install on Windows

1. Stop the server.
2. Extract this ZIP over the project root.
3. From the project root, run:

   ```powershell
   pnpm routes:cleanup
   ```

4. Verify that only the legacy directory is gone:

   ```powershell
   Test-Path .\src\routes
   # Expected: False
   ```

5. Start the server:

   ```powershell
   pnpm dev
   ```

The cleanup command deletes exactly these directories when present:

- `src/routes/api`
- `src/routes/web`
- `src/routes/web_api`

It does not delete `src/modules`, `src/protocol`, `web/pages`, player data, CDN
content, or database files.

## Install on Linux or macOS

After extracting the overlay over the project root:

```sh
sh scripts/cleanup-legacy-routes.sh
pnpm dev
```

## New convention

- Feature handlers and their relative paths live in `src/modules/<feature>`.
- Protocol-specific handlers live in `src/protocol/<protocol>`.
- Public prefixes and compatibility aliases live only in `src/app/routing.ts`.
- `src/app/create-app.ts` constructs services and supplies feature plugins to the
  routing composition root.
- Do not create a new top-level `src/routes` tree.

The obsolete `/rush_event` and `/raid_event` aliases are removed. The supported
client paths are `/latest/api/index.php/event/rush/*` and
`/latest/api/index.php/event/raid/*`.

## Verification performed

- `pnpm typecheck`
- `pnpm test` — 7/7 passed
- `pnpm build`
