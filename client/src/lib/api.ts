import { vi } from "@/i18n/vi";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Custom light fetch wrapper for communicating with the Express Backend REST API.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { message?: string };
      return {
        error: errBody.message || vi.errors.serverError,
        statusCode: response.status,
      };
    }

    const data = (await response.json()) as T;
    return { data, statusCode: response.status };
  } catch {
    return {
      error: vi.errors.serverError,
      statusCode: 500,
    };
  }
}
