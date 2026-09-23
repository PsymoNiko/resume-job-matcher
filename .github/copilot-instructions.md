# Copilot instructions for resume-job-matcher

## Project snapshot

This repository is a full-stack TypeScript application that combines a Vite + React frontend with an Express API and an AI-assisted resume/job-matching pipeline. The main user flow is: extract a GitHub profile, synthesize a master profile, compare it to a target role, and generate an ATS-friendly tailored resume. The app also includes auth, quota/billing, model configuration, and optional PostgreSQL persistence.

Key files to read before making changes:
- `server.ts` — primary Express API, auth routes, AI endpoints, TON billing routes, and Vite bootstrap.
- `server/aiService.ts` — centralized AI orchestration, provider routing/fallbacks, JSON parsing, and heuristic generation.
- `server/db.ts` — JSON-backed default cache plus optional PostgreSQL sync and seeded guest/admin accounts.
- `src/App.tsx` — orchestrates the multi-stage job-matching workflow, responsive dashboard shell, user workspace, and admin workspace.
- `src/index.css` — global dashboard theme, responsive utility styling, animation, and print rules.
- `src/components/ResumeAnalyzer.tsx` — standalone resume upload, AI review, line-level choices, resume chat, and regeneration UI.
- `server/telegramBot.ts` — optional Telegram Bot API long-polling adapter for the resume workflow.
- `src/types.ts` — shared TypeScript DTOs used by frontend and backend.
- `src/data/presets.ts` — sample profiles and job descriptions for demo/local development.
- `.env.example` — required environment configuration for Gemini, alternate providers, DB, and TON billing.

## Build, test, and lint commands

From `package.json`:
- `npm install`
- `npm run dev` — runs the Express app and Vite dev server via `tsx server.ts`
- `npm run build` — builds the frontend and emits `dist/server.cjs`
- `npm run start` — starts the compiled Node server from `dist/server.cjs`
- `npm run lint` — executes `tsc --noEmit` and is the repo’s primary validation command
- `npx tsc --noEmit --pretty false` — targeted TypeScript check for a scoped change
- `npm run preview` — serves the built Vite frontend for a production-bundle smoke check
- `npm run clean` — removes generated `dist` output and `server.js`
- `docker compose up --build` — starts the app stack with PostgreSQL
- `docker compose down` — stops the Compose stack without deleting named volumes

There is no dedicated automated test suite or test script in this repo right now. There is therefore no current single-test command; if tests are added, use the repository’s chosen runner with a focused file invocation such as `npx vitest run path/to/file.test.ts` rather than the full suite.

## High-level architecture

### Frontend
`src/` contains the React UI. `src/App.tsx` coordinates the end-to-end pipeline across the following stages:
1. GitHub profile extraction
2. Master profile synthesis
3. Job parsing and match analysis
4. ATS resume generation and export

The UI also exposes auth, profile editing, experience management, and TON billing flows. AI provider and database controls are part of the administrator workspace and are hidden from regular users. `App.tsx` determines admin visibility from the authenticated user/quota state, while the candidate-facing workspace remains available to both guest and authenticated users.

The visual shell is intentionally responsive: the desktop sidebar collapses to a horizontal stage navigation on smaller screens, and `src/index.css` owns the light dashboard palette, subtle entrance/hover motion, reduced-motion fallback, and ATS print overrides. Preserve these responsive and print behaviors when changing layout classes.

`ResumeAnalyzer` is an additional document workflow rendered above the pipeline. It accepts PDF/TXT/Markdown files, sends the extracted source to the backend, shows structured ATS feedback, lets the user choose current versus AI-suggested lines, supports document-scoped chat, and regenerates a Markdown/plain-text resume from the selected draft.

### Backend/API
`server.ts` is the main API surface. It handles:
- health and DB status endpoints
- auth/login/register and social/Telegram login flows
- profile and experience CRUD
- GitHub extraction and AI synthesis calls
- job parsing and tailored resume generation
- resume upload analysis, resume chat, and selected-draft regeneration
- TON quota/billing and admin overrides

Keep route logic in `server.ts` unless a change clearly belongs in a dedicated helper module.

The admin configuration routes are `GET/POST /api/admin/config`. They persist allow-listed settings through `server/adminConfig.ts`, including `AI_ENABLED_PROVIDERS`, default provider/model, provider credentials, database settings, TON settings, and the Telegram token. Requests are accepted with a valid `x-admin-secret` or an authenticated admin identity; never expose secrets in UI responses or logs.

When `TELEGRAM_BOT_TOKEN` is configured, `server.ts` starts `server/telegramBot.ts` after the HTTP server binds. The bot uses Telegram long polling, so only one production instance should run the bot token at a time. It supports `/start`, `/help`, `/reset`, `/github`, `/synthesize`, `/job`, `/joburl`, `/jobdoc`, `/match`, `/tailor`, profile/experience/quota/provider/database commands, PDF/TXT/Markdown document uploads, inline current-versus-improved line choices, TON payment commands, regeneration, and resume chat. Bot sessions are currently in-memory and are lost on restart. The bot calls the local Express API for workflow operations so route validation, quota checks, persistence, and billing behavior stay shared with the web app.

