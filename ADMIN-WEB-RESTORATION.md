# Admin Web Restoration

This overlay restores the administration client at `http://localhost:8000`
using the current modular route structure.

## Pages

- `/` — server clock dashboard
- `/player` — player list
- `/player/:id` — portable save export/import
- `/public/*` — extracted CSS, fonts, and logo

The original `web.zip` is not used at runtime. Its files are extracted directly
under `web/pages` and `web/public`.

## Save files

Download and upload now call the Phase 5A `PlayerDataService`. Legacy client
serialization and direct `replacePlayerDataSync` code are not used.

Import is intentionally disabled unless this trusted-server flag is set:

```env
PLAYER_DATA_IMPORT_ENABLED=true
```

Restart the server after changing the flag.

## Server clock

The dashboard treats the selected time as UTC. The adjustable runtime clock
continues moving after it is changed; Reset returns it to the host wall clock.
Changing time affects content scheduling only and does not reset player data.

The frozen client-facing gacha shell clock remains separate so the unmodified
client continues to show Portal.

## Verification

```powershell
pnpm typecheck
pnpm test
pnpm build
```
