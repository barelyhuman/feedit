import { create } from "zustand";

interface OpmlImportState {
  total: number;
  imported: number;
  isImporting: boolean;
  error?: string;
  startImport: (total: number) => void;
  updateProgress: (imported: number) => void;
  finishImport: () => void;
  setError: (error: string) => void;
}

export const useOpmlImportStore = create<OpmlImportState>((set) => ({
  total: 0,
  imported: 0,
  isImporting: false,
  error: undefined,
  startImport: (total) =>
    set(() => ({ total, imported: 0, isImporting: true, error: undefined })),
  updateProgress: (imported) => set((state) => ({ ...state, imported })),
  finishImport: () => set((state) => ({ ...state, isImporting: false })),
  setError: (error) =>
    set((state) => ({ ...state, error, isImporting: false })),
}));
