import assert from "node:assert/strict";
import test from "node:test";
import { accuracyPercent, answerIsCorrect, nextReviewAt, normalizeAnswerText, shuffle } from "./quiz-logic.ts";

test("scores single choice answers against the exact correct choice", () => {
  assert.equal(answerIsCorrect({
    type: "multiple_choice",
    correctChoiceIds: ["right"],
    selectedChoiceIds: ["right"],
    correctText: null,
    textAnswer: null,
  }), true);
  assert.equal(answerIsCorrect({
    type: "multiple_choice",
    correctChoiceIds: ["right"],
    selectedChoiceIds: ["wrong"],
    correctText: null,
    textAnswer: null,
  }), false);
});

test("multiple-select scoring requires the full answer set and rejects duplicates", () => {
  const answer = {
    type: "multiple_select" as const,
    correctChoiceIds: ["one", "two"],
    selectedChoiceIds: ["two", "one"],
    correctText: null,
    textAnswer: null,
  };
  assert.equal(answerIsCorrect(answer), true);
  assert.equal(answerIsCorrect({ ...answer, selectedChoiceIds: ["one"] }), false);
  assert.equal(answerIsCorrect({ ...answer, selectedChoiceIds: ["one", "two", "extra"] }), false);
  assert.equal(answerIsCorrect({ ...answer, selectedChoiceIds: ["one", "one", "two"] }), true);
});

test("fill-in comparison ignores case and repeated whitespace but not content", () => {
  assert.equal(normalizeAnswerText("  Network   Layer "), "network layer");
  assert.equal(answerIsCorrect({
    type: "fill_blank",
    correctChoiceIds: [],
    selectedChoiceIds: [],
    correctText: "quantum",
    textAnswer: " QUANTUM ",
  }), true);
  assert.equal(answerIsCorrect({
    type: "fill_blank",
    correctChoiceIds: [],
    selectedChoiceIds: [],
    correctText: "quantum",
    textAnswer: "quanta",
  }), false);
});

test("shuffle preserves every item and uses the supplied random source", () => {
  assert.deepEqual(shuffle(["a", "b", "c"], () => 0), ["b", "c", "a"]);
  const result = shuffle([1, 2, 3, 4], () => 0.5);
  assert.deepEqual([...result].sort(), [1, 2, 3, 4]);
});

test("accuracy and review scheduling handle empty and completed progress", () => {
  assert.equal(accuracyPercent(0, 0), 0);
  assert.equal(accuracyPercent(3, 4), 75);
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(nextReviewAt(false, now).toISOString(), "2026-01-02T00:00:00.000Z");
  assert.equal(nextReviewAt(true, now).toISOString(), "2026-01-04T00:00:00.000Z");
});
