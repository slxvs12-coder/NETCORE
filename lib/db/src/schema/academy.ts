import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const topicsTable = pgTable("academy_topics", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const sourcesTable = pgTable("academy_sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
});

export const questionsTable = pgTable("academy_questions", {
  id: text("id").primaryKey(),
  topicId: text("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  sourceId: text("source_id").references(() => sourcesTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  difficulty: text("difficulty").notNull(),
  prompt: text("prompt").notNull(),
  explanation: text("explanation").notNull(),
  objective: text("objective").notNull(),
  correctText: text("correct_text"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("academy_questions_topic_idx").on(table.topicId),
  index("academy_questions_difficulty_idx").on(table.difficulty),
]);

export const choicesTable = pgTable("academy_choices", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  ordinal: integer("ordinal").notNull(),
}, (table) => [
  index("academy_choices_question_idx").on(table.questionId),
]);

export const insertTopicSchema = createInsertSchema(topicsTable);
export const insertSourceSchema = createInsertSchema(sourcesTable).omit({ checkedAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ createdAt: true });
export const insertChoiceSchema = createInsertSchema(choicesTable);
export type Topic = typeof topicsTable.$inferSelect;
export type Source = typeof sourcesTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type QuestionChoice = typeof choicesTable.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertChoice = z.infer<typeof insertChoiceSchema>;
