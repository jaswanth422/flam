# Lumen

Lumen turns pasted study material into a mixed deck of flashcards and
multiple-choice checks. The interface is built with React 18 and the request
lifecycle is managed with `useReducer`, request IDs, and abort controllers.

## Run locally

```bash
npm install
npm run dev
```

The standalone Vite preview serves the interface. For live generation, run it
behind a platform that supports the Vercel handler in `api/generate.js`, or use
the included Sites worker adapter.

## Configuration

Copy `.env.example` to `.env.local` and provide:

```text
FIREWORKS_API_KEY=...
FIREWORKS_MODEL=...
```

The API key is read only in server-side code. It is never referenced through a
Vite client environment variable and never enters the browser bundle.

## Quality checks

```bash
npm test
npm run build
```

The test suite covers valid, fenced, truncated, malformed, empty, partially
valid, and wrong-shape model outputs, plus reducer edge cases.
