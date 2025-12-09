import React from "react";

import { Button } from "./Button";

/**
 * PaginationProps interface.
 */
export interface PaginationProps {
  /** 페이지 값입니다. */
  page: number;
  /** 한페이지에 보여줄 아이템 개수입니다. */
  pageSize: number;
  /** total 값입니다. */
  total: number;
  /** onPageChange 값입니다. */
  onPageChange: (page: number) => void;
  /** 한 뷰에 노출시켜줄 페이지 개수입니다. */
  perView?: number;
  /** hideNumbers 값입니다. */
  hideNumbers?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  perView = 5,
  hideNumbers = false,
}) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const prev = () => onPageChange(Math.max(0, page - 1));
  const next = () => onPageChange(Math.min(pageCount - 1, page + 1));

  const visiblePages = React.useMemo(() => {
    if (hideNumbers) return [];
    const take = Math.max(1, perView);
    const half = Math.floor(take / 2);
    let start = Math.max(0, page - half);
    let end = start + take;
    if (end > pageCount) {
      end = pageCount;
      start = Math.max(0, end - take);
    }
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [page, pageCount, perView, hideNumbers]);

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Button variant="ghost" onClick={prev} disabled={page === 0}>
        Prev
      </Button>

      {!hideNumbers && (
        <>
          {visiblePages.map((p) => (
            <Button
              key={p}
              variant={p === page ? "primary" : "ghost"}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </Button>
          ))}
          {pageCount > visiblePages.length && (
            <span className="micro">/ {pageCount}</span>
          )}
        </>
      )}

      {hideNumbers && (
        <span className="micro">
          {page + 1} / {pageCount}
        </span>
      )}

      <Button variant="ghost" onClick={next} disabled={page >= pageCount - 1}>
        Next
      </Button>
    </div>
  );
};
