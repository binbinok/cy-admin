# Tech Stack

## Platform
- **WeChat Mini Program** with Cloud Development (云开发)
- Cloud environment: configured in `cloudbaserc.json` via `envId` (current repo default: `cloud1-1g7yz5w766dd366f`)

## Languages
- **TypeScript** for miniprogram frontend (ES2018 target)
- **JavaScript** (CommonJS) for cloud functions

## Frontend Structure
- WXML templates, WXSS styles, TypeScript logic
- Page-based architecture with `Page()` API
- Custom components in `miniprogram/components/`

## Backend
- **WeChat Cloud Functions** in `cloudfunctions/`
- **Cloud Database** (MongoDB-like document store)
- Each function is self-contained with its own `package.json`

## Testing
- **Vitest** for unit and property-based tests
- **fast-check** for property-based testing
- Tests in `tests/unit/` and `tests/property/`

## Key Dependencies
- `miniprogram-api-typings` - WeChat API types
- `wx-server-sdk` - Cloud function SDK

## Common Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint TypeScript files
npm run lint

# Batch deploy all cloud functions (parallel + retries + report)
node deploy-advanced.js
```

## Cloud Functions Deployment
- Deployment is driven by `cloudbaserc.json`.
- `deploy-advanced.js` will:
  - Recursively scan `cloudfunctions/` and treat a folder with `package.json` + `index.js` as a deployable function.
  - **Before deploy**, read existing function `runtime` from cloud (via `tcb fn detail`) and write it back into `cloudbaserc.json` to avoid "Runtime 不支持修改" errors.
  - Deploy functions in parallel with retries, and write a JSON report to `.cloudbase-deploy/reports/`.

## Configuration Files
- `project.config.json` - WeChat DevTools project config
- `miniprogram/app.json` - App pages, tab bar, window settings
- `tsconfig.json` - TypeScript compiler options
- `vitest.config.ts` - Test configuration
