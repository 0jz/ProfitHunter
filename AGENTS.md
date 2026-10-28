# AGENTS.md — ProfitHunter

React + Vite app: Claude (with web search) validates a startup idea, then a 0.05 SOL Phantom payment on Solana devnet unlocks the full result.

## Commands
- Install: `npm install`
- Dev: `npm run dev` → `vite --host 127.0.0.1` (default port 5173). **The only mode with a working API.**
- Build: `npm run build` → `tsc && vite build` (`tsc` doubles as the type check)
- Preview: `npm run preview` (static only; `/api/profit-hunt` is not served)
- Test / lint: none configured

## Where logic lives
- `vite.config.ts`: `profitHuntApiPlugin()` registers `POST /api/profit-hunt` via `configureServer`; `buildProfitHuntPrompt()` (prompt + required JSON shape); model `claude-sonnet-4-5`; tool `web_search_20250305` (`max_uses: 4`); `parseClaudeJson()` / `extractJsonObject()` (brace-matching JSON extraction)
- `src/main.tsx`: entire UI in one file; `PAYMENT_SOL`, `RECIPIENT_WALLET`, devnet `Connection`, `payWithSolana()`, result normalisation with `textOr(...)` fallbacks
- `src/styles.css`: all styles

## Conventions
- ESM (`"type": "module"`), TypeScript, React 19 function components, `lucide-react` icons.
- The Anthropic API is called with raw `fetch` (no SDK), header `anthropic-version: 2023-06-01`.
- The prompt's JSON shape and the normaliser in `src/main.tsx` must stay in sync. If you add or rename a field, update both.
- `dotenv` is loaded in `vite.config.ts` only (server side). Never expose the key through `import.meta.env` / `VITE_*`.

## Do not commit / touch
- `.env` and `.env.*` (gitignored, except `.env.example`), `node_modules/`, `dist/`.
- Don't change `RECIPIENT_WALLET` or the network to mainnet unless explicitly asked.

## Gotchas
- The API returns HTTP 400 for every failure, including a missing key and Anthropic errors.
- The paid "unlock" is client-side only: it is not a security boundary.
- The UI's default market is `us-eu`; the server falls back to `global` if `market` is missing.
- Some user-facing wallet errors are in Serbian.
- `brand.md` documents a deferred brand setup; styling is intentionally neutral.

Humans: see README.md
