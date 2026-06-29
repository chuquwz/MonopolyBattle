import { create } from "zustand";
import type {
  GamePhase,
  UserRole,
  Decision,
  GameEvent,
  PublicTeamInfo,
  LeaderboardEntry,
} from "@monopoly/shared";

export interface ClientGameState {
  roomCode: string;
  role: UserRole;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  myTeam: {
    id: string;
    name: string;
    money: number;
    marketShare: number;
    technology: number;
    reputation: number;
    monopolyRisk: number;
    totalScore: number;
  } | null;
  availableDecisions: Decision[];
  selectedDecision: string | null;
  currentEvent: GameEvent | null;
  narration: {
    text: string;
    isVisible: boolean;
    type: "info" | "warning" | "education";
    relatedConcept?: string;
  };
  activeQuiz: {
    question: string;
    options: string[];
    timeLimit: number;
    answered: boolean;
  } | null;
  selectedAnswer: number | null;
  hasAnswered: boolean;
  quizResult: {
    correctAnswer: number;
    explanation: string;
    scoreEarned: number;
    isCorrect: boolean;
  } | null;
  allTeams: PublicTeamInfo[];
  leaderboard: LeaderboardEntry[];
}

export interface GameStoreState extends ClientGameState {
  setRoomCode: (roomCode: string) => void;
  setRole: (role: UserRole) => void;
  setPhase: (phase: GamePhase) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (total: number) => void;
  setRoundTimeLeft: (time: number) => void;
  setMyTeam: (myTeam: ClientGameState["myTeam"]) => void;
  setAllTeams: (allTeams: PublicTeamInfo[]) => void;
  setAvailableDecisions: (decisions: Decision[]) => void;
  setSelectedDecision: (decision: string | null) => void;
  setCurrentEvent: (event: GameEvent | null) => void;
  setNarration: (narration: ClientGameState["narration"]) => void;
  setActiveQuiz: (quiz: ClientGameState["activeQuiz"]) => void;
  setSelectedAnswer: (answer: number | null) => void;
  setHasAnswered: (hasAnswered: boolean) => void;
  setQuizResult: (result: ClientGameState["quizResult"]) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  updateMyTeam: (metrics: Partial<NonNullable<ClientGameState["myTeam"]>>) => void;
  updateAllTeams: (teams: Partial<PublicTeamInfo>[]) => void;
  resetGame: () => void;
  syncFullState: (state: Partial<ClientGameState>) => void;
}

const initialGameState: ClientGameState = {
  roomCode: "",
  role: "player",
  phase: "lobby",
  currentRound: 0,
  totalRounds: 8,
  roundTimeLeft: 0,
  myTeam: null,
  availableDecisions: [],
  selectedDecision: null,
  currentEvent: null,
  narration: {
    text: "",
    isVisible: false,
    type: "info",
  },
  activeQuiz: null,
  selectedAnswer: null,
  hasAnswered: false,
  quizResult: null,
  allTeams: [],
  leaderboard: [],
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialGameState,
  setRoomCode: (roomCode) => set({ roomCode }),
  setRole: (role) => set({ role }),
  setPhase: (phase) => set({ phase }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setTotalRounds: (totalRounds) => set({ totalRounds }),
  setRoundTimeLeft: (roundTimeLeft) => set({ roundTimeLeft }),
  setMyTeam: (myTeam) => set({ myTeam }),
  setAllTeams: (allTeams) => set({ allTeams }),
  setAvailableDecisions: (availableDecisions) => set({ availableDecisions }),
  setSelectedDecision: (selectedDecision) => set({ selectedDecision }),
  setCurrentEvent: (currentEvent) => set({ currentEvent }),
  setNarration: (narration) => set({ narration }),
  setActiveQuiz: (activeQuiz) => set({ activeQuiz }),
  setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),
  setHasAnswered: (hasAnswered) => set({ hasAnswered }),
  setQuizResult: (quizResult) => set({ quizResult }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  updateMyTeam: (metrics) =>
    set((state) => ({
      myTeam: state.myTeam ? { ...state.myTeam, ...metrics } : null,
    })),
  updateAllTeams: (teams) =>
    set((state) => ({
      allTeams: state.allTeams.map((t) => {
        const update = teams.find((u) => u.id === t.id);
        return update ? { ...t, ...update } : t;
      }),
    })),
  resetGame: () => set(initialGameState),
  syncFullState: (newState) => set((state) => ({ ...state, ...newState })),
}));
