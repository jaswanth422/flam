# Lumen Study Assistant

Lumen turns notes, PDFs, Word documents, Markdown, or a short topic into focused
flashcards and multiple-choice quizzes.

## The problem

AI-generated study cards can look convincing while containing unsupported or
random facts. Lumen makes that uncertainty visible.

- Notes with 400 or more characters use **source mode**. Every generated item
  includes an evidence quote that is checked against the original notes.
- Shorter input uses **topic mode**. The deck is clearly labelled as general
  knowledge and never claims to be verified against the user's notes.
- Structurally broken items are rejected. Useful items with softer quality
  problems remain editable and display a warning.

This produces an auditable statement such as “7 of 8 cards verified” instead of
silently hiding questionable output.

## Quick start

Requirements: Node.js 18.18 or newer and a
[Fireworks AI](https://fireworks.ai/) API key.

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd lumen-study-assistant
cp .env.example .env.local
```

Open `.env.local` and add your key:

```text
FIREWORKS_API_KEY=your_key_here
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-flash
```

Then run:

```bash
npm install && npm start
```

Open http://127.0.0.1:5173.

The interface still opens without an API key, but AI generation requires the
key. `.env.local` is ignored by Git and must never be committed.

## How to use it

1. Choose **Flashcards** or **Quiz**.
2. Paste text or upload a PDF, `.docx`, Markdown, or text file.
3. Choose the number of items and generate the deck.
4. For flashcards, reveal the answer and rate your recall.
5. For quizzes, answer with the buttons or number keys.
6. Inspect evidence badges, edit weak items, and retest missed material.

## Main technical decisions

### Separate study modes

Flashcards and quizzes use different prompts, schemas, validation, interactions,
and results. A homogeneous deck is easier to study and simpler to reason about
than a mixed deck.

### Evidence grounding

The model must return a short supporting quote in source mode. Client-side code
normalizes punctuation and spacing and classifies each quote as:

- `verified`: an exact normalized source match;
- `partial`: at least 85% meaningful-token overlap inside a local source window;
- `unverified`: missing, too short, fabricated, or stitched from distant text.

### Defensive AI-output handling

The application treats model output as untrusted data:

- JSON fences and surrounding prose are removed before parsing.
- Wrong card types, blank required fields, invalid answer indexes, and quizzes
  without exactly four choices are dropped.
- Length, story, topic, and grounding problems produce warnings without
  destroying an otherwise useful item.
- Malformed item positions remain visible as non-interactive “void” cards.
- One JSON self-repair request is attempted after an unparseable response.
- Requests use abort controllers, request IDs, rate-limit retrying, and timeouts.

### State and scoring

`useReducer` owns generation, study, retest, rating, and error state. Quiz scores
are derived from the deck and answers instead of being stored twice. Unanswered
questions count as incorrect and results are grouped by weakest topic first.

## Project structure

```text
src/components/       React interface and study controls
src/hooks/useDeck.js  AI request lifecycle and cancellation
src/lib/              Prompts, schemas, parsing, files, and grounding
src/state/            Reducer and derived quiz selectors
api/generate.js       Server-side Fireworks API endpoint
server/index.js       Node API process for an Nginx deployment
deploy/               Nginx and systemd production templates
worker/               Production Sites worker adapter
tests/                Validation, grounding, reducer, and scoring tests
```

## Commands

```bash
npm start       # local app with the AI API route
npm run start:api   # production API process behind Nginx
npm test        # run the test suite
npm run build   # create the production build
npm run build:nginx # create static files for Nginx
npm run preview # preview the production build
```

## Deploy a live demo with Vercel

Run these commands from the project folder:

```bash
npx vercel login
npx vercel link
npx vercel env add FIREWORKS_API_KEY production --sensitive
npx vercel env add FIREWORKS_MODEL production
npx vercel --prod
```

When prompted for `FIREWORKS_MODEL`, enter:

```text
accounts/fireworks/models/deepseek-v4-flash
```

Enter the API key only in Vercel's secure prompt. Do not pass it directly in the
command or commit `.env.local`. The link command connects the local folder to a
Vercel project; the final command creates the public production URL.

## Deploy with Nginx on Ubuntu

Nginx serves the React build and forwards `/api/` requests to the private Node
API process on port 3000. This requires an Ubuntu VPS with a public IP, Node.js
20 or newer, and npm; Nginx itself is not a hosting provider.

On the server, install the required software and clone the repository:

```bash
sudo apt update
sudo apt install -y nginx git
node --version
sudo git clone YOUR_GITHUB_REPOSITORY_URL /var/www/lumen-study-assistant
sudo chown -R "$USER":www-data /var/www/lumen-study-assistant
cd /var/www/lumen-study-assistant
npm ci
npm run build:nginx
```

Create `/etc/lumen-study-assistant.env` with the following values:

```text
FIREWORKS_API_KEY=your_key_here
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-flash
```

Protect the key and install the included service and Nginx configuration:

```bash
sudo chmod 600 /etc/lumen-study-assistant.env
sudo cp deploy/systemd/lumen-study-assistant.service /etc/systemd/system/
sudo cp deploy/nginx/lumen-study-assistant.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lumen-study-assistant.conf /etc/nginx/sites-enabled/lumen-study-assistant.conf
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl daemon-reload
sudo systemctl enable --now lumen-study-assistant
sudo nginx -t
sudo systemctl reload nginx
```

Open `http://YOUR_SERVER_IP`. Check the two services if anything fails:

```bash
systemctl status lumen-study-assistant --no-pager
systemctl status nginx --no-pager
curl http://127.0.0.1:3000/healthz
```

Before an interview demo, point a domain at the server and enable HTTPS. Replace
`server_name _;` in the Nginx template with the domain, then use your preferred
ACME/Let's Encrypt client to install the certificate.

## AI usage note

I used OpenAI Codex as a pair-programming assistant for implementation,
refactoring suggestions, test-case generation, UI iteration, deployment
troubleshooting, and README drafting. I supplied the product requirements and
constraints, reviewed the generated changes, tested the behavior, corrected
issues, and made the final architecture and product decisions.

I did not paste an existing public project or tutorial implementation. The
application was built and iterated specifically for this project.

## Limitations and next steps

- The 85% partial-match threshold is hand-tuned, not mathematically optimal.
- Token overlap is order-independent within its local window. A
  longest-common-subsequence comparison would better detect scrambled quotes.
- Evidence matching checks lexical support, not full semantic correctness.
- Topic mode depends on model knowledge and therefore cannot be source-verified.
- Very large documents are truncated before generation. Chunking and retrieval
  would provide better whole-document coverage.
- `.doc` files are not supported; save them as `.docx` first.
- The application has no user accounts or cloud deck persistence.

## Time spent

Approximately two focused days, including implementation, testing, UI
iteration, deployment, and documentation.

## Screen-recording checklist

A short two-to-three-minute recording can show:

1. The mode switch and file-upload controls.
2. A source-mode flashcard deck with a revealed evidence quote.
3. Recall rating and automatic movement to the next card.
4. A quiz answer with its explanation.
5. Results grouped by topic and the “Retest wrong” flow.

Do not expose `.env.local`, the API key, or terminal environment variables in
the recording.

## Verification

The automated suite covers grounding states, exact and fuzzy evidence, quote
normalization, fabricated and stitched evidence, topic-mode honesty, malformed
AI output, mode-specific schemas, reducer behavior, retesting, file validation,
and derived quiz scoring.

```bash
npm test
npm run build
```
