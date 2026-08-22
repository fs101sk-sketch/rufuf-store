import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  /** Explain what will happen, to what, and why — never a bare "are you sure?". */
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

interface ConfirmState {
  pending: PendingConfirm | null
  request: (options: ConfirmOptions) => Promise<boolean>
  resolve: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({ pending: { ...options, resolve } })
    }),
  resolve: (value) => {
    get().pending?.resolve(value)
    set({ pending: null })
  },
}))

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(options)
}
