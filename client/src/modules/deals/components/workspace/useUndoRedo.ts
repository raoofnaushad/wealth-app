import { createStore, useStore } from 'zustand'

export interface HistoryEntry {
  type: 'snapshot_field' | 'document_content' | 'document_name'
  targetId: string
  fieldName?: string
  previousValue: unknown
  newValue: unknown
  timestamp: number
}

interface UndoRedoState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  canUndo: boolean
  canRedo: boolean
  pushChange: (entry: Omit<HistoryEntry, 'timestamp'>) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  clearHistory: () => void
}

const MAX_HISTORY = 50

export const undoRedoStore = createStore<UndoRedoState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushChange: (entry) => {
    const past = [...get().past, { ...entry, timestamp: Date.now() }]
    if (past.length > MAX_HISTORY) past.shift()
    set({ past, future: [], canUndo: true, canRedo: false })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null
    const entry = past[past.length - 1]
    const newPast = past.slice(0, -1)
    set({
      past: newPast,
      future: [entry, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    })
    return entry
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null
    const entry = future[0]
    const newFuture = future.slice(1)
    set({
      past: [...past, entry],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    })
    return entry
  },

  clearHistory: () =>
    set({ past: [], future: [], canUndo: false, canRedo: false }),
}))

export function useUndoRedo() {
  return useStore(undoRedoStore)
}
