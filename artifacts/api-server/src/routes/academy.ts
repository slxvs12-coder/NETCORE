import { and, asc, count, desc, eq, lte, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AddBookmarkParams,
  AddBookmarkResponse,
  GetAcademyCatalogResponse,
  GetBookmarksParams,
  GetBookmarksResponse,
  GetDashboardParams,
  GetDashboardResponse,
  GetReviewQueueParams,
  GetReviewQueueResponse,
  RemoveBookmarkParams,
  RemoveBookmarkResponse,
} from "@workspace/api-zod";
import {
  db,
  attemptsTable,
  bookmarksTable,
  questionProgressTable,
  questionsTable,
  topicsTable,
  answersTable,
} from "@workspace/db";
import { loadQuestions, toPublicQuestion, toReviewedQuestion } from "../lib/academy-data";
import { accuracyPercent } from "../lib/quiz-logic";

const router: IRouter = Router();
const guestIdPattern = /^[a-zA-Z0-9_-]{8,100}$/;
const subjects = [
  {
    id: "network-fundamentals",
    name: "Network Fundamentals",
    description: "Build a practical foundation in networking, addressing, services, and troubleshooting.",
  },
  {
    id: "operating-systems",
    name: "Operating Systems",
    description: "Understand processes, memory, storage, devices, Linux, and the kernel.",
  },
];

router.get("/academy/catalog", async (_req, res): Promise<void> => {
  const topicRows = await db
    .select({
      id: topicsTable.id,
      subjectId: topicsTable.subjectId,
      name: topicsTable.name,
      description: topicsTable.description,
      questionCount: count(questionsTable.id),
    })
    .from(topicsTable)
    .leftJoin(questionsTable, eq(topicsTable.id, questionsTable.topicId))
    .groupBy(topicsTable.id)
    .orderBy(asc(topicsTable.subjectId), asc(topicsTable.name));
  const subjectRows = subjects.map((subject) => ({
    ...subject,
    questionCount: topicRows
      .filter((topic) => topic.subjectId === subject.id)
      .reduce((total, topic) => total + topic.questionCount, 0),
  }));
  res.json(GetAcademyCatalogResponse.parse({ subjects: subjectRows, topics: topicRows }));
});

router.get("/dashboard/:guestId", async (req, res): Promise<void> => {
  const params = GetDashboardParams.safeParse(req.params);
  if (!params.success || !guestIdPattern.test(params.data.guestId)) {
    res.status(400).json({ error: params.success ? "Invalid guest ID." : params.error.message });
    return;
  }
  const guestId = params.data.guestId;
  const rows = await db
    .select({
      attemptId: attemptsTable.id,
      subjectId: attemptsTable.subjectId,
      mode: attemptsTable.mode,
      completedAt: attemptsTable.completedAt,
      questionId: questionsTable.id,
      topicId: topicsTable.id,
      topicName: topicsTable.name,
      difficulty: questionsTable.difficulty,
      isCorrect: answersTable.isCorrect,
    })
    .from(attemptsTable)
    .innerJoin(answersTable, eq(attemptsTable.id, answersTable.attemptId))
    .innerJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .where(and(eq(attemptsTable.guestId, guestId), eq(attemptsTable.status, "completed")))
    .orderBy(desc(attemptsTable.completedAt));

  const topicCounts = new Map<string, { topicId: string; topicName: string; subjectId: string; attempted: number; correct: number }>();
  const difficultyCounts = new Map<string, { attempted: number; correct: number }>();
  const attemptCounts = new Map<string, { id: string; subjectId: string; mode: string; completedAt: Date; total: number; score: number }>();
  let correctTotal = 0;
  for (const row of rows) {
    const isCorrect = row.isCorrect === true;
    correctTotal += Number(isCorrect);
    const topic = topicCounts.get(row.topicId) ?? {
      topicId: row.topicId,
      topicName: row.topicName,
      subjectId: row.subjectId,
      attempted: 0,
      correct: 0,
    };
    topic.attempted += 1;
    topic.correct += Number(isCorrect);
    topicCounts.set(row.topicId, topic);

    const difficulty = difficultyCounts.get(row.difficulty) ?? { attempted: 0, correct: 0 };
    difficulty.attempted += 1;
    difficulty.correct += Number(isCorrect);
    difficultyCounts.set(row.difficulty, difficulty);

    const attempt = attemptCounts.get(row.attemptId) ?? {
      id: row.attemptId,
      subjectId: row.subjectId,
      mode: row.mode,
      completedAt: row.completedAt ?? new Date(0),
      total: 0,
      score: 0,
    };
    attempt.total += 1;
    attempt.score += Number(isCorrect);
    attemptCounts.set(row.attemptId, attempt);
  }

  const bookmarkRows = await db
    .select({ questionId: bookmarksTable.questionId })
    .from(bookmarksTable)
    .where(eq(bookmarksTable.guestId, guestId));
  const dueRows = await db
    .select({ questionId: questionProgressTable.questionId })
    .from(questionProgressTable)
    .where(and(
      eq(questionProgressTable.guestId, guestId),
      or(eq(questionProgressTable.lastWasCorrect, false), lte(questionProgressTable.nextReviewAt, new Date())),
    ));
  const topicMastery = [...topicCounts.values()]
    .map((topic) => ({ ...topic, accuracy: accuracyPercent(topic.correct, topic.attempted) }))
    .sort((a, b) => b.attempted - a.attempted);
  const difficultyMastery = [...difficultyCounts.entries()]
    .map(([difficulty, values]) => ({
      difficulty: difficulty as "easy" | "medium" | "hard",
      ...values,
      accuracy: accuracyPercent(values.correct, values.attempted),
    }))
    .sort((a, b) => ["easy", "medium", "hard"].indexOf(a.difficulty) - ["easy", "medium", "hard"].indexOf(b.difficulty));
  const recentAttempts = [...attemptCounts.values()]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 5)
    .map((attempt) => ({
      ...attempt,
      accuracy: accuracyPercent(attempt.score, attempt.total),
    }));

  const response = {
    completedQuizzes: attemptCounts.size,
    questionsAnswered: rows.length,
    overallAccuracy: accuracyPercent(correctTotal, rows.length),
    bookmarkedCount: bookmarkRows.length,
    dueReviewCount: dueRows.length,
    topicMastery,
    difficultyMastery,
    weakAreas: topicMastery.filter((topic) => topic.attempted > 0 && topic.accuracy < 70).slice(0, 5),
    recentAttempts,
  };
  res.json(GetDashboardResponse.parse(response));
});

