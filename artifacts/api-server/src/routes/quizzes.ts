import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lte, or, type SQL } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateQuizSessionBody,
  CreateQuizSessionResponse,
  GetQuizSessionParams,
  GetQuizSessionResponse,
  SaveQuizAnswerBody,
  SaveQuizAnswerParams,
  SaveQuizAnswerResponse,
  SubmitQuizSessionBody,
  SubmitQuizSessionParams,
  SubmitQuizSessionResponse,
} from "@workspace/api-zod";
import {
  db,
  answersTable,
  attemptQuestionsTable,
  attemptsTable,
  choicesTable,
  questionProgressTable,
  questionsTable,
  topicsTable,
} from "@workspace/db";
import {
  isQuestionAnswerCorrect,
  loadQuestions,
  toPublicQuestion,
  toReviewedQuestion,
  validateQuestionAnswer,
} from "../lib/academy-data";
import { accuracyPercent, nextReviewAt, shuffle } from "../lib/quiz-logic";

const router: IRouter = Router();
const guestIdPattern = /^[a-zA-Z0-9_-]{8,100}$/;

function hasAnswer(type: string, selectedChoiceIds: string[], textAnswer: string | null): boolean {
  return type === "fill_blank" ? Boolean(textAnswer?.trim()) : selectedChoiceIds.length > 0;
}

async function getSessionPayload(sessionId: string) {
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, sessionId)).limit(1);
  if (!attempt) return null;

  const orderedQuestions = await db
    .select({
      questionId: attemptQuestionsTable.questionId,
      choiceOrder: attemptQuestionsTable.choiceOrder,
    })
    .from(attemptQuestionsTable)
    .where(eq(attemptQuestionsTable.attemptId, sessionId))
    .orderBy(asc(attemptQuestionsTable.ordinal));
  const choiceOrders = new Map(orderedQuestions.map((item) => [item.questionId, item.choiceOrder]));
  const questions = await loadQuestions(orderedQuestions.map((item) => item.questionId), choiceOrders);
  const answerRows = await db.select().from(answersTable).where(eq(answersTable.attemptId, sessionId));
  const answersByQuestion = new Map(answerRows.map((answer) => [answer.questionId, answer]));
  const answers = questions.map((question) => {
    const answer = answersByQuestion.get(question.id);
    const selectedChoiceIds = answer?.selectedChoiceIds ?? [];
    const textAnswer = answer?.textAnswer ?? null;
    const reveal = attempt.status === "completed" || attempt.immediateFeedback;
    const isCorrect = reveal && answer?.isCorrect != null ? answer.isCorrect : null;
    return {
      questionId: question.id,
      selectedChoiceIds,
      textAnswer,
      flagged: answer?.flagged ?? false,
      isCorrect,
      feedback: reveal && answer && (attempt.status === "completed" || hasAnswer(question.type, selectedChoiceIds, textAnswer))
        ? {
            correctChoiceIds: question.correctChoiceIds,
            correctText: question.correctText,
            explanation: question.explanation,
            isCorrect: answer.isCorrect ?? isQuestionAnswerCorrect(question, selectedChoiceIds, textAnswer),
          }
        : null,
    };
  });

  return {
    id: attempt.id,
    guestId: attempt.guestId,
    mode: attempt.mode,
    subjectId: attempt.subjectId,
    status: attempt.status as "in_progress" | "completed",
    questionCount: attempt.questionCount,
    timeLimitSeconds: attempt.timeLimitSeconds,
    immediateFeedback: attempt.immediateFeedback,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    questions: questions.map(toPublicQuestion),
    answers,
  };
}

async function getResultPayload(sessionId: string) {
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, sessionId)).limit(1);
  if (!attempt || attempt.status !== "completed" || !attempt.completedAt) return null;
  const orderedQuestions = await db
    .select({
      questionId: attemptQuestionsTable.questionId,
      choiceOrder: attemptQuestionsTable.choiceOrder,
    })
    .from(attemptQuestionsTable)
    .where(eq(attemptQuestionsTable.attemptId, sessionId))
    .orderBy(asc(attemptQuestionsTable.ordinal));
  const choiceOrders = new Map(orderedQuestions.map((item) => [item.questionId, item.choiceOrder]));
  const questions = await loadQuestions(orderedQuestions.map((item) => item.questionId), choiceOrders);
  const answerRows = await db.select().from(answersTable).where(eq(answersTable.attemptId, sessionId));
  const answerMap = new Map(answerRows.map((answer) => [answer.questionId, answer]));
  const answers = questions.map((question) => {
    const answer = answerMap.get(question.id);
    const selectedChoiceIds = answer?.selectedChoiceIds ?? [];
    const textAnswer = answer?.textAnswer ?? null;
    return {
      question: toReviewedQuestion(question),
      selectedChoiceIds,
      textAnswer,
      flagged: answer?.flagged ?? false,
      isCorrect: answer?.isCorrect ?? false,
    };
  });
  const score = answers.filter((answer) => answer.isCorrect).length;
  return {
    sessionId: attempt.id,
    subjectId: attempt.subjectId,
    mode: attempt.mode,
    score,
    total: answers.length,
    accuracy: accuracyPercent(score, answers.length),
    completedAt: attempt.completedAt,
    answers,
  };
}

