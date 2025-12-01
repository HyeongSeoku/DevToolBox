import { type Snippet } from "../types";

export const feSeedCore: Snippet[] = [
  {
    id: "fe-date-dayjs",
    title: "dayjs 포매팅",
    tags: ["date", "dayjs", "js"],
    language: "ts",
    content: "dayjs().format('YYYY-MM-DD HH:mm:ss')",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "Date",
    source: "builtin",
  },
  {
    id: "fe-fetch-json",
    title: "fetch JSON",
    tags: ["http", "fetch"],
    language: "ts",
    content: "const res = await fetch('/api');\nconst data = await res.json();",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "HTTP",
    source: "builtin",
  },
  {
    id: "fe-debounce-hook",
    title: "React debounce 훅",
    tags: ["react", "hooks", "debounce"],
    language: "ts",
    content:
      "function useDebounce<T>(value:T, delay=300){\n const [v,setV]=useState(value);\n useEffect(()=>{const id=setTimeout(()=>setV(value),delay);return()=>clearTimeout(id);},[value,delay]);\n return v;\n}",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "Hooks",
    source: "builtin",
  },
];