router.get("/review-queue/:guestId", async (req, res): Promise<void> => {
  const params = GetReviewQueueParams.safeParse(req.params);
  if (!params.success || !guestIdPattern.test(params.data.guestId)) {
    res.status(400).json({ error: params.success ? "Invalid guest ID." : params.error.message });
    return;
  }
  const due = await db
    .select({ questionId: questionProgressTable.questionId })
    .from(questionProgressTable)
    .where(and(
      eq(questionProgressTable.guestId, params.data.guestId),
      or(eq(questionProgressTable.lastWasCorrect, false), lte(questionProgressTable.nextReviewAt, new Date())),
    ))
    .orderBy(asc(questionProgressTable.nextReviewAt))
    .limit(50);
  const questions = await loadQuestions(due.map((item) => item.questionId));
  res.json(GetReviewQueueResponse.parse({ questions: questions.map(toReviewedQuestion) }));
});

router.get("/bookmarks/:guestId", async (req, res): Promise<void> => {
  const params = GetBookmarksParams.safeParse(req.params);
  if (!params.success || !guestIdPattern.test(params.data.guestId)) {
    res.status(400).json({ error: params.success ? "Invalid guest ID." : params.error.message });
    return;
  }
  const saved = await db
    .select({ questionId: bookmarksTable.questionId })
    .from(bookmarksTable)
    .where(eq(bookmarksTable.guestId, params.data.guestId))
    .orderBy(desc(bookmarksTable.createdAt));
  const questions = await loadQuestions(saved.map((item) => item.questionId));
  res.json(GetBookmarksResponse.parse(questions.map(toPublicQuestion)));
});

router.put("/bookmarks/:guestId/:questionId", async (req, res): Promise<void> => {
  const params = AddBookmarkParams.safeParse(req.params);
  if (!params.success || !guestIdPattern.test(params.data.guestId)) {
    res.status(400).json({ error: params.success ? "Invalid guest ID." : params.error.message });
    return;
  }
  const [question] = await db
    .select({ id: questionsTable.id })
    .from(questionsTable)
    .where(eq(questionsTable.id, params.data.questionId))
    .limit(1);
  if (!question) {
    res.status(404).json({ error: "Question not found." });
    return;
  }
  await db.insert(bookmarksTable)
    .values({ guestId: params.data.guestId, questionId: question.id })
    .onConflictDoNothing();
  res.json(AddBookmarkResponse.parse({ questionId: question.id, bookmarked: true }));
});

router.delete("/bookmarks/:guestId/:questionId", async (req, res): Promise<void> => {
  const params = RemoveBookmarkParams.safeParse(req.params);
  if (!params.success || !guestIdPattern.test(params.data.guestId)) {
    res.status(400).json({ error: params.success ? "Invalid guest ID." : params.error.message });
    return;
  }
  await db.delete(bookmarksTable).where(and(
    eq(bookmarksTable.guestId, params.data.guestId),
    eq(bookmarksTable.questionId, params.data.questionId),
  ));
  res.json(RemoveBookmarkResponse.parse({ questionId: params.data.questionId, bookmarked: false }));
});

export default router;
