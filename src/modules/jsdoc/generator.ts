import { describeProperty, isSetter, mapTypeToJSDoc } from "./rules";
import { type JSDocOptions, type ParsedInterface } from "./types";

export function generateJSDoc(
  parsed: ParsedInterface[],
  options: JSDocOptions,
): string {
  if (!parsed.length) return "// 인터페이스를 찾지 못했습니다.";
  const target = parsed[0];
  const {
    mode,
    rootName,
    rootParam,
    simplifyTypes,
    autoDescription,
    detectSetter,
  } = options;
  const name = rootName || target.name || "Root";

  if (mode === "interface") {
    const baseName = name.replace(/Props$/, "") || name;
    const header =
      baseName === name ? `${name} interface.` : `${baseName} component props.`;
    const lines: string[] = [`/**`, ` * ${header}`, ` */`, `export interface ${name} {`];
    target.properties.forEach((prop) => {
      const desc = describeProperty(prop, {
        auto: autoDescription,
        isSetter: detectSetter && isSetter(prop.name),
      });
      lines.push(`  /** ${desc} */`);
      lines.push(
        `  ${prop.name}${prop.optional ? "?" : ""}: ${prop.type.trim()};`,
      );
    });
    lines.push("}");
    return lines.join("\n");
  }

  if (mode === "typedef") {
    const lines: string[] = [`/**`, ` * @typedef {Object} ${name}`];
    target.properties.forEach((prop) => {
      const type = mapTypeToJSDoc(prop.type, simplifyTypes);
      const isSet = detectSetter && isSetter(prop.name);
      const desc = describeProperty(prop, {
        auto: autoDescription,
        isSetter: isSet,
      });
      lines.push(` * @property {${type}} ${prop.name} - ${desc}`);
    });
    lines.push(" */");
    return lines.join("\n");
  }

  // param 모드
  const paramRoot = rootParam || "props";
  const lines: string[] = ["/**"];
  target.properties.forEach((prop) => {
    const type = mapTypeToJSDoc(prop.type, simplifyTypes);
    const isSet = detectSetter && isSetter(prop.name);
    const desc = describeProperty(prop, {
      auto: autoDescription,
      isSetter: isSet,
    });
    lines.push(` * @param {${type}} ${paramRoot}.${prop.name} - ${desc}`);
  });
  lines.push(" */");
  return lines.join("\n");
}