router.post("/quiz-sessions", async (req, res): Promise<void> => {
  const parsed = CreateQuizSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  if (!guestIdPattern.test(input.guestId)) {
    res.status(400).json({ error: "Guest ID must use 8–100 letters, numbers, underscores, or hyphens." });
    return;
  }

  const filters: SQL[] = [eq(topicsTable.subjectId, input.subjectId)];
  if (input.topicIds.length > 0) filters.push(inArray(questionsTable.topicId, input.topicIds));
  if (input.difficulty !== "mixed") filters.push(eq(questionsTable.difficulty, input.difficulty));

  let eligibleIds: string[];
  if (input.mode === "review") {
    const missed = await db
      .select({ questionId: questionProgressTable.questionId })
      .from(questionProgressTable)
      .where(and(
        eq(questionProgressTable.guestId, input.guestId),
        or(eq(questionProgressTable.lastWasCorrect, false), lte(questionProgressTable.nextReviewAt, new Date())),
      ));
    const missedIds = missed.map((item) => item.questionId);
    if (missedIds.length === 0) {
      res.status(400).json({ error: "There are no questions due for review yet." });
      return;
    }
    filters.push(inArray(questionsTable.id, missedIds));
    const eligible = await db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
      .where(and(...filters));
    eligibleIds = eligible.map((item) => item.id);
  } else {
    const eligible = await db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
      .where(and(...filters));
    eligibleIds = eligible.map((item) => item.id);
  }

  const allEligibleQuestions = await loadQuestions(eligibleIds);
  const selectedQuestions = shuffle(allEligibleQuestions).slice(0, input.questionCount);
  if (selectedQuestions.length === 0) {
    res.status(400).json({ error: "No questions match those filters. Choose another topic or difficulty." });
    return;
  }

  const sessionId = randomUUID();
  const createdAt = new Date();
  const questionCount = selectedQuestions.length;
  await db.transaction(async (tx) => {
    await tx.insert(attemptsTable).values({
      id: sessionId,
      guestId: input.guestId,
      mode: input.mode,
      subjectId: input.subjectId,
      status: "in_progress",
      questionCount,
      timeLimitSeconds: input.timeLimitSeconds,
      immediateFeedback: input.immediateFeedback,
      startedAt: createdAt,
    });
    await tx.insert(attemptQuestionsTable).values(selectedQuestions.map((question, ordinal) => ({
      attemptId: sessionId,
      questionId: question.id,
      ordinal,
      choiceOrder: shuffle(question.choices.map((choice) => choice.id)),
    })));
  });

  const payload = await getSessionPayload(sessionId);
  if (!payload) {
    res.status(500).json({ error: "The quiz was created but could not be loaded." });
    return;
  }
  res.status(201).json(CreateQuizSessionResponse.parse(payload));
});

router.get("/quiz-sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetQuizSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const payload = await getSessionPayload(params.data.sessionId);
  if (!payload) {
    res.status(404).json({ error: "Quiz session not found." });
    return;
  }
  res.json(GetQuizSessionResponse.parse(payload));
});

