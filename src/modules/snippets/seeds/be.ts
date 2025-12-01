import { type Snippet } from "../types";

export const beSeedCore: Snippet[] = [
  {
    id: "be-express-handler",
    title: "Express 기본 핸들러",
    tags: ["express", "node", "http"],
    language: "ts",
    content: "app.get('/health', (_req, res) => res.json({ ok: true }));",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "HTTP",
    source: "builtin",
  },
  {
    id: "be-nest-guard",
    title: "Nest Auth Guard",
    tags: ["nest", "auth"],
    language: "ts",
    content:
      "@Injectable()\nexport class AuthGuard implements CanActivate {\n  canActivate(ctx: ExecutionContext) {\n    const req = ctx.switchToHttp().getRequest();\n    return Boolean(req.user);\n  }\n}",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "Auth",
    source: "builtin",
  },
  {
    id: "be-pino-logger",
    title: "pino 로거",
    tags: ["logging", "pino"],
    language: "ts",
    content:
      "import pino from 'pino';\nexport const logger = pino({ level: 'info' });",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: "Logging",
    source: "builtin",
  },
];
