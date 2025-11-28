# ============================================

# TASK.md (개발 태스크 문서)

# ============================================

## 전체 구조 태스크

### 1. Tauri + React 프로젝트 초기 세팅

- [ ] Tauri(V2) + React(Vite) 프로젝트 생성
- [ ] 타입스크립트 + eslint/prettier 설정
- [ ] alias("@/") 설정
- [ ] Zustand or Jotai 기본 세팅
- [ ] UI 기본 레이아웃 구성 (좌측 사이드바 + 메인 페이지)

---

## 2. Vault 폴더 시스템

- [ ] 기본 Vault 생성 (~/Library/Application Support/DevToolBox)
- [ ] 사용자 지정 Vault 경로 설정 페이지
- [ ] settings.json 읽기/저장 로직
- [ ] 파일 생성/삭제/이동 유틸 제작 (`fs-extra` or Rust layer)

---

## 3. 각 기능 모듈 개발 태스크

---

## A. JSON Formatter

- [ ] JSON prettify/minify
- [ ] JSON 에러 하이라이팅
- [ ] JSON Diff (선택)
- [ ] History 저장

---

## B. GIF Converter

- [ ] ffmpeg 바이너리 포함
- [ ] Rust에서 ffmpeg subprocess 실행
- [ ] 진행률 parsing
- [ ] GIF 설정 UI
- [ ] History 저장

---

## C. JWT Decoder

- [ ] Base64URL decode
- [ ] payload timestamp readable 변환
- [ ] UI 구성

---

## D. Text Converter

- [ ] 문자열 케이스 변환기
- [ ] prefix/suffix 기능
- [ ] 여러 줄 처리

---

## E. Hash & Encoding

- [ ] SHA / MD5 / Base64 / URL encode/decode
- [ ] HMAC(secret 입력) 처리

---

## F. API Client (v1)

- [ ] Request 생성 UI
- [ ] Response UI
- [ ] cURL ↔ Request 변환기
- [ ] Preset 저장 구조

---

## G. TypeGen

- [ ] JSON → TS 타입 추론기
- [ ] Swagger/OpenAPI Parser
- [ ] TypeScript 코드 생성기(AST → string)
- [ ] 프리뷰 UI
- [ ] 파일 저장
- [ ] 단일/다중 파일 모드

---

## H. Regex Tester

- [ ] Regex 실행 엔진
- [ ] 캡처 그룹 표시
- [ ] highlight UI

---

## I. .env Manager

- [ ] env 파일 파서
- [ ] 누락 key 검출
- [ ] value 마스킹

---

## J. 로그인 뷰어 + tail

- [ ] 파일 스트림 처리
- [ ] tail -f 구현
- [ ] 필터 기능
- [ ] 색상 규칙

---
