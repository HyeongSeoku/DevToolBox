import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./ToastProvider.module.scss";

type ToastType = "info" | "success" | "error";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContextValue = {
  show: (
    message: string,
    options?: { type?: ToastType; duration?: number },
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>((message, options) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { type = "info", duration = 4000 } = options ?? {};
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      {toast.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
