import { create } from "zustand";
import type { ToastMessage } from "@/components/ui/toast";

export interface UiState {
  showEventOverlay: boolean;
  showNarrator: boolean;
  showQuizModal: boolean;
  toasts: ToastMessage[];
  setShowEventOverlay: (show: boolean) => void;
  setShowNarrator: (show: boolean) => void;
  setShowQuizModal: (show: boolean) => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showEventOverlay: false,
  showNarrator: false,
  showQuizModal: false,
  toasts: [],
  setShowEventOverlay: (show) => set({ showEventOverlay: show }),
  setShowNarrator: (show) => set({ showNarrator: show }),
  setShowQuizModal: (show) => set({ showQuizModal: show }),
  addToast: (toast) => set((state) => {
    const id = Math.random().toString(36).substring(2, 9);
    return { toasts: [...state.toasts, { ...toast, id }] };
  }),
  dismissToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));
