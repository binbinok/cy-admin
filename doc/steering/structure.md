# Project Structure

```
├── miniprogram/            # Frontend mini program
│   ├── app.ts              # App entry, cloud init
│   ├── app.json            # Pages, tabBar, window config
│   ├── pages/              # Page modules
│   │   ├── index/          # Home page
│   │   ├── member/         # Member: register, profile, card
│   │   ├── service/        # Service: list, detail
│   │   ├── appointment/    # Appointment: create, list, detail
│   │   ├── record/         # Consumption & points history
│   │   └── admin/          # Admin: service, technician, appointment
│   ├── services/           # API service layer (cloud function calls)
│   ├── utils/              # Shared utilities
│   ├── components/         # Reusable UI components
│   ├── typings/            # TypeScript type definitions
│   └── assets/             # Static assets (icons)
│
├── cloudfunctions/         # Backend cloud functions
│   ├── createAppointment/  # Each function is self-contained
│   ├── getAppointments/
│   ├── registerMember/
│   └── ...
│
├── cloudbaserc.json         # CloudBase envId + functions deploy config (functions[])
├── deploy-advanced.js       # Batch deploy functions (sync runtime, parallel + retries, report)
├── .cloudbase-deploy/       # Local deployment artifacts
│   └── reports/             # JSON deploy reports (generated)
│
├── tests/
│   ├── unit/               # Unit tests
│   ├── property/           # Property-based tests (fast-check)
│   └── setup.ts            # Test setup/mocks
│
└── docs/                   # Documentation
    └── database-schema.md  # Collection schemas
```

## Conventions

### Page Structure
Each page has 4 files: `{name}.ts`, `{name}.wxml`, `{name}.wxss`, `{name}.json`

### Service Layer
- Services in `miniprogram/services/` wrap cloud function calls
- Export as singleton objects (e.g., `appointmentService`, `memberService`)

### Cloud Functions
- One function per operation
- Return `{ success: boolean, data?: T, error?: { code, message } }`
- Use `wx-server-sdk` with `cloud.DYNAMIC_CURRENT_ENV`

### Types
- Enums in `miniprogram/typings/types/enums.ts`
- Interfaces in `miniprogram/typings/types/index.d.ts`
- Use Chinese comments for domain-specific documentation

### Utilities
- Pure functions in `miniprogram/utils/`
- Re-exported via `miniprogram/utils/index.ts`
