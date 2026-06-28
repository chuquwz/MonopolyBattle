import { SOCKET_EVENTS } from "@monopoly/shared";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "monopoly_auth_token",
  TEAM_ID: "monopoly_team_id",
  GAME_ID: "monopoly_game_id",
  ROLE: "monopoly_role",
  THEME: "monopoly_theme",
} as const;

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const DESIGN_TOKENS = {
  colors: {
    background: "hsl(222.2 47.4% 11.2%)", // Slate 950
    foreground: "hsl(210 40% 98%)",
    primary: "hsl(215 64% 17%)",
    accent: "hsl(47.9 95.8% 53.1%)",
    secondary: "hsl(217.2 32.6% 17.5%)",
    muted: "hsl(217.2 32.6% 17.5%)",
    mutedForeground: "hsl(215 20.2% 65.1%)",
    destructive: "hsl(0 84.2% 60.2%)",
    success: "hsl(142.1 76.2% 36.3%)",
    monopolyRisk: "hsl(32 95% 50%)",
    border: "hsl(217.2 32.6% 17.5%)",
    ring: "hsl(212.7 26.8% 83.9%)",
  },
  typography: {
    fontSans: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  spacing: {
    headerHeight: "4.5rem", // 72px
    sidebarWidth: "20rem",  // 320px
  },
} as const;

export const CLIENT_SOCKET_EVENTS = SOCKET_EVENTS;
export type ClientSocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
