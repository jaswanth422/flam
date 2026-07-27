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

## Grounding and verification

Lumen uses two honest input regimes:

- Inputs of at least 400 characters are treated as source material. The model
  must return an evidence quote for each item, and the client checks that quote
  against the supplied text.
- Shorter inputs are treated as topics. They use conservative textbook-level
  knowledge and are explicitly labelled as general knowledge, never as
  verified against the user's notes.

Source items have three verification outcomes:

- `verified`: the normalized quote appears contiguously in the source.
- `partial`: at least 85% of meaningful evidence tokens occur within a local
  source window.
- `unverified`: the quote is missing, too short, fabricated, or stitched from
  passages too far apart.

Structural failures such as the wrong card type, a blank question/answer, an
invalid correct index, or anything other than four quiz choices are dropped.
Presentation-quality failures such as a long front, missing story, missing
topic, or failed evidence check are warnings: the item stays visible so the
student can inspect and edit it. This prevents the validator from silently
inflating its own trust score.

The 85% partial-match threshold is hand-tuned against the project fixtures, not
a mathematically privileged value. Token matching is also order-independent
inside its locality window, so a locally scrambled quote can still pass as a
close match. A longest-common-subsequence ratio is the next planned improvement.

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

The test suite covers both generation modes, wrong-type items, exact and fuzzy
evidence, quote-style normalization, fabricated and stitched evidence, topic
mode, soft warnings, malformed output, derived quiz scoring, reducer state,
and retest edge cases.
