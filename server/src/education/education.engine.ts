import type { QuizResultSummary } from './quiz.engine.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EconomicConcept {
  id: string;
  nameVi: string;
  descriptionVi: string;
  examplesVi: string[];
  relatedGameMechanics: string[];
}

export interface QuizRoundRecord {
  round: number;
  conceptId: string;
  result: QuizResultSummary;
}

export interface EducationalSummary {
  conceptsCovered: ConceptSummary[];
  overallQuizAccuracy: number;
  highlights: string[];
}

interface ConceptSummary {
  conceptId: string;
  nameVi: string;
  correctCount: number;
  totalAnswers: number;
  accuracyPercent: number;
}

// ---------------------------------------------------------------------------
// Concept Registry
// ---------------------------------------------------------------------------

const CONCEPT_REGISTRY: Record<string, EconomicConcept> = {
  MONOPOLY_DEFINITION: {
    id: 'MONOPOLY_DEFINITION',
    nameVi: 'Độc quyền',
    descriptionVi:
      'Trạng thái một hoặc một nhóm nhỏ doanh nghiệp kiểm soát toàn bộ hoặc phần lớn thị trường, có khả năng định giá và loại bỏ cạnh tranh.',
    examplesVi: [
      'Thị phần vượt 50% dẫn đến can thiệp chống độc quyền',
      'Thâu tóm đối thủ làm tăng rủi ro độc quyền',
      'Tập trung tư bản qua sáp nhập nhiều doanh nghiệp nhỏ',
    ],
    relatedGameMechanics: ['acquire', 'merge', 'market_share_threshold'],
  },
  STATE_MONOPOLY_CAPITALISM: {
    id: 'STATE_MONOPOLY_CAPITALISM',
    nameVi: 'CNTB độc quyền nhà nước',
    descriptionVi:
      'Sự kết hợp giữa sức mạnh của tư bản độc quyền và bộ máy nhà nước, trong đó nhà nước phục vụ lợi ích của giai cấp tư sản độc quyền.',
    examplesVi: [
      'Vận động chính phủ để tác động vào chính sách kinh tế',
      'Nhận hỗ trợ nhà nước tạo lợi thế cạnh tranh không công bằng',
      'Nhà nước giải cứu tập đoàn lớn trong khủng hoảng',
    ],
    relatedGameMechanics: ['lobby_government', 'accept_gov_support'],
  },
  VIETNAM_CONTEXT: {
    id: 'VIETNAM_CONTEXT',
    nameVi: 'Độc quyền nhà nước tại Việt Nam',
    descriptionVi:
      'Các ngành thiết yếu như điện, nước, đường sắt ở Việt Nam được nhà nước nắm giữ để tránh độc quyền tư nhân và đảm bảo tiếp cận phổ cập cho toàn dân.',
    examplesVi: [
      'EVN (điện) — độc quyền tự nhiên, không thể nhân đôi hạ tầng',
      'VNR (đường sắt) — tài sản quốc gia chiến lược',
      'Cấp nước đô thị — độc quyền tự nhiên do chi phí hạ tầng cao',
    ],
    relatedGameMechanics: ['natural_monopoly', 'state_ownership'],
  },
  CAPITAL_CONCENTRATION: {
    id: 'CAPITAL_CONCENTRATION',
    nameVi: 'Tập trung tư bản',
    descriptionVi:
      'Quá trình sáp nhập nhiều tư bản nhỏ thành một khối tư bản lớn hơn thông qua thâu tóm, sáp nhập hoặc phá sản đối thủ.',
    examplesVi: [
      'Thâu tóm đối thủ để nhanh chóng tăng thị phần',
      'Sáp nhập công ty để loại bỏ cạnh tranh',
    ],
    relatedGameMechanics: ['acquire', 'merge'],
  },
  CAPITAL_ACCUMULATION: {
    id: 'CAPITAL_ACCUMULATION',
    nameVi: 'Tích tụ tư bản',
    descriptionVi:
      'Quá trình doanh nghiệp tái đầu tư giá trị thặng dư (lợi nhuận) để mở rộng quy mô sản xuất, tích lũy tư bản dần dần.',
    examplesVi: [
      'Đầu tư vào công nghệ từ lợi nhuận tích lũy',
      'Mở rộng nhà máy thay vì chi trả cổ tức',
    ],
    relatedGameMechanics: ['invest_tech', 'expand_factory'],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a full economic concept definition by its string id.
 */
export function getConceptById(conceptId: string): EconomicConcept | null {
  return CONCEPT_REGISTRY[conceptId] ?? null;
}

/**
 * Returns a short Vietnamese explanation string for a given concept id.
 * Falls back gracefully if the concept is not registered.
 */
export function getExplanationForConcept(conceptId: string): string {
  const concept = CONCEPT_REGISTRY[conceptId];
  if (!concept) {
    return '';
  }
  return concept.descriptionVi;
}

/**
 * Generates a complete educational summary for use in the game-over payload
 * and the GET /api/games/:id/results endpoint.
 *
 * @param roundsPlayed   Number of rounds completed in this game session.
 * @param quizRecords    All quiz rounds played (concept + results per round).
 */
export function generateEducationalSummary(
  roundsPlayed: number,
  quizRecords: QuizRoundRecord[]
): EducationalSummary {
  const conceptMap = new Map<string, ConceptSummary>();

  for (const record of quizRecords) {
    const concept = CONCEPT_REGISTRY[record.conceptId];
    const nameVi = concept?.nameVi ?? record.conceptId;

    const existing = conceptMap.get(record.conceptId);
    const correctCount = record.result.teamResults.filter((r) => r.isCorrect).length;
    const totalAnswers = record.result.teamResults.length;

    if (existing) {
      existing.correctCount += correctCount;
      existing.totalAnswers += totalAnswers;
      existing.accuracyPercent =
        existing.totalAnswers > 0
          ? Math.round((existing.correctCount / existing.totalAnswers) * 100)
          : 0;
    } else {
      conceptMap.set(record.conceptId, {
        conceptId: record.conceptId,
        nameVi,
        correctCount,
        totalAnswers,
        accuracyPercent: totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0,
      });
    }
  }

  const conceptsCovered = Array.from(conceptMap.values());

  const totalCorrect = conceptsCovered.reduce((sum, c) => sum + c.correctCount, 0);
  const totalAnswers = conceptsCovered.reduce((sum, c) => sum + c.totalAnswers, 0);
  const overallQuizAccuracy =
    totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const highlights = buildHighlights(conceptsCovered, roundsPlayed);

  return { conceptsCovered, overallQuizAccuracy, highlights };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildHighlights(
  concepts: ConceptSummary[],
  roundsPlayed: number
): string[] {
  const highlights: string[] = [];

  const strongest = concepts.reduce<ConceptSummary | null>(
    (best, c) => (!best || c.accuracyPercent > best.accuracyPercent ? c : best),
    null
  );
  const weakest = concepts.reduce<ConceptSummary | null>(
    (worst, c) => (!worst || c.accuracyPercent < worst.accuracyPercent ? c : worst),
    null
  );

  if (strongest && strongest.accuracyPercent >= 80) {
    highlights.push(
      `Các đội nắm vững khái niệm "${strongest.nameVi}" với tỷ lệ trả lời đúng ${strongest.accuracyPercent}%.`
    );
  }

  if (weakest && weakest.accuracyPercent < 50) {
    highlights.push(
      `Khái niệm "${weakest.nameVi}" cần được ôn tập thêm (chỉ đạt ${weakest.accuracyPercent}% chính xác).`
    );
  }

  if (roundsPlayed >= 7) {
    highlights.push(
      'Trò chơi đã trải qua đầy đủ 3 vòng câu hỏi từ lý thuyết đến thực tiễn Việt Nam.'
    );
  }

  return highlights;
}
