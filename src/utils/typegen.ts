/**
 * JSON 샘플을 TypeScript 인터페이스/enum 문자열로 변환하는 유틸
 * TypeGen 페이지와 QuickTypegenPane에서 공유해 사용한다.
 */

const pascal = (str: string) => {
  const clean = str.replace(/[^A-Za-z0-9]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const base = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  return base || "Generated";
};

export type EnumsMap = Record<string, string[]>;

export function generateInterfaces(
  value: any,
  rootName: string,
  enumsMap?: EnumsMap,
): string {
  const interfaces: string[] = [];
  const enums: string[] = [];
  const seen: Record<string, number> = {};
  const enumMapLocal: EnumsMap = enumsMap ? { ...enumsMap } : {};

  const uniqueName = (base: string) => {
    const norm = pascal(base);
    const count = seen[norm] ?? 0;
    seen[norm] = count + 1;
    return count === 0 ? norm : `${norm}${count + 1}`;
  };

  const isDateString = (str: string) => {
    // ISO 형태만 Date 로 간주(유효성은 사용자가 후처리)
    const isoPattern =
      /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
    return isoPattern.test(str);
  };

  const normalize = (str: string) =>
    str.replace(/[^a-z0-9]/gi, "").toLowerCase();

  const pickEnum = (key: string, sample?: string): string | null => {
    if (!Object.keys(enumMapLocal).length) return null;
    const keyLower = normalize(key);
    for (const enumName of Object.keys(enumMapLocal)) {
      const lower = normalize(enumName);
      const nameMatches =
        lower === keyLower ||
        keyLower.endsWith(lower) ||
        lower.endsWith(keyLower);
      if (!nameMatches) continue;
      if (sample) {
        const valuesLower = enumMapLocal[enumName].map((v) => v.toLowerCase());
        if (!valuesLower.includes(sample.toLowerCase())) continue;
      }
      return enumName;
    }
    return null;
  };

  const collectInlineEnums = (node: any) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    Object.entries(node).forEach(([key, val]) => {
      if (
        Array.isArray(val) &&
        val.length > 0 &&
        val.every((v) => typeof v === "string" && v.trim().length > 0)
      ) {
        enumMapLocal[key] = val;
      } else if (val && typeof val === "object") {
        collectInlineEnums(val);
      }
    });
  };

  if (!enumsMap) {
    collectInlineEnums(value);
  }

  if (Object.keys(enumMapLocal).length) {
    Object.entries(enumMapLocal).forEach(([name, values]) => {
      const enumLines = values.map((v) => `  ${v} = "${v}",`);
      enums.push(`export enum ${name} {\n${enumLines.join("\n")}\n}`);
    });
  }

  const mergeObjectShapes = (nodes: any[], name: string) => {
    const shape: Record<string, any[]> = {};
    nodes.forEach((n) => {
      if (!n || typeof n !== "object" || Array.isArray(n)) return;
      Object.entries(n).forEach(([k, v]) => {
        if (!shape[k]) shape[k] = [];
        shape[k].push(v);
      });
    });
    const merged: Record<string, { values: any[]; optional: boolean }> = {};
    Object.entries(shape).forEach(([k, vals]) => {
      merged[k] = { values: vals, optional: vals.length !== nodes.length };
    });
    return merged;
  };

  const unionTypes = (vals: any[], name: string): string => {
    const types = Array.from(new Set(vals.map((v) => walk(v, name))));
    if (types.length === 1) return types[0];
    return types.join(" | ");
  };

  const walk = (node: any, name: string): string => {
    if (node === null) return "null";
    const t = typeof node;
    if (t === "string") {
      const enumHit = pickEnum(name, node);
      if (enumHit) return enumHit;
      return isDateString(node) ? "Date" : "string";
    }
    if (t === "number") return "number";
    if (t === "boolean") return "boolean";
    if (Array.isArray(node)) {
      if (node.length === 0) return "unknown[]";
      const elements = node;
      const allObjects = elements.every(
        (el) => el && typeof el === "object" && !Array.isArray(el),
      );
      if (allObjects) {
        const merged = mergeObjectShapes(elements, name);
        const ifaceName = uniqueName(name + "Item");
        const lines = Object.entries(merged).map(
          ([key, { values, optional }]) => {
            const type = unionTypes(values, key);
            return `  ${key}${optional ? "?" : ""}: ${type};`;
          },
        );
        interfaces.push(
          `export interface ${ifaceName} {\n${lines.join("\n")}\n}`,
        );
        return `${ifaceName}[]`;
      }
      const itemTypes = Array.from(
        new Set(elements.map((el) => walk(el, name + "Item"))),
      );
      const union = itemTypes.join(" | ");
      return itemTypes.length === 1 ? `${union}[]` : `(${union})[]`;
    }
    if (t === "object") {
      const ifaceName = uniqueName(name);
      const lines = Object.entries(node).map(([key, val]) => {
        const type = walk(val, key);
        return `  ${key}: ${type};`;
      });
      interfaces.push(
        `export interface ${ifaceName} {\n${lines.join("\n")}\n}`,
      );
      return ifaceName;
    }
    return "any";
  };

  const rootInterface = walk(value, rootName || "Root");
  if (!interfaces.find((i) => i.includes(`interface ${rootInterface}`))) {
    interfaces.push(`export interface ${rootInterface} {}`);
  }
  const enumsBlock = enums.length ? `${enums.join("\n\n")}\n\n` : "";
  return `${enumsBlock}${interfaces.reverse().join("\n\n")}`;
}
