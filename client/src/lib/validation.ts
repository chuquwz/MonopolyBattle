import { z } from "zod";
import { vi } from "@/i18n/vi";

export const roomCodeSchema = z
  .string()
  .length(6, { message: vi.validation.roomCodeLength })
  .regex(/^[A-Z0-9]+$/i, { message: vi.validation.roomCodeAlphanumeric });

export const teamNameSchema = z
  .string()
  .min(2, { message: vi.validation.teamNameLength })
  .max(30, { message: vi.validation.teamNameLength });

export const playerNameSchema = z
  .string()
  .min(2, { message: vi.validation.playerNameLength })
  .max(30, { message: vi.validation.playerNameLength });

export const joinGameSchema = z.object({
  roomCode: roomCodeSchema,
  teamName: teamNameSchema,
  playerName: playerNameSchema,
});

export type JoinGameInput = z.infer<typeof joinGameSchema>;
