# ============================================

# CODEX.md (Codex/AI 모델 사용 규칙 문서)

# ============================================

## 목적

이 문서는 **AI 코드 엔진(Claude, Codex, ChatGPT Code Model)**에게  
DevToolBox 프로젝트에서 **어떻게 코드 생성/수정 요청해야 하는지** 정의한 문서이다.

---

# 1. 프롬프트 기본 규칙

### 1) 항상 컨텍스트 제공

AI에게 다음 두 가지를 반드시 알려야 한다:

- “현재 어떤 기능 모듈을 작업 중인지”
- “관련 문서(PRD, TASK, TECH 스펙 등)의 어떤 섹션을 기반으로 구현하는지”

예:

```
지금 DevToolBox의 TypeGen 모듈을 만들고 있어.
아래는 TECH_SPEC.md의 'JSON Type Inference' 섹션이야:
(붙여넣기)
이걸 기준으로 inferTypeFromJson.ts 파일을 만들어줘.
```

---

### 2) 파일 단위로 요청

한 번 요청할 때 AI가 다루는 파일은 **1개만** 지정한다.

예:

```
src/modules/typegen/lib/inferTypeFromJson.ts 파일을 완전히 다시 작성해줘.
```

---

### 3) 입력/출력 명확히 지시

- “전체 코드로 작성”
- “추가 설명 없이 파일만 출력”
- “어디에 import가 필요한지 알려줘”

---

### 4) 문서 섹션과 코드 동기화 요청 가능

예:

```
아래는 PRD.md의 TypeGen 요구사항이고
아래는 현재 parseOpenApi.ts야.
둘의 차이를 리스트업하고 수정 방향을 제안해줘.
```

AI가 자동 리뷰어처럼 작동함.

---

# 2. AI에게 맡기면 좋은 작업

### ✔ boilerplate 생성

- UI 컴포넌트 틀
- Rust tauri command struct
- TypeScript type/interface

### ✔ 복잡한 문자열 처리 로직

- JSON → TS 타입 변환기
- Swagger 스키마 파서
- Regex 생성기

### ✔ 코드 리팩토링/최적화

- 파일 구조 재배치
- 모듈화
- 타입 정리

---

# 3. AI에게 맡기지 말아야 할 작업

### ✘ 보안 관련 기능

- encryption key handling
- filesystem path 유출 가능성 있는 코드

### ✘ OS 특수 기능

- iCloud container 접근 (반드시 직접 검증)

---

# 4. AI 요청 템플릿

### A) 파일 생성 요청 템플릿

```
다음 문서를 기반으로 파일을 생성해줘:
- PRD.md: (관련 부분)
- TECH_SPEC.md: (관련 부분)

파일 위치:
src/modules/typegen/lib/inferTypeFromJson.ts

요구사항:
1. inferTypeFromJson(value) 구현
2. TsTypeNode 타입 정의
3. printTsType 함수 포함
4. 전체 코드를 TypeScript로 출력
```

### B) 코드 수정 요청 템플릿

```
아래는 현재 소스 코드야:
(코드)

문서 TECH_SPEC.md의 (Swagger Parsing) 섹션 기준으로
- 미구현 기능을 완성하고
- 타입 안정성을 강화해줘.

전체 코드를 다시 작성해줘.
```

### C) UI 생성 템플릿

```
UI_UX_SPEC.md 'GIF Converter UI' 섹션을 기반으로
GIFConverterPage.tsx 파일을 만들어줘.

요구사항:
- 좌측 옵션 입력
- 우측 결과 프리뷰
- ffmpeg 진행률 표시
전체 React 코드로 출력해줘.
```

---

# 5. 주의사항

- AI가 생성하는 함수/파일은 반드시 **Vault 경로를 외부에서 주입받도록**  
  직접 경로 하드코딩 금지
- OS별 경로 규칙(macOS, Windows)을 항상 고려
- 외부 서버 요청 금지
- ffmpeg subprocess 실행 시 stdout/stderr 스트림을 UI에서 받기 쉽게 파싱

---

# ======================

# END

# ======================
