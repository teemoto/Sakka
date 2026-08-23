# Local development

## Prerequisites

- Node.js 22.13 or later
- npm 11 or later

## Start the application

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

No secrets are required for the current foundation. When GitHub authentication is added, copy `.env.example` to `.env.local` and provide values only there. Never commit `.env.local`.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The current test suite is deliberately small. It establishes the stable domain-error contract before GitHub adapter and browser workflow tests are introduced.

The same formatting, linting, type-checking, test, and production-build commands run in GitHub Actions for pushes to `main` and pull requests.
