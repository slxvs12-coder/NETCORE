import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;
const validSubjects = new Set(["network-fundamentals", "operating-systems"]);
const validTypes = new Set(["multiple_choice", "multiple_select", "true_false", "fill_blank", "scenario"]);
const validDifficulties = new Set(["easy", "medium", "hard"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  if (rows.length < 2) throw new Error("CSV must contain a header and at least one question.");
  const [headers, ...records] = rows;
  return records.map((record, rowIndex) => {
    if (record.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((header, index) => [header.trim(), record[index]]));
  }).map((record, index) => {
    let choices;
    try {
      choices = JSON.parse(record.choices || "[]");
    } catch {
      throw new Error(`CSV row ${index + 2} has invalid JSON in choices.`);
    }
    return {
      id: record.id,
      topicId: record.topicId,
      type: record.type,
      difficulty: record.difficulty,
      prompt: record.prompt,
      explanation: record.explanation,
      objective: record.objective,
      correctText: record.correctText || null,
      sourceId: record.sourceId || null,
      verified: record.verified === "true",
      choices,
    };
  });
}

function validate(data) {
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error("Import must contain at least one question.");
  }
  const topicIds = new Set();
  for (const topic of data.topics ?? []) {
    if (!topic.id || !validSubjects.has(topic.subjectId) || !topic.name || !topic.description) {
      throw new Error(`Invalid topic record: ${JSON.stringify(topic)}`);
    }
    if (topicIds.has(topic.id)) throw new Error(`Duplicate topic id: ${topic.id}`);
    topicIds.add(topic.id);
  }
  const sourceIds = new Set();
  for (const source of data.sources ?? []) {
    if (!source.id || !source.title || !source.publisher || !source.url?.startsWith("https://")) {
      throw new Error(`Invalid source record: ${JSON.stringify(source)}`);
    }
    if (sourceIds.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    sourceIds.add(source.id);
  }
  const questionIds = new Set();
  const prompts = new Set();
  for (const question of data.questions) {
    if (!question.id || !question.topicId || !validTypes.has(question.type) || !validDifficulties.has(question.difficulty)) {
      throw new Error(`Invalid question identity, type, or difficulty: ${JSON.stringify(question)}`);
    }
    if (!question.prompt?.trim() || !question.explanation?.trim() || !question.objective?.trim()) {
      throw new Error(`Question ${question.id} needs a prompt, explanation, and learning objective.`);
    }
    if (questionIds.has(question.id)) throw new Error(`Duplicate question id: ${question.id}`);
    const normalizedPrompt = question.prompt.trim().toLowerCase().replace(/\s+/g, " ");
    if (prompts.has(normalizedPrompt)) throw new Error(`Duplicate question prompt: ${question.id}`);
    questionIds.add(question.id);
    prompts.add(normalizedPrompt);
    if (question.sourceId && !(data.sources ?? []).some((source) => source.id === question.sourceId)) {
      throw new Error(`Question ${question.id} refers to missing source ${question.sourceId}.`);
    }
    if (!Array.isArray(question.choices)) throw new Error(`Question ${question.id} must provide a choices array.`);
    const choiceIds = new Set();
    for (const choice of question.choices) {
      if (!choice.id || !choice.text?.trim() || choiceIds.has(choice.id)) {
        throw new Error(`Question ${question.id} has an invalid or duplicate choice.`);
      }
      choiceIds.add(choice.id);
    }
    const correctCount = question.choices.filter((choice) => choice.isCorrect === true).length;
    if (question.type === "fill_blank") {
      if (question.choices.length !== 0 || !question.correctText?.trim()) {
        throw new Error(`Fill-in question ${question.id} needs correctText and no choices.`);
      }
    } else if (question.choices.length < 2 || correctCount < 1) {
      throw new Error(`Question ${question.id} needs at least two choices and one correct answer.`);
    } else if (question.type !== "multiple_select" && correctCount !== 1) {
      throw new Error(`Question ${question.id} must have exactly one correct choice.`);
    }
  }
  return data;
}

const inputPath = resolve(process.argv[2] ?? "src/data/seed-questions.json");
const raw = await readFile(inputPath, "utf8");
let data;
if (inputPath.endsWith(".csv")) {
  data = { questions: parseCsv(raw) };
} else {
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Question bank must be valid JSON or CSV.");
  }
}
validate(data);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to import questions.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const source of data.sources ?? []) {
    await client.query(
      `INSERT INTO academy_sources (id, title, publisher, url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, publisher = EXCLUDED.publisher, url = EXCLUDED.url`,
      [source.id, source.title, source.publisher, source.url],
    );
  }
  for (const topic of data.topics ?? []) {
    await client.query(
      `INSERT INTO academy_topics (id, subject_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET subject_id = EXCLUDED.subject_id, name = EXCLUDED.name, description = EXCLUDED.description`,
      [topic.id, topic.subjectId, topic.name, topic.description],
    );
  }
  for (const question of data.questions) {
    const topic = await client.query("SELECT id FROM academy_topics WHERE id = $1", [question.topicId]);
    if (topic.rowCount !== 1) throw new Error(`Question ${question.id} refers to unknown topic ${question.topicId}.`);
    await client.query(
      `INSERT INTO academy_questions (id, topic_id, source_id, type, difficulty, prompt, explanation, objective, correct_text, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET topic_id = EXCLUDED.topic_id, source_id = EXCLUDED.source_id, type = EXCLUDED.type,
         difficulty = EXCLUDED.difficulty, prompt = EXCLUDED.prompt, explanation = EXCLUDED.explanation,
         objective = EXCLUDED.objective, correct_text = EXCLUDED.correct_text, verified = EXCLUDED.verified`,
      [question.id, question.topicId, question.sourceId ?? null, question.type, question.difficulty, question.prompt,
        question.explanation, question.objective, question.correctText ?? null, question.verified === true],
    );
    await client.query("DELETE FROM academy_choices WHERE question_id = $1", [question.id]);
    for (const [ordinal, choice] of question.choices.entries()) {
      await client.query(
        "INSERT INTO academy_choices (id, question_id, text, is_correct, ordinal) VALUES ($1, $2, $3, $4, $5)",
        [`${question.id}:${choice.id}`, question.id, choice.text, choice.isCorrect === true, ordinal],
      );
    }
  }
  await client.query("COMMIT");
  console.log(`Imported ${data.questions.length} questions${data.topics ? ` and ${data.topics.length} topics` : ""}.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
