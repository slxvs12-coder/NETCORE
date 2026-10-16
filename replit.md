# NetCore Academy

A bilingual-in-code, English-language learning platform for computer networking, operating systems, and Linux, with structured lessons, knowledge checks, quizzes, and practical labs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — typecheck workspace packages
- `pnpm run build` — typecheck and build workspace packages
- `pnpm --filter @workspace/api-server run test:logic` — run quiz scoring and review-scheduling unit tests
- `pnpm --filter @workspace/api-server run import:questions` — import or update the question bank, reference sources, and 42 syllabus topics
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; this lesson-content addition does not require a schema change)
- Required environment: `DATABASE_URL` — PostgreSQL connection string

After opening an updated project in Replit, wait for the workspace dependencies and API/database to be ready, then run the question import from the Shell so the 42 topics and 872 question records appear in the existing API catalog. The lesson articles are bundled with the frontend and do not require a separate DB table.

## Stack

- pnpm workspaces, TypeScript, React, Vite
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod
- Frontend routing: Wouter

## Where things live

- `artifacts/netcore-academy/src/pages/lesson.tsx` — lesson page and after-submit knowledge check
- `artifacts/netcore-academy/src/pages/subject.tsx` — topic list with separate Study lesson and Practice topic actions
- `artifacts/netcore-academy/src/App.tsx` — lesson route
- `artifacts/netcore-academy/src/data/lessons.json` — structured English lesson content, examples, activities, glossary, quick checks, and sources
- `artifacts/netcore-academy/src/data/curriculum-order.json` — curated topic sequence for both tracks
- `artifacts/api-server/src/data/seed-questions.json` — source of truth for topics, question bank, question explanations, and references
- `artifacts/api-server/src/scripts/import-question-bank.mjs` — validates and imports the seed into PostgreSQL
- `artifacts/api-server/QUESTION_BANK.md` — topic index, import instructions, and content-review caveats

## Architecture decisions

- Lessons are static structured frontend content; questions and topic counts come from the existing database API.
- Existing topic IDs and all 32 original question records are retained; the seed expands to 42 topics and 872 questions.
- Lesson order is authored explicitly rather than relying on the database's alphabetical topic ordering.
- Knowledge-check answers and explanations appear only after the learner submits all three questions. A low score recommends review but does not block navigation.
- Lesson completion is stored in local browser storage on the current device; quiz attempts continue to use the existing backend data model.
- No database schema change is needed for the lessons page.

## Product

The platform has two ordered but freely navigable learning tracks: Computer Networking (22 topics) and Operating Systems & Linux (20 topics). Each lesson includes learning objectives, prerequisites, concept explanations, examples, a worked example, an activity, common misconceptions, a glossary, reference links, and a 3-question knowledge check. The existing full topic quiz remains available from each topic card and lesson page.

## User preferences

- Lesson language: English only.
- Beginner-friendly but in-depth explanations with examples and practical tasks.
- Balance lesson length according to topic size; split large topics into connected lessons.
- Progressive difficulty from foundations to application and troubleshooting.
- Learners can open any topic and continue regardless of score; recommend review when appropriate.
- Keep the existing overall UI/UX and styling. Add only the lesson links/page needed for the learning flow.
- The question bank is intended to be large from the start. The initial expanded bank is authored as a draft and must not be represented as independently verified yet.

## Gotchas

- Run `pnpm --filter @workspace/api-server run import:questions` after opening the updated code so new topics and questions are present in PostgreSQL. Without the import, lesson content for newly introduced topics exists in the frontend bundle but the API catalog will still show its prior database topics.
- Every seed question remains `verified: false` until a human reviewer checks its answer, explanation, and reference. A linked source is not the same thing as an independent verification.
- Question types supported by this MVP are `multiple_choice`, `multiple_select`, `true_false`, `fill_blank`, and `scenario`.
