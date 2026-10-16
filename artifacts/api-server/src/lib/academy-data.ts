import { eq, inArray } from "drizzle-orm";
import { db, choicesTable, questionsTable, sourcesTable, topicsTable } from "@workspace/db";
import { answerIsCorrect, type QuestionType } from "./quiz-logic";

export interface FullQuestion {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  type: QuestionType;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  objective: string;
  explanation: string;
  correctChoiceIds: string[];
  correctText: string | null;
  choices: Array<{ id: string; text: string; isCorrect: boolean }>;
  sourceTitle: string | null;
  sourceUrl: string | null;
  verified: boolean;
}

export async function loadQuestions(
  questionIds: string[],
  choiceOrders: Map<string, string[]> = new Map(),
): Promise<FullQuestion[]> {
  if (questionIds.length === 0) return [];
  const rows = await db
    .select({
      question: {
        id: questionsTable.id,
        topicId: questionsTable.topicId,
        type: questionsTable.type,
        difficulty: questionsTable.difficulty,
        prompt: questionsTable.prompt,
        explanation: questionsTable.explanation,
        objective: questionsTable.objective,
        correctText: questionsTable.correctText,
        verified: questionsTable.verified,
      },
      topic: {
        subjectId: topicsTable.subjectId,
        name: topicsTable.name,
      },
      source: {
        title: sourcesTable.title,
        url: sourcesTable.url,
      },
      choice: {
        id: choicesTable.id,
        text: choicesTable.text,
        isCorrect: choicesTable.isCorrect,
      },
    })
    .from(questionsTable)
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .leftJoin(sourcesTable, eq(questionsTable.sourceId, sourcesTable.id))
    .leftJoin(choicesTable, eq(questionsTable.id, choicesTable.questionId))
    .where(inArray(questionsTable.id, questionIds));

  const byId = new Map<string, FullQuestion>();
  for (const row of rows) {
    let question = byId.get(row.question.id);
    if (!question) {
      question = {
        id: row.question.id,
        subjectId: row.topic.subjectId,
        topicId: row.question.topicId,
        topicName: row.topic.name,
        type: row.question.type as QuestionType,
        prompt: row.question.prompt,
        difficulty: row.question.difficulty as FullQuestion["difficulty"],
        objective: row.question.objective,
        explanation: row.question.explanation,
        correctChoiceIds: [],
        correctText: row.question.correctText,
        choices: [],
        sourceTitle: row.source?.title ?? null,
        sourceUrl: row.source?.url ?? null,
        verified: row.question.verified,
      };
      byId.set(question.id, question);
    }
    if (row.choice) {
      question.choices.push({
        id: row.choice.id,
        text: row.choice.text,
        isCorrect: row.choice.isCorrect,
      });
      if (row.choice.isCorrect) question.correctChoiceIds.push(row.choice.id);
    }
  }

  for (const question of byId.values()) {
    const savedOrder = choiceOrders.get(question.id);
    if (!savedOrder) continue;
    const choiceMap = new Map(question.choices.map((choice) => [choice.id, choice]));
    const ordered = savedOrder.map((id) => choiceMap.get(id)).filter((choice) => choice !== undefined);
    question.choices = [...ordered, ...question.choices.filter((choice) => !savedOrder.includes(choice.id))];
  }

  return questionIds.map((id) => byId.get(id)).filter((question) => question !== undefined);
}

export function toPublicQuestion(question: FullQuestion) {
  return {
    id: question.id,
    subjectId: question.subjectId,
    topicId: question.topicId,
    topicName: question.topicName,
    type: question.type,
    prompt: question.prompt,
    difficulty: question.difficulty,
    objective: question.objective,
    choices: question.choices.map(({ id, text }) => ({ id, text })),
    sourceTitle: question.sourceTitle,
    sourceUrl: question.sourceUrl,
    verified: question.verified,
  };
}

export function toReviewedQuestion(question: FullQuestion) {
  return {
    ...toPublicQuestion(question),
    correctChoiceIds: question.correctChoiceIds,
    correctText: question.correctText,
    explanation: question.explanation,
  };
}

export function isQuestionAnswerCorrect(
  question: FullQuestion,
  selectedChoiceIds: string[],
  textAnswer: string | null,
): boolean {
  return answerIsCorrect({
    type: question.type,
    correctChoiceIds: question.correctChoiceIds,
    correctText: question.correctText,
    selectedChoiceIds,
    textAnswer,
  });
}

export function validateQuestionAnswer(
  question: FullQuestion,
  selectedChoiceIds: string[],
  textAnswer: string | null,
): string | null {
  if (selectedChoiceIds.length > 50) return "Too many choices were submitted.";
  if (new Set(selectedChoiceIds).size !== selectedChoiceIds.length) return "Duplicate choices are not allowed.";
  if (question.type === "fill_blank") {
    if (selectedChoiceIds.length > 0) return "This question expects a text answer.";
    if (textAnswer !== null && textAnswer.length > 1000) return "Text answers must be 1,000 characters or fewer.";
    return null;
  }
  if (textAnswer !== null && textAnswer.trim() !== "") return "This question expects choice selections.";
  const available = new Set(question.choices.map((choice) => choice.id));
  if (selectedChoiceIds.some((id) => !available.has(id))) return "One or more selected choices are not part of this question.";
  if (question.type !== "multiple_select" && selectedChoiceIds.length > 1) {
    return "Select only one answer for this question.";
  }
  return null;
}
