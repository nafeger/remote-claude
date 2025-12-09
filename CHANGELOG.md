# 변경 이력 (Changelog)

이 파일은 프로젝트의 주요 변경사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
버전 관리는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

## [Unreleased]

### Added
- Slack 파일 첨부 기능 (v0.3.0)
  - PNG/JPG/JPEG 이미지 파일 지원
  - 텍스트 파일 (.txt, .log, .md 등) 지원
  - 파일 타입 및 크기 검증 (최대 5MB)
  - Slack 파일 다운로드 및 임시 저장
  - Job 완료 시 임시 파일 자동 정리
  - 파일 첨부 핸들러 및 에러 처리
- DSL Space 키 지원 (v0.3.0)
  - `` `s` `` 문법으로 Space 키 전송
  - 다른 키와 조합 가능 (예: `` `dds` `` → Down+Down+Space)
- 오픈소스 공개를 위한 필수 파일 추가
  - LICENSE 파일 (ISC 라이선스)
  - CODE_OF_CONDUCT.md (행동 강령)
  - CONTRIBUTING.md (기여 가이드)
  - THIRD-PARTY-LICENSES.md (서드파티 라이선스)
  - CHANGELOG.md (변경 이력)
  - TESTING_GUIDE.md (파일 첨부 및 DSL Space 키 테스트 가이드)

### Changed
- package.json에 author 필드 추가
- README.md 라이선스 섹션 업데이트
- Job 인터페이스에 attachedFilePath 필드 추가
- 메시지 이벤트 리스너에 파일 첨부 감지 로직 추가

### Fixed
- 파일 첨부 메시지 처리 순서 수정
  - 문제: message.subtype 필터가 file_share 이벤트를 조기 차단
  - 해결: 파일 첨부 체크를 subtype 필터보다 먼저 수행하도록 순서 변경
  - 영향: files 배열이 있는 메시지가 정상적으로 처리됨
- tmux paste-buffer를 사용하여 멀티라인 메시지 Enter 인식 문제 해결
  - Bracketed Paste Mode 대신 tmux 네이티브 기능 사용
  - 줄바꿈이 올바르게 보존되도록 개선

### Security
- Slack files:read 권한 추가 필요 (파일 다운로드를 위해)

## [0.2.0] - 2025-11-07

### Added
- 실시간 진행 상황 추적 시스템 (ProgressTracker)
  - 5초 주기 폴링, SHA-256 해시 기반 변경 감지
  - 1시간 타임아웃, 완전한 에러 처리
- 대용량 메시지 분할 및 전송 (message-splitter)
  - 백틱 충돌 방지, 3500자 기준 분할
  - 500ms 간격 전송, Rate limit 에러 처리
- 파일 다운로드 기능
  - 파일 목록 선택 UI (모달)
  - 보안 검증 (.env, .git 파일 차단)
  - 5MB 크기 제한
  - 파일 존재 여부 검증
- 인터랙티브 버튼 시스템
  - 상태 확인 버튼
  - 작업 취소 버튼
  - 파일 다운로드 버튼

### Changed
- /state 명령 기본 출력 라인 수 30 → 80으로 변경
- 상태 버튼 클릭 시 출력 라인 수 30 → 80으로 수정
- 메시지 분할 크기를 2500자로 조정하여 Slack Block Kit 제한 준수
- 파일 다운로드 모달 옵션 텍스트 75자 제한 적용

### Fixed
- Claude Code 프롬프트 전송 시 Enter 2번 전송 문제 해결
- 분할 메시지는 마지막에만 인터랙티브 버튼 추가
- /state 명령어에 message-splitter 적용하여 대용량 메시지 분할 처리
- 상태 버튼 응답에 인터랙티브 버튼 추가
- blocks 형식 지원을 위한 테스트 수정

## [0.1.0] - 2025-11-04

### Added
- Slack Bot을 통한 Claude Code 원격 제어 기능
- tmux 세션 관리
  - 프로젝트별 독립 세션
  - 자동 세션 생성 및 복구
- 작업 큐 시스템
  - 채널별 FIFO 큐
  - 순차 실행 보장
- Slack 명령어
  - `/setup`: 채널-프로젝트 연결
  - `/unsetup`: 채널 설정 해제
  - `/state`: 상태 확인
  - `/snippet`: 스니펫 관리
  - `/run`: 스니펫 실행
  - `/ask`: 즉석 프롬프트
  - `/download`: 파일 다운로드
  - `/cancel`: 작업 취소
  - `/help`: 도움말
- 프롬프트 스니펫 시스템
  - 자주 사용하는 프롬프트 저장
  - 스니펫 생성/수정/삭제
- 상태 복구 시스템
  - 재시작 시 자동 상태 복구
  - 진행 중인 작업 재개
- 로깅 시스템 (Winston)
  - 파일 로깅 (combined.log, error.log)
  - 콘솔 출력
- 설정 관리
  - 채널-프로젝트 매핑 (config.json)
  - 스니펫 저장 (snippets.json)
  - 세션 상태 (state.json)

### Security
- .env 파일을 통한 토큰 관리
- 민감정보 Git 제외 (.gitignore)
- 토큰 마스킹 출력

---

## 버전 관리 규칙

### 버전 번호: MAJOR.MINOR.PATCH

- **MAJOR**: 하위 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

### 변경사항 분류

- **Added**: 새로운 기능
- **Changed**: 기존 기능 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경

---

[Unreleased]: https://github.com/dh1789/remote-claude/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/dh1789/remote-claude/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/dh1789/remote-claude/releases/tag/v0.1.0
