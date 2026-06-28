import { useGameStore } from "@/stores/game.store";

/**
 * Custom hook to retrieve the current game state synchronizing from the Zustand game store.
 */
export function useGameState() {
  const roomCode = useGameStore((s) => s.roomCode);
  const role = useGameStore((s) => s.role);
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const roundTimeLeft = useGameStore((s) => s.roundTimeLeft);
  const myTeam = useGameStore((s) => s.myTeam);
  const availableDecisions = useGameStore((s) => s.availableDecisions);
  const selectedDecision = useGameStore((s) => s.selectedDecision);
  const currentEvent = useGameStore((s) => s.currentEvent);
  const narration = useGameStore((s) => s.narration);
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const allTeams = useGameStore((s) => s.allTeams);
  const leaderboard = useGameStore((s) => s.leaderboard);

  return {
    roomCode,
    role,
    phase,
    currentRound,
    totalRounds,
    roundTimeLeft,
    myTeam,
    availableDecisions,
    selectedDecision,
    currentEvent,
    narration,
    activeQuiz,
    allTeams,
    leaderboard,
  };
}
