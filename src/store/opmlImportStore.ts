import { create } from "zustand";

interface OpmlImportState {
  total: number;
  imported: number;
  isImporting: boolean;
  error?: string;
  failedItems: string[];
  startImport: (total: number) => void;
  updateProgress: (imported: number) => void;
  addToFailedItems: (str: string) => void;
  finishImport: () => void;
  setError: (error: string) => void;
}

export const useOpmlImportStore = create<OpmlImportState>((set) => ({
  total: 0,
  imported: 0,
  isImporting: false,
  error: undefined,
  failedItems: [],
  startImport: (total) =>
    set(() => ({ total, imported: 0, isImporting: true, error: undefined })),
  updateProgress: (imported) => set((state) => ({ ...state, imported })),
  finishImport: () => set((state) => ({ ...state, isImporting: false })),
  addToFailedItems: (str: string) =>
    set((state) => ({ ...state, failedItems: state.failedItems.concat(str) })),
  setError: (error) =>
    set((state) => ({ ...state, error, isImporting: false })),
}));
