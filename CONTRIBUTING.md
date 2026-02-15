# Contributing to SnakeCV

## Setup

```bash
cd frontend
npm install
npm run dev
```

## Scripts

- **`npm run dev`** – Start the dev server
- **`npm run build`** – Production build (output in `dist/`)
- **`npm run preview`** – Serve the production build locally
- **`npm run lint`** – Run ESLint on `src/`
- **`npm run format`** – Format code with Prettier
- **`npm run test`** – Run tests in watch mode
- **`npm run test:run`** – Run tests once

## Before submitting a PR

1. Run **`npm run lint`** and fix any errors.
2. Run **`npm run test:run`** and ensure all tests pass.
3. Optionally run **`npm run format`** to keep style consistent.

Pull requests should keep the test suite green and pass lint.
