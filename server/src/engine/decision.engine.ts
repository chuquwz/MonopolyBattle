import { Decision } from '@monopoly/shared';
import { SeededRNG } from '../utils/random.js';

export interface StatsDelta {
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
}

export interface TeamMetricsInput {
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
}

export interface GameContextInput {
  roundNumber: number;
  activeEvent?: { type: string } | null;
}

export const DECISION_TYPES = {
  INVEST_TECH: 'invest_tech',
  ACQUIRE: 'acquire',
  MERGE: 'merge',
  REDUCE_PRICES: 'reduce_prices',
  EXPAND_FACTORIES: 'expand_factories',
  ACCEPT_GOV_SUPPORT: 'accept_gov_support',
  LOBBY_GOVERNMENT: 'lobby',
  EXPORT: 'export',
  RAISE_PRICES: 'raise_prices',
} as const;

export type DecisionType = typeof DECISION_TYPES[keyof typeof DECISION_TYPES];

export interface DecisionEffect {
  nameVi: string;
  descriptionVi: string;
  cost: number;
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
}

// Reusable effects table containing base metrics for all 9 decision types
export const BASE_EFFECTS: Record<DecisionType, DecisionEffect> = {
  [DECISION_TYPES.INVEST_TECH]: {
    nameVi: 'Đầu tư công nghệ',
    descriptionVi: 'Đầu tư vào nghiên cứu và phát triển để nâng cao trình độ công nghệ.',
    cost: 2000,
    money: -2000,
    marketShare: 1.0,
    technology: 15,
    reputation: 5,
    monopolyRisk: 2,
  },
  [DECISION_TYPES.ACQUIRE]: {
    nameVi: 'Thâu tóm đối thủ',
    descriptionVi: 'Thâu tóm một doanh nghiệp đối thủ nhỏ để nhanh chóng gia tăng thị phần.',
    cost: 5000,
    money: -5000,
    marketShare: 8.0,
    technology: 3,
    reputation: -10,
    monopolyRisk: 20,
  },
  [DECISION_TYPES.MERGE]: {
    nameVi: 'Sáp nhập doanh nghiệp',
    descriptionVi: 'Sáp nhập với một đối thủ cùng ngành để củng cố thị phần và nguồn lực.',
    cost: 3000,
    money: -3000,
    marketShare: 12.0,
    technology: 5,
    reputation: -5,
    monopolyRisk: 25,
  },
  [DECISION_TYPES.REDUCE_PRICES]: {
    nameVi: 'Giảm giá bán',
    descriptionVi: 'Giảm giá sản phẩm để thu hút người tiêu dùng và tăng sức cạnh tranh.',
    cost: 1500,
    money: -1500,
    marketShare: 5.0,
    technology: 0,
    reputation: 15,
    monopolyRisk: 5,
  },
  [DECISION_TYPES.EXPAND_FACTORIES]: {
    nameVi: 'Mở rộng nhà máy',
    descriptionVi: 'Đầu tư nâng cấp công suất sản xuất để gia tăng doanh số và thị phần.',
    cost: 4000,
    money: -4000,
    marketShare: 4.0,
    technology: 5,
    reputation: 5,
    monopolyRisk: 8,
  },
  [DECISION_TYPES.ACCEPT_GOV_SUPPORT]: {
    nameVi: 'Nhận hỗ trợ chính phủ',
    descriptionVi: 'Nhận các gói cứu trợ và tài trợ từ chính phủ để cải thiện dòng tiền.',
    cost: 0,
    money: 3000,
    marketShare: 2.0,
    technology: 5,
    reputation: -5,
    monopolyRisk: 15,
  },
  [DECISION_TYPES.LOBBY_GOVERNMENT]: {
    nameVi: 'Vận động chính sách',
    descriptionVi: 'Lobby chính phủ để nhận các chính sách ưu đãi cạnh tranh.',
    cost: 2000,
    money: -2000,
    marketShare: 3.0,
    technology: 0,
    reputation: -15,
    monopolyRisk: 18,
  },
  [DECISION_TYPES.EXPORT]: {
    nameVi: 'Xuất khẩu sản phẩm',
    descriptionVi: 'Mở rộng kênh phân phối sang thị trường quốc tế để mở rộng tệp khách hàng.',
    cost: 1000,
    money: -1000,
    marketShare: 3.0,
    technology: 5,
    reputation: 10,
    monopolyRisk: 3,
  },
  [DECISION_TYPES.RAISE_PRICES]: {
    nameVi: 'Tăng giá bán',
    descriptionVi: 'Tận dụng sức mạnh thị trường để tăng giá bán, cải thiện lợi nhuận biên.',
    cost: 0,
    money: 4000,
    marketShare: -3.0,
    technology: 0,
    reputation: -10,
    monopolyRisk: 10,
  },
};

