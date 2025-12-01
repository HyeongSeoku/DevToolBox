export type ParsedProperty = {
  name: string;
  optional: boolean;
  type: string;
};

export type ParsedInterface = {
  name: string;
  properties: ParsedProperty[];
};

export type JSDocMode = "typedef" | "param";

export type JSDocOptions = {
  mode: JSDocMode;
  rootName: string;
  rootParam: string;
  simplifyTypes: boolean;
  autoDescription: boolean;
  detectSetter: boolean;
};

export type JSDocResult = {
  code: string;
  error?: string;
};
