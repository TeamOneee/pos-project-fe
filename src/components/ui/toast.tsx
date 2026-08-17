import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** ms before auto-dismiss; 0 keeps it until dismissed. */
  duration: number;
};

type ToastInput = Omit<Partial<Toast>, 'title'> & { title: string };

/**
 * Each variant pairs a colour with an icon and its own text, so status is
 * never signalled by colour alone (CLAUDE.md rule 6).
 */
const VARIANTS = {
  success: {
    container: 'border-success bg-success-subtle',
    icon: CheckCircle2,
    tone: 'text-success',
  },
  error: { container: 'border-danger bg-danger-subtle', icon: XCircle, tone: 'text-danger' },
  warning: {
    container: 'border-warning bg-warning-subtle',
    icon: AlertTriangle,
    tone: 'text-warning',
  },
  info: { container: 'border-info bg-surface-raised', icon: Info, tone: 'text-info' },
} as const satisfies Record<ToastVariant, { container: string; icon: unknown; tone: string }>;

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  toasts: readonly Toast[];
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = input.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const next: Toast = {
        id,
        title: input.title,
        variant: input.variant ?? 'info',
        duration: input.duration ?? 4000,
        ...(input.description !== undefined ? { description: input.description } : {}),
      };

      setToasts((current) => [...current, next]);

      if (next.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), next.duration)
        );
      }

      return id;
    },
    [dismiss]
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss, toasts }), [toast, dismiss, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    // Top-right, stacked downwards: success is confirmation, not an interruption,
    // so it stays out of the reading path. Full width on a phone, where there is
    // no room to be off to one side.
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-stretch gap-sm p-lg tablet:left-auto tablet:right-0 tablet:items-end">
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = VARIANTS[toast.variant];

  return (
    <div
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-full max-w-[480px] flex-row items-start gap-md rounded-md border p-lg shadow-md',
        variant.container
      )}
    >
      <Icon as={variant.icon} size={20} className={cn('mt-0.5', variant.tone)} />

      <div className="flex flex-1 flex-col gap-xs">
        <Text variant="body-strong">{toast.title}</Text>
        {toast.description ? (
          <Text variant="caption" tone="muted">
            {toast.description}
          </Text>
        ) : null}
      </div>

      {/* Full 44×44 target (rule 6); the negative margin keeps the toast from
          growing to accommodate it. */}
      <button
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="-my-sm flex h-touch w-touch shrink-0 items-center justify-center rounded-md hover:bg-black/5 focus-ring"
      >
        <Icon as={X} size={16} className="text-fg-muted" />
      </button>
    </div>
  );
}

export { ToastProvider, ToastViewport, useToast };
export type { Toast, ToastInput, ToastVariant };
