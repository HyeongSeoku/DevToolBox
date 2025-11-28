export type Snippet = {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  language?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  source: "vault" | "custom" | "builtin";
};

export type SnippetFile = {
  snippets: Snippet[];
  name?: string;
};

export type SnippetFilter = {
  search?: string;
  tags?: string[];
  language?: string;
  category?: string;
};
