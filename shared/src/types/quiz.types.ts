export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
  relatedConcept?: string;
}

export interface QuizResultEntry {
  teamId: string;
  teamName: string;
  isCorrect: boolean;
  scoreEarned: number;
  timeTakenMs: number;
}

export interface QuizResultsPayload {
  questionId: string;
  correctAnswer: number;
  explanation: string;
  teamScores: QuizResultEntry[];
}
