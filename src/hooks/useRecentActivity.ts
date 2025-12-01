import { useCallback, useEffect, useState } from "react";

type Activity = {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
};

const STORAGE_KEY = "recent-activities";

const loadActivities = (): Activity[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Activity[];
  } catch {
    return [];
  }
};

const saveActivities = (items: Activity[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
};

export function useRecentActivity() {
  const [items, setItems] = useState<Activity[]>(() => loadActivities());

  // guard against setState loops by saving only when list identity changes meaningfully
  useEffect(() => {
    saveActivities(items);
  }, [items]);

  const addActivity = useCallback((title: string, detail: string) => {
    setItems((prev) => {
      const next: Activity = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        detail,
        timestamp: Date.now(),
      };
      return [next, ...prev].slice(0, 20);
    });
  }, []);

  return { items, addActivity };
}
