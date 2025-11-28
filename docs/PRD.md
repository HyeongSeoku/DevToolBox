# ============================================

# PRD.md

# DevToolBox – FE/BE 개발자용 데스크탑 유틸리티 앱

# ============================================

## 0. Overview

**DevToolBox**는 FE/BE 개발자가 매일 사용하는 **반복적이고 귀찮은 작업**을  
하나의 “올인원 데스크탑 앱”에서 빠르게 처리할 수 있도록 설계된 **오프라인 퍼스트(Local-First) 개발 유틸리티**이다.

- 플랫폼: **Tauri(백엔드 Rust) + React 프론트엔드(Vite 기반 SPA)**
- OS: macOS 우선, Windows/Linux 확장 고려
- 데이터 저장: **폴더 기반 Vault 구조**  
  → iCloud Drive 폴더 선택 시 자동 동기화
- 모든 기능은 **100% 로컬에서 처리**  
  (JWT/로그/환경변수 등 민감 정보는 절대로 외부 전송 없음)

---

# 1. Target User

### Primary Users

- 프론트엔드 개발자
- 백엔드 개발자
- 인프라 엔지니어 / DevOps
- 개인 개발자 / 사이드 프로젝트 유저

### User Goals

- 매번 사이트/CLI 열지 않고 필요한 개발 기능을 **빠르게** 처리
- JSON / JWT / cURL / API 테스트 / GIF 변환 등  
  “개발자가 항상 하는 작업”을 한 곳에서 처리
- 민감 데이터도 **오프라인 환경에서 안전하게** 작업
- 여러 기기(iCloud)를 사용해도 데이터가 자연스럽게 유지되도록

---

# 2. Core Product Philosophy

## 2.1 Local-First

- 모든 데이터는 로컬 OS 파일시스템에 저장
- Vault 폴더 변경 가능
- iCloud 동기화는 OS의 전자동 기능을 활용

## 2.2 Folder-Based Vault

### 예시 구조

```
DevToolboxVault/
  settings.json

  snippets/
    javascript.json
    curl-collections.json
    sql.json

  api-presets/
    dev.json
    stage.json
    prod.json

  history/
    gif-convert/
      2025-11-21-001.json
    json-format/
      2025-11-21-002.json
```

장점:

- 이해하기 쉬움
- JSON 파일 그대로 migration 가능한 구조
- iCloud/Dropbox/OneDrive 폴더 선택만 하면 자동 sync

---

# 3. Major Features

---

## A. 미디어/리소스 유틸

### A-1. Video → GIF Converter (MVP)

- 입력: mp4, mov, webm
- 옵션:
  - FPS
  - Width (height 자동 계산)
  - Crop/Trim
  - 품질 프리셋
- 기능:
  - ffmpeg 기반 처리
  - 진행률 표시
  - 결과물 Finder 열기
  - 히스토리 저장 `/history/gif-convert/*.json`

### A-2. 이미지 변환/최적화

- PNG/JPG/WebP/AVIF 변환
- 대량 변환
- 품질/리사이즈 옵션
- 히스토리 `/history/image-convert/*`

---

## B. FE 개발 유틸

### B-1. JSON 포매터 & 뷰어

- Prettify / Minify
- JSON Diff (좌/우 비교)
- 구조 트리뷰
- 히스토리 저장

### B-2. API Client (경량 Postman)

- Method, URL, Headers, Query, JSON Body
- Response: Status, Headers, Body
- cURL 붙여넣기 → Request 자동 변환
- 환경 Preset 저장(`/api-presets/*`)

### B-3. TypeGen (API → TypeScript 타입 생성기)

- Swagger/OpenAPI/Redoc URL 가져오기
- JSON 샘플 기반 자동 타입 생성
- Output:
  - type/interface 선택
  - 단일 파일 or 다중 파일 출력
- 내부 알고리즘:
  - schema 파싱
  - JSON 구조 → TS AST → string builder

### B-4. JWT 디코더

- Header/Payload 표시
- exp/iat readable 변환
- 서버 전송 없음 (완전 오프라인)

### B-5. 디자인 개발 툴

- HEX/RGB/HSL 색 변환
- 팔레트 저장
- Gradient/Shadow 생성기

---

## C. 백엔드/DevOps 유틸

### C-1. 해시 및 인코딩

- SHA256 / SHA1 / SHA512
- MD5
- Base64 Encode/Decode
- URL Encode/Decode
- HMAC(secret 기반)

### C-2. 로그 뷰어 + Tail

- 특정 log 파일 열기
- tail -f 실시간 스트리밍
- 키워드 필터
- “최근 열어본 로그” 히스토리 저장

### C-3. SQL 스니펫 저장소

- sql.json 저장 및 카테고리 관리
- Param placeholder 치환 기능

---

## D. 기타 개발 유틸

### D-1. 텍스트 변환기

- snake_case, camelCase, pascalCase, kebab-case 변환
- prefix/suffix
- 공백/줄 정리

### D-2. Regex Tester

- 입력/패턴/매칭 결과 UI

### D-3. .env 비교/관리

- `.env` ↔ `.env.example` 비교
- 누락 key 표시
- 마스킹 모드
- 자동 정렬

---

# 4. MVP Definition

## 🎯 MVP Phase 1

- GIF 변환기
- JSON 포매터
- JWT 디코더
- 텍스트 변환기
- 해시/암호화
- Vault 저장 시스템
- 기본 UI Layout + Sidebar Navigation

## 🎯 MVP Phase 2

- 이미지 변환기
- API Client(Lite)
- Regex Tester
- .env 비교 도구

## 🎯 MVP Phase 3

- TypeGen v1
- 로그 뷰어
- SQL 스니펫

---

# 5. Non Functional Requirements

## 보안

- 절대 서버 송신 없음
- JWT, API Key, 로그 등 민감 정보는 항상 로컬에서 처리

## 성능

- ffmpeg는 subprocess로 실행하여 UI 블락 없도록
- 대용량 JSON이라도 1초 내 렌더링

## 오프라인 퍼스트

- 네트워크 없어도 전체 기능 구동
- 업데이트만 온라인 필요

## 확장성

- 각 기능은 모듈 단위 + 독립 디렉토리
- 플러그인처럼 새 기능 추가 구조

## UX

- VSCode-like UI
- Command Palette(빠른 실행)
- 자동 다크모드

---

# 6. Long-term Roadmap

## v1.x (macOS 완성)

- 주요 유틸 + Vault 시스템
- 안정화, 성능 개선
- Window/Linux 빌드 확장

## v2.x (iOS 대응)

- 동일 Vault 폴더 접근
- iCloud Drive 자동 싱크
- 간단한 기능부터 iOS 버전을 제공

---
