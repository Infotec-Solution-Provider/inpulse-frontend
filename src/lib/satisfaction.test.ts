import { describe, it, expect } from "vitest";
import { completeSurvey, surveyPayload } from "./satisfaction";
describe("telephone questionnaire completeness", () => {
  const questions = [
    { id: 1, description: "Primeira" },
    { id: 2, description: "Segunda" },
  ];
  it("does not default unanswered questions to none", () => {
    for (const answers of [{}, { 1: "5" }, { 1: "0", 2: "5" }, { 1: "5", 2: "" }])
      expect(completeSurvey(questions, answers)).toBe(false);
    expect(completeSurvey([], {})).toBe(false);
    expect(() => surveyPayload(questions, { 1: "5" })).toThrow();
  });
  it("distinguishes explicit none from ratings and preserves question identity", () => {
    expect(surveyPayload(questions, { 1: "5", 2: "none" })).toEqual({
      questions,
      answers: [
        { questionId: 1, rating: 5 },
        { questionId: 2, rating: null },
      ],
    });
  });
});
