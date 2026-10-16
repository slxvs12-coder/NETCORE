export type QuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "fill_blank"
  | "scenario";

export interface AnswerValue {
  type: QuestionType;
  correctChoiceIds: string[];
  correctText: string | null;
  selectedChoiceIds: string[];
  textAnswer: string | null;
}

export function normalizeAnswerText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function answerIsCorrect(answer: AnswerValue): boolean {
  if (answer.type === "fill_blank") {
    const correctText = answer.correctText;
    const textAnswer = answer.textAnswer;
    return correctText !== null
      && textAnswer !== null
      && normalizeAnswerText(correctText) === normalizeAnswerText(textAnswer);
  }
  const selected = [...new Set(answer.selectedChoiceIds)].sort();
  const correct = [...new Set(answer.correctChoiceIds)].sort();
  return selected.length > 0
    && selected.length === correct.length
    && selected.every((id, index) => id === correct[index]);
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function accuracyPercent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function nextReviewAt(isCorrect: boolean, from = new Date()): Date {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + (isCorrect ? 3 : 1));
  return due;
}
