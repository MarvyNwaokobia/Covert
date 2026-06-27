'use client'

import { createContext, useCallback, useContext, useReducer } from 'react'

export type ToastType = 'success' | 'error' | 'pending' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  txHash?: `0x${string}`
}

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  if (action.type === 'ADD') return [...state, action.toast]
  if (action.type === 'REMOVE') return state.filter((t) => t.id !== action.id)
  return state
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => '',
  dismiss: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    dispatch({ type: 'ADD', toast: { ...t, id } })
    if (t.type !== 'pending') {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), 5000)
    }
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const icons: Record<ToastType, string> = {
  success: '✓',
  error:   '✗',
  pending: '⋯',
  info:    'ℹ',
}

const styles: Record<ToastType, string> = {
  success: 'border-employee/30 bg-employee/10 text-employee',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  pending: 'border-employer/30 bg-employer/10 text-employer',
  info:    'border-border-default bg-bg-elevated text-text-muted',
}

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${styles[t.type]}`}
        >
          <span className="text-sm font-bold mt-px shrink-0">
            {t.type === 'pending'
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : icons[t.type]
            }
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">{t.title}</p>
            {t.message && <p className="text-xs text-text-muted mt-0.5">{t.message}</p>}
            {t.txHash && (
              <p className="text-xs font-mono text-text-subtle mt-0.5 truncate">
                {t.txHash.slice(0, 10)}…{t.txHash.slice(-8)}
              </p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-text-subtle hover:text-text-muted shrink-0 text-xs"
          >✕</button>
        </div>
      ))}
    </div>
  )
}
