import { create } from 'zustand'

export interface ToastAction {
  message: string
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

export interface Toast extends Required<Pick<ToastAction, 'message' | 'duration'>> {
  id: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastState {
  toasts: Toast[]
  push: (toast: ToastAction) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({
      toasts: [...s.toasts, { id, duration: 6000, ...toast }],
    }))
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
