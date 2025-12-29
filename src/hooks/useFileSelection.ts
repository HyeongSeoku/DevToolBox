import { useCallback, useState } from "react";

export function useFileSelection() {
  const [files, setFiles] = useState<string[]>([]);

  const addFiles = useCallback((paths: string[]) => {
    setFiles((prev) => {
      const merged = [...prev, ...paths];
      return Array.from(new Set(merged));
    });
  }, []);

  const removeFile = useCallback((path: string) => {
    setFiles((prev) => prev.filter((item) => item !== path));
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  const replaceFiles = useCallback((paths: string[]) => {
    setFiles(Array.from(new Set(paths)));
  }, []);

  return { files, addFiles, removeFile, clearFiles, replaceFiles };
}
