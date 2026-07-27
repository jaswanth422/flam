# Lumen

Lumen turns pasted study material into focused flashcards or a
multiple-choice quiz. The interface is built with React 18 and the request
lifecycle is managed with `useReducer`, request IDs, and abort controllers.

The separate modes are deliberate: Lumen favors two well-executed study
experiences over a mixed deck. Flashcards use a horizontal recall orbit and
ratings; quizzes use a vertical answer tumbler and scoring. In both views the
HTML remains a flat, ordered list, while CSS transforms provide the spatial
presentation. Invalid generated items retain their source position as
non-interactive “void” cards instead of silently shifting the deck.

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

The test suite covers both generation modes, wrong-type items, valid, fenced,
truncated, malformed, empty, partially valid, and wrong-shape model outputs,
plus reducer and retest edge cases.
