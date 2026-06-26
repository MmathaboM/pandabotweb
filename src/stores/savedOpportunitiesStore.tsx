// src/store/savedOpportunitiesStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const SAVED_IDS_KEY = "saved-opportunity-ids";

interface SavedOpportunitiesState {
  savedIds: number[];
  toggleSaved: (id: number) => void;
  isSaved: (id: number) => boolean;
  setSavedIds: (ids: number[]) => void;
}

export const useSavedOpportunitiesStore = create<SavedOpportunitiesState>()(
  persist(
    (set, get) => ({
      savedIds: [],

      toggleSaved: (id) =>
        set((state) => {
          const ids = state.savedIds.includes(id)
            ? state.savedIds.filter((s) => s !== id)
            : [...state.savedIds, id].sort((a, b) => a - b);
          return { savedIds: ids };
        }),

      isSaved: (id) => get().savedIds.includes(id),

      setSavedIds: (ids) => set({ savedIds: ids }),
    }),
    {
      name: SAVED_IDS_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
