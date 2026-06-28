import { LeaderboardEntry } from '@monopoly/shared';

export interface InMemoryTeamState {
  id: string;
  name: string;
  teamNumber: number;
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
  status: string;
  totalScore?: number;
}

export interface ScoreBreakdown {
  moneyScore: number;
  marketShareScore: number;
  technologyScore: number;
  reputationScore: number;
  monopolyPenalty: number;
  bonusPoints: number;
  totalRoundScore: number;
}

// Configurable weights and thresholds to avoid magic numbers
export const SCORING_WEIGHTS = {
  MONEY_WEIGHT: 0.001,             // money / 1000
  MARKET_SHARE_WEIGHT: 2.0,        // market_share * 2
  TECHNOLOGY_WEIGHT: 0.5,          // technology * 0.5
  REPUTATION_WEIGHT: 0.5,          // reputation * 0.5

  MONOPOLY_PENALTY_THRESHOLD: 50,  // penalty triggers if risk > 50
  MONOPOLY_PENALTY_WEIGHT: 0.2,    // penalty = (risk - threshold) * weight

  BONUS_TECH_LOW_THRESHOLD: 30,
  BONUS_TECH_SCORE: 10,

  BONUS_CRISIS_PRICE_REDUCE_SCORE: 8,

  PENALTY_LOBBY_REPUTATION_THRESHOLD: 30,
  PENALTY_LOBBY_REPUTATION_SCORE: -5,
} as const;

/**
 * Calculates a team's score details for the current round based on final stats and decision.
 */
export function calculateRoundScore(
  team: InMemoryTeamState,
  decisionType: string | null,
  context: { roundNumber: number; activeEvent: { type: string } | null }
): ScoreBreakdown {
  const moneyScore = team.money * SCORING_WEIGHTS.MONEY_WEIGHT;
  const marketShareScore = team.marketShare * SCORING_WEIGHTS.MARKET_SHARE_WEIGHT;
  const technologyScore = team.technology * SCORING_WEIGHTS.TECHNOLOGY_WEIGHT;
  const reputationScore = team.reputation * SCORING_WEIGHTS.REPUTATION_WEIGHT;

  // Monopoly Penalty
  let monopolyPenalty = 0;
  if (team.monopolyRisk > SCORING_WEIGHTS.MONOPOLY_PENALTY_THRESHOLD) {
    monopolyPenalty = (team.monopolyRisk - SCORING_WEIGHTS.MONOPOLY_PENALTY_THRESHOLD) * SCORING_WEIGHTS.MONOPOLY_PENALTY_WEIGHT;
  }

  // Bonus Points (Decision Quality Score)
  let bonusPoints = 0;
  if (decisionType === 'invest_tech' && team.technology < SCORING_WEIGHTS.BONUS_TECH_LOW_THRESHOLD) {
    bonusPoints += SCORING_WEIGHTS.BONUS_TECH_SCORE;
  }
  if (decisionType === 'reduce_prices' && context.activeEvent?.type === 'crisis') {
    bonusPoints += SCORING_WEIGHTS.BONUS_CRISIS_PRICE_REDUCE_SCORE;
  }
  if (decisionType === 'lobby' && team.reputation < SCORING_WEIGHTS.PENALTY_LOBBY_REPUTATION_THRESHOLD) {
    bonusPoints += SCORING_WEIGHTS.PENALTY_LOBBY_REPUTATION_SCORE;
  }

  // Round Business Score
  const businessScore = moneyScore + marketShareScore + technologyScore + reputationScore;

  // Round Total (Business Score + Decision Quality Bonuses - Monopoly Penalty)
  const totalRoundScore = Math.round(businessScore + bonusPoints - monopolyPenalty);

  return {
    moneyScore: Number(moneyScore.toFixed(2)),
    marketShareScore: Number(marketShareScore.toFixed(2)),
    technologyScore: Number(technologyScore.toFixed(2)),
    reputationScore: Number(reputationScore.toFixed(2)),
    monopolyPenalty: Number(monopolyPenalty.toFixed(2)),
    bonusPoints,
    totalRoundScore,
  };
}

/**
 * Ranks all active teams by totalScore and computes rank changes comparing against the previous round.
 */
export function calculateLeaderboard(
  teams: InMemoryTeamState[],
  prevLeaderboard?: LeaderboardEntry[]
): LeaderboardEntry[] {
  // Sort teams descending by totalScore, then marketShare descending, then teamNumber ascending (tie-breakers)
  const sortedTeams = [...teams].sort((a, b) => {
    const scoreA = a.totalScore ?? 0;
    const scoreB = b.totalScore ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    if (b.marketShare !== a.marketShare) {
      return b.marketShare - a.marketShare;
    }
    return a.teamNumber - b.teamNumber;
  });

  return sortedTeams.map((team, idx) => {
    const rank = idx + 1;
    let rankChange: 'up' | 'down' | 'same' = 'same';

    if (prevLeaderboard) {
      const prevEntry = prevLeaderboard.find((entry) => entry.teamId === team.id);
      if (prevEntry) {
        if (rank < prevEntry.rank) {
          rankChange = 'up';
        } else if (rank > prevEntry.rank) {
          rankChange = 'down';
        }
      }
    }

    return {
      rank,
      teamId: team.id,
      teamName: team.name,
      teamNumber: team.teamNumber,
      totalScore: team.totalScore ?? 0,
      marketShare: team.marketShare,
      monopolyRisk: team.monopolyRisk,
      rankChange,
    };
  });
}

/**
 * Wrapper for final standings generation.
 */
export function calculateFinalRanking(teams: InMemoryTeamState[]): LeaderboardEntry[] {
  return calculateLeaderboard(teams);
}