Telegram command behavior is implemented in `server/telegramBot.ts`: update the help text, command dispatch, and any `setMyCommands` registration together when adding a command. Telegram’s command menu can be configured programmatically through the Bot API; do not rely on manually configured BotFather commands when the command set is intended to track the deployed code.

Resume document endpoints are:
- `POST /api/analyze-resume` — accepts JSON containing `file_name`, `file_type`, `file_base64` or `file_text`, and optional `ai_config`; extracts PDF text and returns `analysis` plus `source_text`.
- `POST /api/chat-about-resume` — accepts `resume_text`, ordered `{ role, content }` messages, and optional `ai_config`; the latest message must be a non-empty user message.
- `POST /api/regenerate-resume` — accepts the resolved `selected_resume_text` and optional `ai_config`; returns Markdown and plain-text output.

### AI integration layer
`server/aiService.ts` is the central AI layer. It owns model choice, provider fallback behavior, JSON cleanup/parsing, and heuristic generation when the LLM response is malformed or empty. This is the first place to inspect when changing provider logic or AI output handling.

Resume-specific AI functions include `analyzeResumeText`, `chatAboutResume`, and `regenerateResumeText`. Resume analysis asks for exact source lines in `line_edits`; regeneration must preserve factual details and return the expected `{ markdown, plain_text }` shape.

### Data layer
`server/db.ts` is the persistence layer. By default it uses a JSON cache in `data/user_storage.json`; if `DATABASE_URL` or the `DB_*` environment variables are configured, it can sync to PostgreSQL. The seeded data includes a demo guest user and an admin account.

## Key conventions specific to this repo

- Shared DTOs live in `src/types.ts`; treat them as the canonical contract between frontend and backend.
- The app expects `x-user-id` as the effective user identity header in many routes; follow the existing guest/default semantics instead of inventing a new auth pattern.
- The default guest identity is `guest_user_default`; when no user ID is supplied, the app behaves as that user.
- Telegram requests use the chat ID as the in-memory session key and pass the same user ID through `x-user-id` and `user_id` when calling the local API.
- Prefer env-driven configuration in `.env` / `.env.example` over hard-coded secrets or provider IDs.
- `AI_ENABLED_PROVIDERS` is an administrator-managed comma-separated allow-list. A provider can be configured but still rejected by `executeUnifiedAI` when it is absent from this list; keep the admin UI, `server/adminConfig.ts`, and router behavior aligned.
- AgentRouter uses the OpenAI-compatible chat-completions API, not the AgentRouter console HTML URL. Keep the configured base URL and model ID aligned with the provider’s API documentation/account.
- AI outputs are expected to be structured JSON; sanitize/validate them through the helpers in `server/aiService.ts` before using them elsewhere.
- Preserve the current TON quota/billing behavior when adding feature gating or new endpoints.
- Demo data and sample job presets are intentionally curated for zero-setup local testing; extend `src/data/presets.ts` instead of hard-coding ad hoc values in UI components.
- For cross-stack changes, keep request/response contracts aligned by updating both the backend route and the corresponding frontend state/types together.
- When touching AI prompt or parser logic, validate both the valid-JSON path and the malformed/empty-response fallback path.
- When adding API routes, validate inputs early, return structured JSON errors, and preserve the existing `x-user-id` behavior.
- Resume uploads are JSON/base64 rather than multipart: the server’s body limit is 15 MB, while resume files are limited to 10 MB and only PDF, TXT, and Markdown are supported.
- PDF extraction is shared through `extractTextFromPdfBuffer`; do not add a second PDF parser for resume review.
- Resume line suggestions must retain an exact `current_line` and a valid `line_number`, because the frontend resolves selections by matching those lines against the extracted source text.
- Keep resume chat context bounded; the current backend sends only the most recent 12 messages and caps resume text included in prompts.
- Resume regeneration operates on the user’s resolved draft and must not overwrite the uploaded source file. Preserve the structured Markdown/plain-text response used by the download UI.
- If changing AI response schemas, update the matching interfaces in `src/types.ts` and preserve heuristic/fallback behavior for analysis where it exists.
- Preserve the user/admin separation: regular users may use the resume/job workflow, while database inspection, provider access toggles, and AI configuration are administrator-only.

## Practical workflow for changes

- Start from `src/types.ts` before changing any cross-cutting request/response schema.
- Keep `server.ts` and `server/aiService.ts` in sync when adding AI-backed endpoints or response fields.
- Configure a local `.env` from `.env.example` before exercising Gemini or database features.
- Prefer the smallest relevant validation command when finishing work; the repo currently relies on TypeScript checks and dev/build smoke checks rather than a broad test suite.
- For resume AI changes, validate valid structured JSON, malformed/empty provider responses, exact line matching, chat context handling, and regeneration output shape.

## Validation expectations

Before finishing work, run the smallest relevant validation:
- `npm run lint` for TypeScript safety
- `npm run dev` for local runtime smoke testing
- `npm run build` for production bundle validation
- `docker compose config` or `docker compose build` when touching container/runtime configuration

Docker Compose runs the production bundle on port `3000`, persists the JSON fallback cache through the `app-data` volume, and expects the external `databases_and_storages_default` and `me_network` networks when PostgreSQL is enabled.
