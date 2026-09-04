world-flipper-server/
│
├── src/
│   ├── main.ts
│   │
│   ├── app/
│   │   ├── create-app.ts
│   │   ├── config.ts
│   │   └── plugins/
│   │       ├── protocol-codec.ts
│   │       ├── request-context.ts
│   │       ├── mobile-session.ts
│   │       ├── error-handler.ts
│   │       └── static-content.ts
│   │
│   ├── protocol/
│   │   ├── worldflipper/
│   │   │   ├── codec.ts
│   │   │   ├── data-headers.ts
│   │   │   ├── result-codes.ts
│   │   │   └── protocol-error.ts
│   │   │
│   │   └── kakao/
│   │       ├── openapi.types.ts
│   │       └── infodesk.types.ts
│   │
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── identity.routes.ts
│   │   │   ├── identity.service.ts
│   │   │   ├── identity.repository.ts
│   │   │   ├── identity.repository.sqlite.ts
│   │   │   ├── identity.contracts.ts
│   │   │   └── identity.presenter.ts
│   │   │
│   │   ├── player/
│   │   ├── tutorial/
│   │   ├── character/
│   │   ├── equipment/
│   │   ├── inventory/
│   │   ├── party/
│   │   ├── quest/
│   │   ├── reward/
│   │   ├── gacha/
│   │   ├── shop/
│   │   ├── mission/
│   │   ├── mail/
│   │   └── events/
│   │       ├── box-gacha/
│   │       ├── rush/
│   │       ├── ranking/
│   │       └── raid/
│   │
│   ├── content/
│   │   ├── master-data/
│   │   │   ├── master-data.ts
│   │   │   ├── json-master-data.ts
│   │   │   ├── master-data.types.ts
│   │   │   └── indexes/
│   │   │
│   │   └── cdn/
│   │       ├── cdn.service.ts
│   │       ├── mod-registry.ts
│   │       └── asset-version.ts
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── database.ts
│   │   │   ├── transaction.ts
│   │   │   └── migrations/
│   │   │
│   │   ├── clock/
│   │   │   ├── clock.ts
│   │   │   ├── system-clock.ts
│   │   │   └── overridable-clock.ts
│   │   │
│   │   ├── random/
│   │   │   ├── random-source.ts
│   │   │   └── crypto-random-source.ts
│   │   │
│   │   └── filesystem/
│   │
│   ├── admin/
│   │   ├── admin.routes.ts
│   │   ├── player-admin.service.ts
│   │   └── server-admin.service.ts
│   │
│   └── shared/
│       ├── errors/
│       ├── types/
│       └── utils/
│
├── content/
│   └── master/
│       ├── character/
│       ├── quest/
│       ├── gacha/
│       ├── shop/
│       └── ...
│
├── web/
│   ├── pages/
│   └── public/
│
├── tools/
│   ├── cdn/
│   │   ├── validate.ts
│   │   ├── unpack.ts
│   │   └── merge.ts
│   ├── protocol/
│   │   └── generate-docs.ts
│   └── proxy/
│       └── mitm-redirect-traffic.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   │   ├── openapi/
│   │   └── game-api/
│   └── fixtures/
│
├── deployment/
│   ├── nginx/
│   ├── systemd/
│   └── docker/
│
├── docs/
│   ├── architecture/
│   ├── protocol/
│   ├── reverse-engineering/
│   └── operations/
│
├── var/                         # ignored
│   ├── database/
│   ├── logs/
│   └── mods/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md