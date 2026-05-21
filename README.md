# Investing Portfolio

A personal portfolio tracker built with Next.js 16, React 19, and Tailwind CSS v4. Supports multiple portfolios, core/satellite allocation tracking, and live NAV fetching for Thai mutual funds via the SEC API.

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SEC_API_KEY=your-sec-api-subscription-key
```

Without Supabase vars the app runs in local-only mode (no auth, data stored in localStorage).  
Without `SEC_API_KEY` the "Update NAV" feature is unavailable.

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Commands

```bash
pnpm dev      # Start development server
pnpm build    # Production build
pnpm lint     # Run ESLint
npx playwright test  # Run Playwright tests (requires dev server running)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Auth & DB | Supabase (email/password, RLS) |
| Deployment | Netlify (`@netlify/plugin-nextjs`) |
| Testing | Playwright |

## Claude Agent Workflow

This project uses Claude Code agents to implement features autonomously via a self-healing test loop.

### How it works

Three specialized agents work in sequence:

| Agent | Role |
|---|---|
| `react-generator` | Writes the Next.js components, server actions, and API routes |
| `playwright-tester` | Runs Playwright tests and writes results to `test-results.md` |
| `code-fixer` | Reads `test-results.md` and fixes only the reported failures |

### Running the agent loop

**Step 1 — Write your feature spec**

Create or update `requirements.md` with a clear description of the feature to implement. Be specific: include UI behavior, data flow, and edge cases.

**Step 2 — Start a Claude Code session**

```bash
claude
```

**Step 3 — Paste this prompt once**

```
Implement the feature in requirements.md using this exact sequence:
1. Use react-generator to write the code
2. Use playwright-tester to validate — it will write test-results.md
3. If STATUS in test-results.md is FAIL or PARTIAL, use code-fixer to resolve failures
4. Repeat steps 2-3 until STATUS is PASS or CYCLES_REMAINING reaches 0
5. If CYCLES_REMAINING reaches 0 with failures remaining, stop and report what could not be fixed
```

Claude will run the loop autonomously. When the loop ends, review the final `test-results.md` and the generated code before committing.

### requirements.md format

There is no strict format, but a clear spec produces better results. Example:

```markdown
## Feature: Add dividend tracking to holdings

- Add a `dividend` field (number, optional) to the `Holding` type
- Show total annual dividend income on the portfolio summary page
- Add a dividend input to the holding dialog (below current price)
- Skip dividend display when value is 0 or undefined
```

### Git workflow

All features must be implemented on a dedicated branch:

```bash
git checkout -b feature/<short-description>
```

Open a PR to merge into `main` when the feature is ready.

## Deployment

Deployed to **Netlify** via `@netlify/plugin-nextjs`. Config in `netlify.toml`.

See `CLAUDE.md` for full architecture documentation.
