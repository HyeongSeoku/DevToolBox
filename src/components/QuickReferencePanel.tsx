import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

import CloseIcon from "@/assets/icons/close.svg?react";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";

import { QuickReferenceContent } from "./RightPanel";
import styles from "./RightPanel.module.scss";

type QuickReferenceContextValue = {
  target: HTMLElement | null;
  setTarget: (node: HTMLElement | null) => void;
  register: () => void;
  unregister: () => void;
  hasContent: boolean;
};

const QuickReferenceContext = createContext<QuickReferenceContextValue | null>(
  null,
);

const useQuickReferenceContext = () => {
  const ctx = useContext(QuickReferenceContext);
  if (!ctx) {
    throw new Error("QuickReferenceProvider is missing.");
  }
  return ctx;
};

export function QuickReferenceProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [contentCount, setContentCount] = useState(0);

  const register = useCallback(() => {
    setContentCount((prev) => prev + 1);
  }, []);

  const unregister = useCallback(() => {
    setContentCount((prev) => Math.max(0, prev - 1));
  }, []);

  const value = useMemo(
    () => ({
      target,
      setTarget,
      register,
      unregister,
      hasContent: contentCount > 0,
    }),
    [target, register, unregister, contentCount],
  );

  return (
    <QuickReferenceContext.Provider value={value}>
      {children}
    </QuickReferenceContext.Provider>
  );
}

export function QuickReferencePanel({
  hidden,
  onClose,
}: {
  hidden?: boolean;
  onClose: () => void;
}) {
  const { setTarget, hasContent } = useQuickReferenceContext();
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTarget(targetRef.current);
    return () => setTarget(null);
  }, [setTarget]);

  return (
    <aside className={`${styles.panel} ${hidden ? styles.hidden : ""}`}>
      <div className={styles.panelHeader}>
        <Button
          type="button"
          variant="ghost"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="도움말 닫기"
        >
          <CloseIcon />
        </Button>
      </div>
      <ScrollArea className={styles.scroll}>
        <div ref={targetRef} />
        {!hasContent && <QuickReferenceContent />}
      </ScrollArea>
    </aside>
  );
}

export function QuickReferencePortal({ children }: { children: ReactNode }) {
  const { target, register, unregister } = useQuickReferenceContext();

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  if (!target) return null;
  return createPortal(children, target);
}
