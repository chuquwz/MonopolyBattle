import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Interpolates variables inside curly braces within a translation string.
 * Example: t("Còn lại: {seconds} giây", { seconds: 10 }) => "Còn lại: 10 giây"
 */
export function t(template: string, variables: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
