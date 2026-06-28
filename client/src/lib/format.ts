import { vi } from "@/i18n/vi";

export const formatMoney = (amount: number): string =>
  `${amount.toLocaleString('vi-VN')} ${vi.stats.moneyUnit}`;

export const formatPercent = (value: number): string =>
  `${value.toFixed(1).replace('.', ',')}%`;

export const formatScore = (score: number): string =>
  score.toLocaleString('vi-VN');

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

