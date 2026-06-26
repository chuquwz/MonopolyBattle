import { vi } from "@/i18n/vi.js";

export const formatMoney = (amount: number): string =>
  `${amount.toLocaleString('vi-VN')} ${vi.stats.moneyUnit}`;

export const formatPercent = (value: number): string =>
  `${value.toFixed(1).replace('.', ',')}%`;

export const formatScore = (score: number): string =>
  score.toLocaleString('vi-VN');
