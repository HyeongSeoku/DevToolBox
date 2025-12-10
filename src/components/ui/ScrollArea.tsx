import * as React from "react";
import { type PropsWithChildren } from "react";

import styles from "./ScrollArea.module.scss";

interface ScrollAreaProps {
  maxHeight?: number | string;
  className?: string;
}

/**
 * 가짜 스크롤바가 붙어있는 스크롤 컨테이너
 */
export const ScrollArea: React.FC<PropsWithChildren<ScrollAreaProps>> = ({
  children,
  maxHeight,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [thumbTop, setThumbTop] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [thumbWidth, setThumbWidth] = React.useState(0);
  const [thumbLeft, setThumbLeft] = React.useState(0);
  const [visibleX, setVisibleX] = React.useState(false);

  // 드래그 상태
  const isDraggingRef = React.useRef(false);
  const dragStartYRef = React.useRef(0);
  const dragStartThumbTopRef = React.useRef(0);
  const isDraggingXRef = React.useRef(false);
  const dragStartXRef = React.useRef(0);
  const dragStartThumbLeftRef = React.useRef(0);

  // 스크롤 / 사이즈 기준으로 thumb 크기 & 위치 계산
  const updateThumb = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { clientHeight, scrollHeight, scrollTop, clientWidth, scrollWidth, scrollLeft } =
      el;

    if (scrollHeight <= clientHeight) {
      setVisible(false);
      setThumbHeight(0);
      setThumbTop(0);
    } else {
      setVisible(true);
      const ratio = clientHeight / scrollHeight;
      const minThumb = 32; // 최소 thumb 길이
      const nextThumbHeight = Math.max(clientHeight * ratio, minThumb);
      const maxThumbTop = clientHeight - nextThumbHeight;
      const nextThumbTop =
        (scrollTop / (scrollHeight - clientHeight)) * maxThumbTop;
      setThumbHeight(nextThumbHeight);
      setThumbTop(nextThumbTop);
    }

    if (scrollWidth <= clientWidth) {
      setVisibleX(false);
      setThumbWidth(0);
      setThumbLeft(0);
    } else {
      setVisibleX(true);
      const ratioX = clientWidth / scrollWidth;
      const minThumbX = 32;
      const nextThumbWidth = Math.max(clientWidth * ratioX, minThumbX);
      const maxThumbLeft = clientWidth - nextThumbWidth;
      const nextThumbLeft =
        (scrollLeft / (scrollWidth - clientWidth)) * maxThumbLeft;
      setThumbWidth(nextThumbWidth);
      setThumbLeft(nextThumbLeft);
    }
  }, []);

  // 스크롤 + 리사이즈 대응
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateThumb();

    const onScroll = () => updateThumb();
    el.addEventListener("scroll", onScroll);

    let resizeObserver: ResizeObserver | null = null;
    const hasWindow = typeof window !== "undefined";
    if (hasWindow && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateThumb);
      resizeObserver.observe(el);
    } else if (hasWindow) {
      window.addEventListener("resize", updateThumb);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (resizeObserver) resizeObserver.disconnect();
      else if (hasWindow) window.removeEventListener("resize", updateThumb);
    };
  }, [updateThumb]);

  // thumb 드래그 시작
  const handleThumbMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartThumbTopRef.current = thumbTop;

    document.body.classList.add(styles.noSelect);
  };

  const handleThumbMouseDownX: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    isDraggingXRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartThumbLeftRef.current = thumbLeft;
    document.body.classList.add(styles.noSelect);
  };

  // 문서 전체에 드래그 이벤트 붙이기
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const el = containerRef.current;
      const { clientHeight, scrollHeight } = el;
      if (scrollHeight <= clientHeight) return;

      const deltaY = e.clientY - dragStartYRef.current;
      const maxThumbTop = clientHeight - thumbHeight;
      let nextThumbTop = dragStartThumbTopRef.current + deltaY;
      if (nextThumbTop < 0) nextThumbTop = 0;
      if (nextThumbTop > maxThumbTop) nextThumbTop = maxThumbTop;

      const scrollRatio = nextThumbTop / maxThumbTop;
      const nextScrollTop = scrollRatio * (scrollHeight - clientHeight);

      el.scrollTop = nextScrollTop;
      setThumbTop(nextThumbTop);
    };

    const handleMouseMoveX = (e: MouseEvent) => {
      if (!isDraggingXRef.current || !containerRef.current) return;

      const el = containerRef.current;
      const { clientWidth, scrollWidth } = el;
      if (scrollWidth <= clientWidth) return;

      const deltaX = e.clientX - dragStartXRef.current;
      const maxThumbLeft = clientWidth - thumbWidth;
      let nextThumbLeft = dragStartThumbLeftRef.current + deltaX;
      if (nextThumbLeft < 0) nextThumbLeft = 0;
      if (nextThumbLeft > maxThumbLeft) nextThumbLeft = maxThumbLeft;

      const scrollRatio = nextThumbLeft / maxThumbLeft;
      const nextScrollLeft = scrollRatio * (scrollWidth - clientWidth);

      el.scrollLeft = nextScrollLeft;
      setThumbLeft(nextThumbLeft);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current || isDraggingXRef.current) {
        isDraggingRef.current = false;
        isDraggingXRef.current = false;
        document.body.classList.remove(styles.noSelect);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousemove", handleMouseMoveX);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", handleMouseMoveX);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [thumbHeight, thumbWidth]);

  // 콘텐츠 변경 시에도 썸 계산
  React.useEffect(() => {
    updateThumb();
  }, [children, updateThumb]);

  // 트랙 클릭 시 해당 위치로 점프
  const handleTrackMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    const { clientHeight, scrollHeight } = el;
    if (scrollHeight <= clientHeight) return;

    const maxThumbTop = clientHeight - thumbHeight;
    let nextThumbTop = clickY - thumbHeight / 2;
    if (nextThumbTop < 0) nextThumbTop = 0;
    if (nextThumbTop > maxThumbTop) nextThumbTop = maxThumbTop;

    const scrollRatio = nextThumbTop / maxThumbTop;
    const nextScrollTop = scrollRatio * (scrollHeight - clientHeight);

    el.scrollTop = nextScrollTop;
    setThumbTop(nextThumbTop);
  };

  const handleTrackMouseDownX: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const { clientWidth, scrollWidth } = el;
    if (scrollWidth <= clientWidth) return;

    const maxThumbLeft = clientWidth - thumbWidth;
    let nextThumbLeft = clickX - thumbWidth / 2;
    if (nextThumbLeft < 0) nextThumbLeft = 0;
    if (nextThumbLeft > maxThumbLeft) nextThumbLeft = maxThumbLeft;

    const scrollRatio = nextThumbLeft / maxThumbLeft;
    const nextScrollLeft = scrollRatio * (scrollWidth - clientWidth);

    el.scrollLeft = nextScrollLeft;
    setThumbLeft(nextThumbLeft);
  };

  const containerStyle: React.CSSProperties = {};
  if (maxHeight !== undefined) {
    containerStyle.maxHeight = maxHeight;
  }

  return (
    <div className={styles.wrapper} style={containerStyle}>
      <div
        ref={containerRef}
        className={`${styles.content} ${className ?? ""}`}
      >
        {children}
      </div>

      {visible && (
        <div className={styles.track} onMouseDown={handleTrackMouseDown}>
          <div
            className={styles.thumb}
            style={{
              height: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
            onMouseDown={handleThumbMouseDown}
          />
        </div>
      )}
      {visibleX && (
        <div className={styles.trackX} onMouseDown={handleTrackMouseDownX}>
          <div
            className={styles.thumb}
            style={{
              width: thumbWidth,
              transform: `translateX(${thumbLeft}px)`,
            }}
            onMouseDown={handleThumbMouseDownX}
          />
        </div>
      )}
    </div>
  );
};