export class DecisionEngine {
  /**
   * Returns a list of 4–6 available decisions tailored for a specific team,
   * keeping the selection deterministic per round using a seeded RNG.
   */
  public getAvailableDecisions(
    round: number,
    teamState: { money: number; marketShare: number },
    prevDecisionType?: string | null,
    gameSeed = 'default_seed'
  ): Decision[] {
    const rng = new SeededRNG(`${gameSeed}_round_${round}`);

    // 1. Filter the 9 candidate types by round (Lobby and Gov Support from round 3+)
    let allowedTypes = (Object.keys(BASE_EFFECTS) as DecisionType[]).filter((type) => {
      if ((type === DECISION_TYPES.LOBBY_GOVERNMENT || type === DECISION_TYPES.ACCEPT_GOV_SUPPORT) && round < 3) {
        return false;
      }
      return true;
    });

    // 2. Shuffle using Seeded RNG
    allowedTypes = rng.shuffle(allowedTypes);

    // 3. Take a subset of 5 candidate decisions (same global set for the round)
    const roundCandidates = allowedTypes.slice(0, 5).map((type) => {
      const base = BASE_EFFECTS[type];
      return {
        id: `dec_${type}_r${round}`,
        type,
        nameVi: base.nameVi,
        descriptionVi: base.descriptionVi,
        cost: base.cost,
        effects: {
          money: base.money,
          marketShare: base.marketShare,
          technology: base.technology,
          reputation: base.reputation,
          monopolyRisk: base.monopolyRisk,
        },
      };
    });

    // 4. Filter set by team constraints
    return roundCandidates.filter((decision) => {
      // Respect money constraints (must be able to afford the decision cost)
      if (teamState.money < decision.cost) {
        return false;
      }
      // Respect market share constraints (can't merge if marketShare < 10%)
      if (decision.type === DECISION_TYPES.MERGE && teamState.marketShare < 10.0) {
        return false;
      }
      // Respect previous decision constraint (can't select same decision 2 rounds in a row)
      if (decision.type === prevDecisionType) {
        return false;
      }
      return true;
    });
  }

  /**
   * Process and calculate decision effects (delivering StatsDelta) by applying
   * round-stakes multipliers, event modifiers, and diminishing returns.
   */
  public applyDecision(
    team: TeamMetricsInput,
    decisionType: string,
    context: GameContextInput
  ): StatsDelta {
    const base = BASE_EFFECTS[decisionType as DecisionType];
    if (!base) {
      throw new Error(`Unknown decision type: ${decisionType}`);
    }

    // 1. Later rounds have higher stakes (15% multiplier increase per round)
    const roundMultiplier = 1 + (context.roundNumber - 1) * 0.15;

    // 2. Event modifiers (economic crisis reduces all gains by 50%)
    let eventFactor = 1.0;
    if (context.activeEvent?.type === 'crisis') {
      eventFactor = 0.5;
    }

    // 3. Compute raw values
    let moneyDelta = base.money;
    if (moneyDelta < 0) {
      // Costs also scale slightly with stakes
      moneyDelta = Math.round(base.money * roundMultiplier);
    } else {
      moneyDelta = Math.round(base.money * roundMultiplier * eventFactor);
    }

    let marketShareDelta = base.marketShare * roundMultiplier * eventFactor;
    let technologyDelta = base.technology * roundMultiplier * eventFactor;
    let reputationDelta = base.reputation * roundMultiplier * eventFactor;
    const monopolyRiskDelta = base.monopolyRisk * roundMultiplier; // Anti-trust risk doesn't decrease during crisis

    // 4. Apply diminishing returns for positive stats
    if (marketShareDelta > 0) {
      marketShareDelta = this.scaleMarketShare(marketShareDelta, team.marketShare);
    }
    if (technologyDelta > 0) {
      technologyDelta = this.scaleStat(technologyDelta, team.technology);
    }
    if (reputationDelta > 0) {
      reputationDelta = this.scaleStat(reputationDelta, team.reputation);
    }

    return {
      money: moneyDelta,
      marketShare: Number(marketShareDelta.toFixed(1)),
      technology: Math.round(technologyDelta),
      reputation: Math.round(reputationDelta),
      monopolyRisk: Math.round(monopolyRiskDelta),
    };
  }

  /**
   * Helper to apply diminishing returns for standard 0-100 integer stats.
   * If a stat goes above 50, further gains scale down linearly.
   */
  private scaleStat(base: number, current: number): number {
    if (current >= 50) {
      const factor = Math.max(0.2, (100 - current) / 50); // Floor at 20% gain
      return base * factor;
    }
    return base;
  }

  /**
   * Helper to apply diminishing returns for market share.
   * If a team has > 40% market share, gains scale down.
   */
  private scaleMarketShare(base: number, current: number): number {
    if (current >= 40) {
      const factor = Math.max(0.15, (100 - current) / 60); // Floor at 15% gain
      return base * factor;
    }
    return base;
  }
}
