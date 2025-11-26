# Dev Toolbox – 로컬 개발 유틸리티 앱 PRD

## 0. 개요

**Dev Toolbox**는 FE/BE 개발자가 자주 사용하는 유틸리티들을
하나의 데스크탑 앱에서 빠르게 사용할 수 있도록 제공하는 **로컬 개발 도구 모음**이다.

- macOS용 **Electron** 앱으로 시작
- 모든 처리(파일 변환/암호/포매팅 등)는 **100% 로컬 처리**
- 나중에 iOS 앱과 동기화할 수 있도록 **폴더 기반 데이터 구조(Vault)** 로 설계
- iCloud Drive 연동은 “특수 API”가 아니라,
  사용자가 “iCloud Drive 안의 폴더”를 선택하면 그대로 동기화되도록 구성

---

## 1. 타겟 사용자 & 목적

### 1.1 타겟

- 프론트엔드/백엔드 개발자
- 사내 개발자, 클라이언트 개발자, 개인 프로젝트 개발자
- 빠르게 JSON/JWT/API 테스트/미디어 변환 등을 처리하고 싶은 사용자

### 1.2 목적

- 웹툴 수십 개 사용하지 않아도 되는 **올인원 개발 유틸 앱**
- 모든 기능을 로컬(오프라인)에서 안전하게 처리
- 민감 정보(JWT, .env, 로그 등) 서버 전송 없이 사용 가능
- iOS/Windows 버전에서도 동일한 **데이터 구조로 동기화** 가능

---

## 2. 핵심 설계 철학 — 폴더 기반 Vault 구조

### 2.1 Vault 개념

Electron 앱의 모든 데이터는 **하나의 폴더(= Vault)** 안에 파일로 저장한다.

예상 폴더 구조:

```text
DevToolboxVault/
  settings.json

  snippets/
    javascript.json
    react.json
    sql-queries.json

  api-presets/
    dev.json
    stage.json
    prod.json

  history/
    gif-convert/
      2025-11-21-001.json
    image-convert/
      2025-11-21-002.json
    json-format/
      2025-11-21-003.json

  palettes/
    default.json
```