router.put("/quiz-sessions/:sessionId/answers", async (req, res): Promise<void> => {
  const params = SaveQuizAnswerParams.safeParse(req.params);
  const parsed = SaveQuizAnswerBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.error?.message ?? "Invalid answer body.",
    });
    return;
  }
  const input = parsed.data;
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.sessionId)).limit(1);
  if (!attempt || attempt.guestId !== input.guestId) {
    res.status(404).json({ error: "Quiz session not found." });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(409).json({ error: "This quiz has already been submitted." });
    return;
  }
  const [inSession] = await db
    .select({ questionId: attemptQuestionsTable.questionId })
    .from(attemptQuestionsTable)
    .where(and(
      eq(attemptQuestionsTable.attemptId, attempt.id),
      eq(attemptQuestionsTable.questionId, input.questionId),
    ))
    .limit(1);
  if (!inSession) {
    res.status(400).json({ error: "That question is not part of this quiz." });
    return;
  }
  const [question] = await loadQuestions([input.questionId]);
  if (!question) {
    res.status(404).json({ error: "Question not found." });
    return;
  }
  const invalidAnswer = validateQuestionAnswer(question, input.selectedChoiceIds, input.textAnswer);
  if (invalidAnswer) {
    res.status(400).json({ error: invalidAnswer });
    return;
  }
  const answered = hasAnswer(question.type, input.selectedChoiceIds, input.textAnswer);
  const correct = answered
    ? isQuestionAnswerCorrect(question, input.selectedChoiceIds, input.textAnswer)
    : null;
  const [saved] = await db
    .insert(answersTable)
    .values({
      id: randomUUID(),
      attemptId: attempt.id,
      questionId: question.id,
      selectedChoiceIds: input.selectedChoiceIds,
      textAnswer: input.textAnswer,
      flagged: input.flagged,
      isCorrect: attempt.immediateFeedback ? correct : null,
    })
    .onConflictDoUpdate({
      target: [answersTable.attemptId, answersTable.questionId],
      set: {
        selectedChoiceIds: input.selectedChoiceIds,
        textAnswer: input.textAnswer,
        flagged: input.flagged,
        isCorrect: attempt.immediateFeedback ? correct : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const response = {
    questionId: saved.questionId,
    selectedChoiceIds: saved.selectedChoiceIds,
    textAnswer: saved.textAnswer,
    flagged: saved.flagged,
    isCorrect: attempt.immediateFeedback ? correct : null,
    feedback: attempt.immediateFeedback && answered
      ? {
          correctChoiceIds: question.correctChoiceIds,
          correctText: question.correctText,
          explanation: question.explanation,
          isCorrect: correct ?? false,
        }
      : null,
  };
  res.json(SaveQuizAnswerResponse.parse(response));
});

router.post("/quiz-sessions/:sessionId/submit", async (req, res): Promise<void> => {
  const params = SubmitQuizSessionParams.safeParse(req.params);
  const parsed = SubmitQuizSessionBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : parsed.error?.message ?? "Invalid submit body.",
    });
    return;
  }
  const sessionId = params.data.sessionId;
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, sessionId)).limit(1);
  if (!attempt || attempt.guestId !== parsed.data.guestId) {
    res.status(404).json({ error: "Quiz session not found." });
    return;
  }
  if (attempt.status === "in_progress") {
    const orderedQuestions = await db
      .select({ questionId: attemptQuestionsTable.questionId })
      .from(attemptQuestionsTable)
      .where(eq(attemptQuestionsTable.attemptId, sessionId))
      .orderBy(asc(attemptQuestionsTable.ordinal));
    const questionIds = orderedQuestions.map((item) => item.questionId);
    const questions = await loadQuestions(questionIds);
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    const existingAnswers = await db.select().from(answersTable).where(eq(answersTable.attemptId, sessionId));
    const answerMap = new Map(existingAnswers.map((answer) => [answer.questionId, answer]));
    const completedAt = new Date();

    await db.transaction(async (tx) => {
      for (const questionId of questionIds) {
        const question = questionMap.get(questionId);
        if (!question) continue;
        const answer = answerMap.get(questionId);
        const selectedChoiceIds = answer?.selectedChoiceIds ?? [];
        const textAnswer = answer?.textAnswer ?? null;
        const correct = isQuestionAnswerCorrect(question, selectedChoiceIds, textAnswer);
        if (answer) {
          await tx.update(answersTable)
            .set({ isCorrect: correct, updatedAt: completedAt })
            .where(eq(answersTable.id, answer.id));
        } else {
          await tx.insert(answersTable).values({
            id: randomUUID(),
            attemptId: sessionId,
            questionId,
            selectedChoiceIds: [],
            textAnswer: null,
            flagged: false,
            isCorrect: correct,
            updatedAt: completedAt,
          });
        }

        const [progress] = await tx.select()
          .from(questionProgressTable)
          .where(and(
            eq(questionProgressTable.guestId, attempt.guestId),
            eq(questionProgressTable.questionId, questionId),
          ))
          .limit(1);
        const reviewAt = nextReviewAt(correct, completedAt);
        if (progress) {
          await tx.update(questionProgressTable)
            .set({
              seenCount: progress.seenCount + 1,
              correctCount: progress.correctCount + Number(correct),
              lastWasCorrect: correct,
              lastAnsweredAt: completedAt,
              nextReviewAt: reviewAt,
            })
            .where(and(
              eq(questionProgressTable.guestId, attempt.guestId),
              eq(questionProgressTable.questionId, questionId),
            ));
        } else {
          await tx.insert(questionProgressTable).values({
            guestId: attempt.guestId,
            questionId,
            seenCount: 1,
            correctCount: Number(correct),
            lastWasCorrect: correct,
            lastAnsweredAt: completedAt,
            nextReviewAt: reviewAt,
          });
        }
      }
      await tx.update(attemptsTable)
        .set({ status: "completed", completedAt })
        .where(eq(attemptsTable.id, sessionId));
    });
  }

  const result = await getResultPayload(sessionId);
  if (!result) {
    res.status(500).json({ error: "Quiz result could not be generated." });
    return;
  }
  res.json(SubmitQuizSessionResponse.parse(result));
});

export default router;
