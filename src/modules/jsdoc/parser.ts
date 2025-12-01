import { type ParsedInterface, type ParsedProperty } from "./types";

const interfaceRegex = /(interface|type)\s+([A-Za-z0-9_]+)\s*=?\s*{([^}]*)}/gs;
const propRegex = /([A-Za-z0-9_]+)\s*(\??):\s*([^;]+);?/g;

export function parseInterfaces(input: string): ParsedInterface[] {
  const results: ParsedInterface[] = [];
  let match;
  while ((match = interfaceRegex.exec(input)) !== null) {
    const name = match[2];
    const body = match[3];
    const properties: ParsedProperty[] = [];
    let propMatch;
    while ((propMatch = propRegex.exec(body)) !== null) {
      properties.push({
        name: propMatch[1],
        optional: propMatch[2] === "?",
        type: propMatch[3].trim(),
      });
    }
    results.push({ name, properties });
  }
  return results;
}
