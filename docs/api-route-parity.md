# API route parity

This file tracks the migration from the legacy `src/routes/api` layer to the
new service/repository architecture. A route is not considered migrated merely
because a Fastify path exists: its request parser, persistence behavior and
captured response shape must also be preserved.

## Migrated compatibility groups

- `attention/check`
- `option/update`
- `option/update_in_battle`
- `party/edit`
- `party_group/edit`
- `encyclopedia/index`
- `encyclopedia/read_keyword`
- Client aliases `mail/receive` and `mail/receive_all`
- Client prefixes `event/rush/*` and `event/raid/*`
- Kakao SDK log endpoints `log/writeSdkBasicLog` and `log/writeRoundLog`
- Kakao promotion endpoints `promotion/checkUrlPromotion`,
  `promotion/getStartingPopups` and `promotion/popup/getList`

## Still requiring migration

- `character/*`
- `equipment/*`
- `expod/*`
- `ex_boost/*`
- Remaining multiplayer endpoints
- Other incomplete endpoints listed in `docs/routes.md`

## Capture required

- `quest/get_recent_other_player_party`

No response capture or legacy handler is present for this endpoint. It must not
be guessed into the compatibility layer because an incorrect MessagePack shape
can turn an H404 into a client-side C8601.

The regression tests in `tests/api-route-parity.test.ts` and
`tests/openapi-compatibility.test.ts` protect the migrated client-facing paths
and their captured OpenAPI response contracts from future regressions.
