# Self-Analyzer AI

**Turn your engineering experience into career intelligence.**

Self-Analyzer AI is an AI-assisted career development platform that helps software developers organize their professional experience, evaluate job opportunities, understand skill gaps, and prepare role-specific, ATS-oriented resumes.

The application combines a React and TypeScript frontend with an Express API and an AI orchestration layer. Its main workflow moves from GitHub experience extraction to a reusable professional profile, job matching, and tailored resume generation.

> **Project status: early-stage / alpha.** This repository contains an evolving implementation. Review the security and deployment notes below before using it with real candidate data, public users, or payments.

## Table of contents

- [What it does](#what-it-does)
- [How the workflow works](#how-the-workflow-works)
- [Additional capabilities](#additional-capabilities)
- [Architecture and technology](#architecture-and-technology)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Running with Docker Compose](#running-with-docker-compose)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Security, privacy, and production readiness](#security-privacy-and-production-readiness)
- [Development and validation](#development-and-validation)
- [Contributing](#contributing)
- [License](#license)

## What it does

Self-Analyzer AI is built around a simple idea: a developer's work history, projects, repositories, and technical skills should be useful inputs for career decisions—not just raw material for a resume.

It aims to help answer four practical questions:

1. What experience and skills can be evidenced by my development work?
2. How does my background compare with a particular job opportunity?
3. Which requirements are missing or need stronger evidence?
4. How can I present my real experience clearly for this role?

AI-generated scores and recommendations are decision-support outputs. They are not guarantees of interview selection, hiring outcomes, or objective measures of a person's ability.

## How the workflow works

The main product flow has four stages.

### 1. GitHub experience extraction

Provide a GitHub username or a Personal Access Token to retrieve a developer profile and repository information. Repository descriptions and README context can be used to enrich experience records.

You can then review and manage the extracted experience instead of treating every automatically discovered item as final.

### 2. Master profile synthesis

Use the extracted information, saved experiences, and optional notes to build a structured professional profile.

The master profile is intended to be reusable across multiple job applications. It can be reviewed and refined before being used for matching or resume generation.

### 3. Job analysis and matching

Provide a target opportunity as a job description, a URL, or an uploaded job document.

The matching workflow compares the candidate profile with the target requirements and can return:

- An overall compatibility score.
- A score breakdown for technical skills, architectural fit, and domain relevance.
- Matching keywords and their relevance.
- Missing or underrepresented skills, grouped by importance.
- Relevant projects and explanations of why they fit.
- A strategic summary for positioning the candidate.

The score is an AI-generated comparison to support human review, not a validated hiring probability.

### 4. Tailored ATS resume generation

Generate a resume using the selected profile, job description, and match analysis.

The generation prompts include factuality guardrails intended to avoid inventing employers, years of experience, metrics, or project history. Review every generated statement before using it in an application.

The tailored resume workflow supports PDF output in English, Persian, and Russian. The PDF renderer uses a single-column document structure and includes language-specific labels and font handling.

## Additional capabilities

### Resume review and editing

The separate resume analyzer accepts PDF, TXT, and Markdown files up to 10 MB. It can provide:

- An overall review score and summary.
- Strengths and ATS-related findings.
- Missing keyword suggestions.
- Prioritized improvement recommendations.
- Line-level suggestions with the option to keep the original or use the proposed wording.
- A chat interface for discussing the resume.
- Regenerated Markdown and plain-text versions based on selected edits.

The original resume should remain the source of truth. Verify all proposed edits against the candidate's actual experience.

### Experience and profile management

The application includes user profile and experience management, including manual updates, bulk experience creation, GitHub experience synchronization, and AI-assisted experience enhancement.

### Configurable AI providers

The AI service layer supports provider configuration for Gemini, OpenAI, Anthropic, DeepSeek, AgentRouter, and compatible custom endpoints, subject to the provider configuration and credentials available to the deployment.

A custom model endpoint can be used for compatible self-hosted services such as Ollama, vLLM, or LocalAI. Keep provider credentials on the server and do not expose them in frontend code.

### Telegram

There are two Telegram-related integrations:

- **Telegram Mini App:** Telegram Web App integration and Telegram-based sign-in.
- **Telegram bot:** An optional Bot API integration enabled with `TELEGRAM_BOT_TOKEN`. The bot can guide users through resume review, GitHub profile extraction, profile synthesis, job matching, resume tailoring, and account/quota operations.

The bot uses long polling and keeps conversation workflow sessions in memory. Run only one active bot-polling instance for a given bot token; in-memory sessions are lost when the process restarts.

### Data storage

The application includes a JSON-backed local storage path and optional PostgreSQL synchronization. PostgreSQL can be configured through `DATABASE_URL` or the individual `DB_*` variables.

The Docker Compose configuration in this repository is designed to connect to an existing shared PostgreSQL deployment; it does not provision a PostgreSQL service by itself.

### TON billing (experimental)

The interface and API include TON payment-order, quota, and daily-pass flows. **The current payment-verification implementation does not independently verify transactions against the TON blockchain.** Do not use it to collect or authorize real payments until independent on-chain verification, replay protection, and payment-state validation have been implemented and tested.

## Architecture and technology

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| UI and motion | Tailwind CSS, Lucide React, Motion |
| Backend | Node.js 22, Express, TypeScript |
| AI | Google GenAI SDK and configurable provider integrations |
| Data | PostgreSQL via `pg`, with local JSON storage |
| Resume processing | `pdf-parse`, `jsPDF` |
| Telegram | Telegram Web Apps and Telegram Bot API |
| TON | TON Connect UI and TON-related wallet/payment integrations |
| Deployment | Docker, Docker Compose |

## Getting started

### Prerequisites

- Node.js 22 or later.
- npm.
- An API key for the AI provider you intend to use.
- PostgreSQL if you want database persistence rather than the local JSON storage path.

### 1. Clone the repository

```bash
git clone https://github.com/PsymoNiko/resume-job-matcher.git
cd resume-job-matcher
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and configure at least one AI provider. The current example sets DeepSeek as the default provider, so add a valid `DEEPSEEK_API_KEY` or change `AI_DEFAULT_PROVIDER` to a provider for which you have configured credentials.

The database values in `.env.example` are environment-specific examples. Update them to point to your own PostgreSQL instance, or clear the database host/connection settings when you intentionally want to use the local JSON storage path.

Do not commit your real `.env` file or share provider keys, database passwords, Telegram tokens, administrator secrets, or wallet credentials.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Express server hosts the Vite development middleware. The application uses port **3000** in the current server implementation.

### 5. Check the health endpoint

```bash
curl http://localhost:3000/api/health
```

A healthy process returns a JSON response containing `status: "ok"` and a timestamp. This checks that the HTTP process is responding; it does not by itself prove that the AI provider, database, Telegram, or TON integrations are working.

## Configuration

All configuration is read by the server from environment variables. See [`.env.example`](.env.example) for the current list and comments.

| Variable | Purpose |
| --- | --- |
| `AI_DEFAULT_PROVIDER` | Default AI provider, currently set to `deepseek` in the example file. |
| `AI_DEFAULT_MODEL` | Default model name for the selected provider. |
| `AI_ENABLED_PROVIDERS` | Optional comma-separated provider allow-list. |
| `GEMINI_API_KEY` | Google Gemini API key. |
| `OPENAI_API_KEY` | OpenAI API key. |
| `ANTHROPIC_API_KEY` | Anthropic API key. |
| `DEEPSEEK_API_KEY` | DeepSeek API key. |
| `AGENTROUTER_BASE_URL`, `AGENTROUTER_MODEL`, `AGENTROUTER_API_KEY` | AgentRouter endpoint and credentials. |
| `CUSTOM_LLM_BASE_URL`, `CUSTOM_LLM_MODEL`, `CUSTOM_LLM_API_KEY` | OpenAI-compatible custom model endpoint. |
| `CUSTOM_LLM_ALLOW_INSECURE_TLS` | Optional TLS override for a trusted self-hosted endpoint; avoid enabling it in production. |
| `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` | PostgreSQL connection settings. |
| `DATABASE_URL` | Alternative PostgreSQL connection string, when supported by the deployment. |
| `TELEGRAM_BOT_TOKEN` | Optional Telegram bot token; omit to disable bot polling. |
| `ADMIN_SECRET_KEY` | Secret used by the administrator configuration interface and API. |
| `ADMIN_EMAIL`, `ADMIN_TELEGRAM_ID` | Administrator identity configuration. |
| `TON_NETWORK`, `TON_RECIPIENT_WALLET`, `TON_USDT_JETTON_MASTER`, `TON_DAILY_PASS_USDT`, `TON_DAILY_PASS_TON` | Experimental TON payment and quota settings. |

The administrator configuration page is served at `/admin.html`. Protect it behind a properly secured deployment and configure a strong `ADMIN_SECRET_KEY`.

## Running with Docker Compose

The repository includes a multi-stage [Dockerfile](Dockerfile) and [docker-compose.yml](docker-compose.yml). The Compose file is **not a standalone database stack**: it expects infrastructure that already exists.

Before starting the application, provision:

1. A PostgreSQL service reachable as `global-postgres` on the external network `databases_and_storages_default`.
2. The external Docker network `me_network`.
3. A valid `DB_PASSWORD` and the remaining database settings in `.env`.

The PostgreSQL network is expected to be created by your database deployment. Do not create a second network with the same purpose if the shared database stack already manages it.

After those prerequisites are in place:

```bash
cp .env.example .env
# Edit .env and set DB_PASSWORD, AI provider credentials, and other required values.

docker compose config
docker compose up -d --build
```

The application is exposed on port **3000**. Compose persists the JSON application data directory in the `app-data` named volume.

Useful commands:

```bash
docker compose logs -f app
docker compose ps
docker compose down
```

The Compose service also accepts optional `DOCKER_HTTP_PROXY`, `DOCKER_HTTPS_PROXY`, `DOCKER_ALL_PROXY`, and `DOCKER_NO_PROXY` variables for environments that need an outbound proxy.

**Build reproducibility note:** the current Dockerfile installs dependencies with npm while copying `bun.lock`, rather than using the npm lockfile. Align the Dockerfile and the selected package manager/lockfile before relying on byte-for-byte reproducible image builds.

## API overview

The Express API is implemented in [`server.ts`](server.ts). The following are selected routes, not an exhaustive API specification.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Process health check. |
| GET | `/api/ai/providers` | List available/configured AI providers. |
| POST | `/api/ai/test-connection` | Test an AI provider connection. |
| POST | `/api/extract-github` | Extract a GitHub profile and repository experience. |
| POST | `/api/synthesize-profile` | Build a structured master profile. |
| POST | `/api/fetch-job-from-url` | Fetch and analyze a job page. |
| POST | `/api/parse-job-document` | Extract a job opportunity from an uploaded document. |
| POST | `/api/match-job` | Compare a profile with a target job. |
| POST | `/api/generate-tailored-resume` | Generate a tailored ATS resume. |
| POST | `/api/analyze-resume` | Analyze an uploaded or supplied resume. |
| POST | `/api/chat-about-resume` | Ask questions about resume content. |
| POST | `/api/regenerate-resume` | Regenerate a resume from selected content. |
| GET / POST | `/api/user/profile` | Read or update a user profile. |
| GET / POST | `/api/user/experiences` | Read or add professional experiences. |
| GET | `/api/db/status` | Inspect database connection status. |

Many user-scoped routes currently use an `x-user-id` header as an identity selector. This is not a substitute for a production-grade authentication and authorization system. Review the API security model before exposing the service to untrusted users.

## Project structure

```text
.
├── public/
│   ├── fonts/                 # Fonts used by PDF generation
│   ├── admin.html             # Administrator configuration UI
│   └── tonconnect-manifest.json
├── server/
│   ├── adminConfig.ts         # Administrator configuration
│   ├── aiService.ts           # AI provider orchestration and resume/job logic
│   ├── db.ts                  # JSON/PostgreSQL persistence
│   ├── telegramBot.ts         # Optional Telegram bot workflows
│   └── tonBilling.ts          # TON order and quota logic
├── src/
│   ├── components/            # React workflow and settings components
│   ├── data/                  # Sample profiles and job descriptions
│   ├── utils/                 # Telegram and PDF utilities
│   ├── App.tsx                # Main application workflow
│   └── types.ts               # Shared TypeScript types
├── data/                      # Local runtime JSON data
├── server.ts                  # Express API and application bootstrap
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## Security, privacy, and production readiness

This project handles highly sensitive information: resumes, contact details, employment history, GitHub activity, and potentially AI-provider credentials. Treat it accordingly.

Before deploying for real users:

- **Replace the current password hashing approach.** The present implementation uses a hard-coded salt with SHA-256. Use a password-hashing algorithm designed for password storage, such as Argon2id or bcrypt, with per-password salts and an appropriate work factor.
- **Implement real authentication and authorization.** Review all routes that trust `x-user-id`; clients must not be able to choose another user's identity or gain administrator privileges by changing a header.
- **Verify TON transactions independently.** The current verification path does not query the TON blockchain and can activate a pass using client-supplied/simulated transaction details. Keep real payment collection disabled until this is replaced and tested.
- **Protect runtime data.** The repository currently contains files under `data/`, and the ignore rules do not exclude all runtime JSON records. Review the tracked `data/user_storage.json` and `data/ton_orders.json` contents, remove any real or sensitive records from Git history as appropriate, and ignore generated user/order data.
- **Protect secrets.** Use a secret manager or deployment secrets, rotate any credential that has ever been committed, and never put provider keys in client-side code.
- **Review AI data handling.** Resume and profile content sent for analysis is processed by the configured AI provider. Check that provider's retention and privacy terms before submitting real personal data.
- **Harden production operations.** Add request validation, rate limiting, secure session/token handling, HTTPS, backups, monitoring, and automated security tests.
- **Review container dependency installation.** Make the Dockerfile install from the same committed lockfile used by the selected package manager.

The repository does not currently include a dedicated automated test suite or a GitHub Actions workflow under `.github/workflows/`. The available `lint` script runs the TypeScript compiler in no-emit mode; it is not a substitute for application and security tests.

## Development and validation

Available scripts from [`package.json`](package.json):

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express server with Vite development middleware. |
| `npm run lint` | Run `tsc --noEmit`. |
| `npm run build` | Build the frontend and bundle the production server. |
| `npm run start` | Start the compiled production server. |
| `npm run preview` | Run Vite's preview server for the built frontend. |
| `npm run clean` | Remove generated build output. |

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

For container changes, also validate the Compose configuration and build the image in an environment with the required external networks and database available.

## Contributing

Issues, bug reports, and pull requests are welcome.

When contributing:

1. Describe the problem and the expected behavior.
2. Keep API request/response contracts aligned across `server.ts`, `src/types.ts`, and the frontend.
3. Avoid committing personal data, runtime storage, secrets, or generated files.
4. Include focused validation steps in the pull request description.

## License

No `LICENSE` file is currently present in this repository. Until a license is added, the project has no explicit open-source reuse or redistribution grant. Please do not assume that public visibility grants permission to copy, modify, or redistribute the code.
