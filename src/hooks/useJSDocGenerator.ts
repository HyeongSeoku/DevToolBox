import { useMemo, useState } from "react";

import { generateJSDoc } from "@/modules/jsdoc/generator";
import { parseInterfaces } from "@/modules/jsdoc/parser";
import { type JSDocMode } from "@/modules/jsdoc/types";

const SAMPLE = `interface ParkingManageContextValue {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  parkingIds: string[];
  cameraTypeMap: Record<string, number>;
}`;

export function useJSDocGenerator() {
  const [input, setInput] = useState(SAMPLE);
  const [mode, setMode] = useState<JSDocMode>("typedef");
  const [rootName, setRootName] = useState("ParkingManageContextValue");
  const [rootParam, setRootParam] = useState("props");
  const [simplifyTypes, setSimplifyTypes] = useState(false);
  const [autoDescription, setAutoDescription] = useState(true);
  const [detectSetter, setDetectSetter] = useState(true);
  const { code, error } = useMemo(() => {
    try {
      const parsed = parseInterfaces(input);
      const codeText = generateJSDoc(parsed, {
        mode,
        rootName,
        rootParam,
        simplifyTypes,
        autoDescription,
        detectSetter,
      });
      return { code: codeText, error: null as string | null };
    } catch (err) {
      const msg = `JSDoc 생성 실패: ${err}`;
      return { code: msg, error: msg };
    }
  }, [
    input,
    mode,
    rootName,
    rootParam,
    simplifyTypes,
    autoDescription,
    detectSetter,
  ]);

  return {
    input,
    setInput,
    mode,
    setMode,
    rootName,
    setRootName,
    rootParam,
    setRootParam,
    simplifyTypes,
    setSimplifyTypes,
    autoDescription,
    setAutoDescription,
    detectSetter,
    setDetectSetter,
    error,
    code,
    sample: SAMPLE,
  };
}
