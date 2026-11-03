export interface SurveyQuestion {
  id: number;
  description: string;
}
export interface SurveyAnswer {
  questionId: number;
  rating: number | null;
}
export interface CallSurvey {
  questions: SurveyQuestion[];
  answers: SurveyAnswer[];
}
export interface SatisfactionQuestion extends SurveyQuestion {
  used: boolean;
}
export function completeSurvey(
  questions: SurveyQuestion[],
  answers: Partial<Record<number, string>>,
): boolean {
  return (
    questions.length > 0 &&
    questions.every((q) => ["1", "2", "3", "4", "5", "none"].includes(answers[q.id] ?? ""))
  );
}
export function surveyPayload(
  questions: SurveyQuestion[],
  answers: Partial<Record<number, string>>,
): CallSurvey {
  if (!completeSurvey(questions, answers)) throw new Error("Responda todas as perguntas.");
  return {
    questions,
    answers: questions.map((q) => ({
      questionId: q.id,
      rating: answers[q.id] === "none" ? null : Number(answers[q.id]),
    })),
  };
}
