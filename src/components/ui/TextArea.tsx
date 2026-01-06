import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import { ScrollArea } from "@/components/ui/ScrollArea";

import styles from "./TextArea.module.scss";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoSize?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
  scrollable?: boolean;
  wrapperClassName?: string;
};

const toCssSize = (value?: number | string) => {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      autoSize = true,
      minHeight,
      maxHeight,
      scrollable = false,
      wrapperClassName,
      style,
      onInput,
      ...props
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const el = innerRef.current;
      if (!el || !autoSize) return;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    };

    useLayoutEffect(() => {
      resize();
    }, [props.value, autoSize]);

    useEffect(() => {
      if (!autoSize) return;
      const el = innerRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => resize());
      observer.observe(el);
      return () => observer.disconnect();
    }, [autoSize]);

    const textarea = (
      <textarea
        ref={innerRef}
        {...props}
        style={{
          ...style,
          minHeight: toCssSize(minHeight) ?? style?.minHeight,
          maxHeight: toCssSize(maxHeight) ?? style?.maxHeight,
        }}
        onInput={(event) => {
          if (autoSize) resize();
          onInput?.(event);
        }}
      />
    );

    if (!scrollable && maxHeight === undefined) {
      return textarea;
    }

    return (
      <ScrollArea
        className={styles.scrollContent}
        wrapperClassName={`${styles.scrollWrapper} ${wrapperClassName ?? ""}`}
        maxHeight={maxHeight}
      >
        <div className={styles.inner}>{textarea}</div>
      </ScrollArea>
    );
  },
);

TextArea.displayName = "TextArea";
