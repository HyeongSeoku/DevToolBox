import YAML from "yaml";

export type ParsedSpec = {
  raw: any;
  schemas: Record<string, any>;
  paths?: Record<string, any>;
  version: string;
};

export function parseOpenApiText(text: string): ParsedSpec {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = YAML.parse(text);
  }
  return parseOpenApiObject(raw);
}

export function parseOpenApiObject(raw: any): ParsedSpec {
  if (!raw || typeof raw !== "object") throw new Error("스펙이 비어있거나 객체가 아닙니다.");
  const version = raw.openapi || raw.swagger || "unknown";
  const schemas =
    raw.components?.schemas ??
    raw.definitions ??
    {};
  const paths = raw.paths;
  return { raw, schemas, paths, version };
}

export function generateTypesFromSchemas(spec: ParsedSpec): { code: string; schemaCount: number; pathCount: number } {
  const lines: string[] = [];
  const seenNames: Record<string, number> = {};
  const ctx = { spec, seenNames };

  Object.entries(spec.schemas).forEach(([name, schema]) => {
    const typeName = uniqueName(name, seenNames);
    const body = schemaToTs(schema, ctx);
    lines.push(`export type ${typeName} = ${body};`);
  });

  return {
    code: lines.join("\n\n") || "// 스키마가 없습니다.",
    schemaCount: Object.keys(spec.schemas).length,
    pathCount: spec.paths ? Object.keys(spec.paths).length : 0,
  };
}

type Ctx = {
  spec: ParsedSpec;
  seenNames: Record<string, number>;
};

function schemaToTs(schema: any, ctx: Ctx): string {
  if (!schema) return "unknown";
  if (schema.$ref) return refToTs(schema.$ref, ctx);

  const t = schema.type;
  if (schema.enum) {
    return schema.enum.map((v: any) => JSON.stringify(v)).join(" | ");
  }

  if (schema.oneOf) {
    return schema.oneOf.map((s: any) => schemaToTs(s, ctx)).join(" | ");
  }
  if (schema.anyOf) {
    return schema.anyOf.map((s: any) => schemaToTs(s, ctx)).join(" | ");
  }
  if (schema.allOf) {
    return schema.allOf.map((s: any) => schemaToTs(s, ctx)).join(" & ");
  }

  switch (t) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array": {
      const itemSchema = schema.items || {};
      const itemType = schemaToTs(itemSchema, ctx);
      return `${itemType}[]`;
    }
    case "object":
    default:
      return objectToTs(schema, ctx);
  }
}

function objectToTs(schema: any, ctx: Ctx): string {
  const props = schema.properties || {};
  const req = new Set<string>(schema.required || []);
  const additional = schema.additionalProperties;
  const entries = Object.entries(props).map(([key, val]) => {
    const optional = req.has(key) ? "" : "?";
    return `  ${key}${optional}: ${schemaToTs(val, ctx)};`;
  });
  if (additional) {
    const apType = additional === true ? "unknown" : schemaToTs(additional, ctx);
    entries.push(`  [key: string]: ${apType};`);
  }
  return `{\n${entries.join("\n")}\n}`;
}

function refToTs(ref: string, ctx: Ctx): string {
  const parts = ref.split("/");
  const name = parts[parts.length - 1];
  return uniqueName(name, ctx.seenNames);
}

function uniqueName(base: string, seen: Record<string, number>) {
  const norm = base.replace(/[^A-Za-z0-9_]/g, "") || "GeneratedType";
  const count = seen[norm] ?? 0;
  seen[norm] = count + 1;
  return count === 0 ? norm : `${norm}${count + 1}`;
}
