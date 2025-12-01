import { type ParsedProperty } from "./types";

const basicMap: Record<string, string> = {
  boolean: "boolean",
  string: "string",
  number: "number",
  any: "any",
  unknown: "unknown",
};

export function mapTypeToJSDoc(type: string, simplify: boolean): string {
  const trimmed = type.trim();
  if (basicMap[trimmed]) return basicMap[trimmed];
  if (/^string\[]$/i.test(trimmed)) return "string[]";
  if (/^number\[]$/i.test(trimmed)) return "number[]";
  if (/^boolean\[]$/i.test(trimmed)) return "boolean[]";
  if (/^Array<(.+)>$/i.test(trimmed)) {
    const inner = trimmed.match(/^Array<(.+)>$/i)?.[1] || "any";
    return `${mapTypeToJSDoc(inner, simplify)}[]`;
  }
  if (/^Record<.+>$/i.test(trimmed)) return simplify ? "Object" : trimmed;
  if (/=>/.test(trimmed) || /\(\s*\)\s*=>/.test(trimmed)) return "Function";
  if (/Dispatch<SetStateAction<.+>>/.test(trimmed)) return "Function";
  if (simplify && /^(Date|string)$/i.test(trimmed)) return "string";
  return simplify ? "any" : trimmed;
}

export function describeProperty(
  prop: ParsedProperty,
  options: { auto: boolean; isSetter: boolean },
) {
  if (!options.auto) return "TODO: 설명 추가";
  const name = prop.name;
  if (/^(is|has|can)[A-Z]/.test(name)) return "여부를 나타냅니다.";
  if (/Ids$/i.test(name)) return "ID 목록입니다.";
  if (/Map$/i.test(name)) return "매핑 객체입니다.";
  if (/^reset/i.test(name)) return "초기화 함수입니다.";
  if (options.isSetter)
    return `${name.replace(/^set/, "")} 상태를 업데이트하는 setter 함수입니다.`;
  return `${name} 값입니다.`;
}

export function isSetter(name: string) {
  return /^set[A-Z]/.test(name);
}
