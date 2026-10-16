import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { questionsTable } from "./academy";

export const attemptsTable = pgTable("academy_attempts", {
  id: text("id").primaryKey(),
  guestId: text("guest_id").notNull(),
  mode: text("mode").notNull(),
  subjectId: text("subject_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  questionCount: integer("question_count").notNull(),
  timeLimitSeconds: integer("time_limit_seconds"),
  immediateFeedback: boolean("immediate_feedback").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("academy_attempts_guest_status_idx").on(table.guestId, table.status),
]);

export const attemptQuestionsTable = pgTable("academy_attempt_questions", {
  attemptId: text("attempt_id").notNull().references(() => attemptsTable.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  choiceOrder: jsonb("choice_order").$type<string[]>().notNull().default([]),
}, (table) => [
  primaryKey({ columns: [table.attemptId, table.questionId] }),
  uniqueIndex("academy_attempt_questions_order_idx").on(table.attemptId, table.ordinal),
]);

export const answersTable = pgTable("academy_answers", {
  id: text("id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => attemptsTable.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  selectedChoiceIds: text("selected_choice_ids").array().notNull().default([]),
  textAnswer: text("text_answer"),
  flagged: boolean("flagged").notNull().default(false),
  isCorrect: boolean("is_correct"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("academy_answers_attempt_question_idx").on(table.attemptId, table.questionId),
  index("academy_answers_attempt_idx").on(table.attemptId),
]);

export const bookmarksTable = pgTable("academy_bookmarks", {
  guestId: text("guest_id").notNull(),
  questionId: text("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.guestId, table.questionId] }),
]);

export const questionProgressTable = pgTable("academy_question_progress", {
  guestId: text("guest_id").notNull(),
  questionId: text("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  seenCount: integer("seen_count").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  lastWasCorrect: boolean("last_was_correct").notNull().default(false),
  lastAnsweredAt: timestamp("last_answered_at", { withTimezone: true }).notNull().defaultNow(),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.guestId, table.questionId] }),
  index("academy_question_progress_due_idx").on(table.guestId, table.nextReviewAt),
]);

export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({ startedAt: true, completedAt: true });
export const insertAnswerSchema = createInsertSchema(answersTable).omit({ updatedAt: true });
export type Attempt = typeof attemptsTable.$inferSelect;
export type AttemptQuestion = typeof attemptQuestionsTable.$inferSelect;
export type Answer = typeof answersTable.$inferSelect;
export type Bookmark = typeof bookmarksTable.$inferSelect;
export type QuestionProgress = typeof questionProgressTable.$inferSelect;
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
