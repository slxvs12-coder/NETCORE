import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const baseUrl = (process.env.NETCORE_API_URL ?? "http://localhost:80/api").replace(/\/$/, "");
const guestId = `test_${randomUUID()}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function request(path, method = "GET", body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = response.status === 204 ? null : await response.json();
  return { status: response.status, body: json };
}

async function run() {
  const catalog = await request("/academy/catalog");
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.subjects.length, 2);
  assert.ok(catalog.body.subjects.every((subject) => subject.questionCount > 0));

  const config = {
    guestId,
    mode: "topic",
    subjectId: "network-fundamentals",
    topicIds: ["net-ip"],
    difficulty: "mixed",
    questionCount: 2,
    timeLimitSeconds: null,
    immediateFeedback: false,
  };
  const created = await request("/quiz-sessions", "POST", config);
  assert.equal(created.status, 201);
  assert.equal(created.body.questions.length, 2);
  assert.ok(created.body.questions.every((question) => !("correctChoiceIds" in question)));
  const [subnetQuestion, prefixQuestion] = created.body.questions;

  const invalid = await request(`/quiz-sessions/${created.body.id}/answers`, "PUT", {
    guestId,
    questionId: subnetQuestion.id,
    selectedChoiceIds: ["not-a-real-choice"],
    textAnswer: null,
    flagged: false,
  });
  assert.equal(invalid.status, 400);

  const correctChoice = subnetQuestion.id === "net-ip-001" ? "net-ip-001:b" : null;
  const firstAnswer = await request(`/quiz-sessions/${created.body.id}/answers`, "PUT", {
    guestId,
    questionId: subnetQuestion.id,
    selectedChoiceIds: correctChoice ? [correctChoice] : [],
    textAnswer: correctChoice ? null : "24",
    flagged: true,
  });
  assert.equal(firstAnswer.status, 200);
  const secondAnswer = await request(`/quiz-sessions/${created.body.id}/answers`, "PUT", {
    guestId,
    questionId: prefixQuestion.id,
    selectedChoiceIds: prefixQuestion.id === "net-ip-001" ? ["net-ip-001:b"] : [],
    textAnswer: prefixQuestion.id === "net-ip-001" ? null : "24",
    flagged: false,
  });
  assert.equal(secondAnswer.status, 200);

  const restored = await request(`/quiz-sessions/${created.body.id}`);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.answers.length, 2);
  assert.ok(restored.body.answers.some((answer) => answer.flagged));
  assert.ok(restored.body.answers.every((answer) => answer.isCorrect === null));

  const result = await request(`/quiz-sessions/${created.body.id}/submit`, "POST", { guestId });
  assert.equal(result.status, 200);
  assert.equal(result.body.score, 2);
  assert.equal(result.body.total, 2);
  assert.equal(result.body.accuracy, 100);
  assert.ok(result.body.answers.every((answer) => answer.question.explanation.length > 0));
  const completedSession = await request(`/quiz-sessions/${created.body.id}`);
  assert.ok(completedSession.body.answers.every((answer) => answer.feedback?.explanation));

  const dashboard = await request(`/dashboard/${guestId}`);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.completedQuizzes, 1);
  assert.equal(dashboard.body.questionsAnswered, 2);
  assert.equal(dashboard.body.overallAccuracy, 100);
  assert.ok(dashboard.body.difficultyMastery.length > 0);

  const bookmarkedQuestion = result.body.answers[0].question.id;
  const addBookmark = await request(`/bookmarks/${guestId}/${bookmarkedQuestion}`, "PUT");
  assert.equal(addBookmark.status, 200);
  const bookmarks = await request(`/bookmarks/${guestId}`);
  assert.ok(bookmarks.body.some((question) => question.id === bookmarkedQuestion));
  const removeBookmark = await request(`/bookmarks/${guestId}/${bookmarkedQuestion}`, "DELETE");
  assert.equal(removeBookmark.status, 200);

  const missedSession = await request("/quiz-sessions", "POST", { ...config, questionCount: 1 });
  assert.equal(missedSession.status, 201);
  const missedQuestion = missedSession.body.questions[0];
  const wrongAnswer = await request(`/quiz-sessions/${missedSession.body.id}/answers`, "PUT", {
    guestId,
    questionId: missedQuestion.id,
    selectedChoiceIds: missedQuestion.id === "net-ip-001" ? ["net-ip-001:a"] : [],
    textAnswer: missedQuestion.id === "net-ip-001" ? null : "wrong",
    flagged: false,
  });
  assert.equal(wrongAnswer.status, 200);
  const missedResult = await request(`/quiz-sessions/${missedSession.body.id}/submit`, "POST", { guestId });
  assert.equal(missedResult.body.score, 0);
  const reviewQueue = await request(`/review-queue/${guestId}`);
  assert.ok(reviewQueue.body.questions.some((question) => question.id === missedQuestion.id));

  console.log("NetCore API flow passed: catalog, answer validation, save/resume, scoring, explanations, progress, bookmarks, and review.");
}

try {
  await run();
} finally {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM academy_attempts WHERE guest_id = $1", [guestId]);
    await client.query("DELETE FROM academy_bookmarks WHERE guest_id = $1", [guestId]);
    await client.query("DELETE FROM academy_question_progress WHERE guest_id = $1", [guestId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
