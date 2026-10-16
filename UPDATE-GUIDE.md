# NetCore Academy update guide

This package extends the existing NetCore Academy project without replacing its visual design.

## What was added

- 42 ordered lesson pages: 22 Computer Networking topics and 20 Operating Systems/Linux topics.
- 210 lesson sections, with objectives, explanations, reasoning guidance, examples, misconceptions, worked examples, practice activities, a glossary, and further-reading links.
- A 3-question knowledge check on each lesson. Answers and explanations are shown only after the learner submits the full check; low results recommend review without blocking navigation.
- A structured bank of 872 questions across five question types and three difficulty levels.
- A data importer that creates/updates the topic, source and question records in the existing PostgreSQL database.
- Minimal subject-page links to **Study lesson** and **Practice topic**, using the existing design conventions.

## Updating an existing Replit project

1. Back up or export the current Replit project first.
2. Bring the files from this package into the project, preserving any environment secrets and deployment settings. Do not replace or publish your `DATABASE_URL` or other secrets in source files.
3. From the workspace root, install dependencies if Replit asks you to, then run the question-bank importer:

   ```sh
   pnpm --filter @workspace/api-server run import:questions
   ```

4. The command requires the existing `DATABASE_URL` secret. It inserts/updates 42 topics, 22 sources and 872 questions; no database schema migration is included or expected.
5. Start the application using the Replit run workflow you already use, then open both subject pages. The new lesson pages are available from each topic's **Study lesson** link.

The lesson articles are bundled with the frontend, while the subject catalog and question bank are loaded from PostgreSQL. Therefore, importing the question bank is necessary for the new topic links and counts to appear in a previously used database.

## Important content-quality note

The question bank is a large authored draft. All 872 questions intentionally remain marked `verified: false`. A source link is a starting point for checking a claim, not proof that every question and distractor has been independently fact-checked. Review the content before using it as a formal assessment.

## Verification performed for this package

- JSON and content-reference validation passed for all topics, sources, lessons and questions.
- All questions have a source record, unique ID, topic reference, and valid answer structure.
- Existing quiz-logic unit tests passed (5/5).
- The changed TypeScript/TSX files passed syntax transpilation.
- A full Vite build and live PostgreSQL import could not be run in the packaging environment because project dependencies/database credentials were unavailable. Verify those two steps inside Replit after importing.
