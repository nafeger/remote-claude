# Tasks: Slack 파일 첨부 기능 및 DSL Space 키 지원

> 이 태스크 리스트는 `/tasks/0004-prd-slack-file-attachment.md` PRD를 기반으로 생성되었습니다.

## 관련 파일

### 신규 생성 파일
- `src/utils/file-validator.ts` - 파일 타입 및 크기 검증 유틸리티
- `src/utils/file-validator.test.ts` - 파일 검증 유틸리티 단위 테스트
- `src/utils/file-downloader.ts` - Slack 파일 다운로드 및 임시 저장 유틸리티
- `src/utils/file-downloader.test.ts` - 파일 다운로더 단위 테스트
- `src/handlers/file-attachment.ts` - 파일 첨부 이벤트 핸들러
- `src/handlers/file-attachment.test.ts` - 파일 첨부 핸들러 단위 테스트
- `src/__tests__/system/file-attachment-workflow.test.ts` - 파일 첨부 기능 시스템 테스트

### 수정 파일
- `src/dsl/parser.ts` - DSL 파서에 Space 키 매핑 추가
- `src/dsl/__tests__/parser.test.ts` - Space 키 파싱 테스트 추가
- `src/tmux/executor.ts` - tmux 명령 실행기에 Space 키 지원 추가
- `src/tmux/__tests__/executor.test.ts` - Space 키 실행 테스트 추가
- `src/index.ts` - Slack 메시지 이벤트 핸들러에 파일 처리 로직 추가
- `src/queue/orchestrator.ts` - Job 완료 시 임시 파일 정리 로직 추가
- `src/types/index.ts` - Job 인터페이스에 attachedFilePath 필드 추가

### 노트

#### 테스트 요구사항

**단위 테스트:**
- 단위 테스트는 코드 파일과 같은 디렉토리에 배치 (예: `file-validator.ts`와 `file-validator.test.ts`)
- Jest 테스팅 프레임워크 사용
- 각 단위 테스트는 최소 3개 테스트 케이스 포함:
  - **Happy Path:** 일반적인 성공 시나리오
  - **Boundary Conditions:** 경계값 테스트 (최소/최대값, 빈 입력, null 등)
  - **Exception Cases:** 에러 처리 및 예외 상황
  - **Side Effects:** 테스트 독립성 및 전역 상태 영향 없음 확인
- 테스트 실행: `npx jest` 또는 `npx jest [파일경로]`

**시스템 테스트:**
- PRD의 사용자 스토리를 기반으로 시스템 테스트 작성
- 최소 2개의 실제 사용자 시나리오 테스트 (US-1, US-3)
- **실제 데이터 사용** - 하드코딩 값이나 더미 데이터 금지
- 전체 워크플로우 검증 (시작부터 끝까지)

#### TDD 원칙
- **Red → Green → Refactor** 사이클 엄수
- 테스트 먼저 작성 → 최소한의 코드로 통과 → 리팩토링
- 각 커밋은 모든 테스트가 통과한 상태에서만 수행
- 구조적 변경(Structural)과 동작 변경(Behavioral)을 분리하여 커밋

## Tasks

- [x] 1.0 DSL Space 키 지원 구현 (FR-15)
  - [x] 1.1 `src/dsl/parser.ts` Space 키 타입 정의 테스트 작성
  - [x] 1.2 `src/dsl/parser.ts` KeyType에 'Space' 추가 구현
  - [x] 1.3 `src/dsl/parser.ts` Space 키 매핑 테스트 작성 (`` `s` `` → Space 변환, `` `dds` `` → Down+Down+Space, `` `sx` `` → 혼합 문자 에러)
  - [x] 1.4 `src/dsl/parser.ts` KEY_MAPPING 및 KEY_CHARS 수정 구현 (`s: 'Space'` 추가)
  - [x] 1.5 `src/tmux/executor.ts` Space 키 실행 테스트 작성 (sendSpace() → tmux send-keys Space 호출)
  - [x] 1.6 `src/tmux/executor.ts` sendSpace() 함수 구현 및 executeCommandSequence()에 Space 키 케이스 추가
  - [x] 1.7 DSL Space 키 통합 테스트 실행 및 검증

- [x] 2.0 파일 검증 유틸리티 구현 (FR-2, FR-3)
  - [x] 2.1 `src/utils/file-validator.ts` 파일 생성 및 기본 인터페이스 정의
  - [x] 2.2 파일 타입 검증 테스트 작성 (PNG/JPG/JPEG 성공, GIF/WebP/SVG 실패, 텍스트 파일 성공, 확장자 없는 경우)
  - [x] 2.3 validateFileType() 함수 구현 (MIME type 검증, 이미지/텍스트 구분)
  - [x] 2.4 파일 크기 검증 테스트 작성 (1MB 성공, 5MB 정확히 성공, 5MB+1byte 실패, 0바이트)
  - [x] 2.5 validateFileSize() 함수 구현 (5MB 제한 검증)
  - [x] 2.6 파일 검증 유틸리티 단위 테스트 전체 실행 및 검증

- [ ] 3.0 파일 다운로드 유틸리티 구현 (FR-6, FR-7, FR-14)
  - [ ] 3.1 `src/utils/file-downloader.ts` 파일 생성 및 기본 인터페이스 정의
  - [ ] 3.2 임시 디렉토리 초기화 테스트 작성 (디렉토리 생성, 권한 0700, 이미 존재하는 경우)
  - [ ] 3.3 initTempDirectory() 함수 구현 (`/tmp/remote-claude/` 생성 및 권한 설정)
  - [ ] 3.4 Slack 파일 다운로드 테스트 작성 (정상 다운로드, 네트워크 오류, 인증 실패 - mock 사용)
  - [ ] 3.5 downloadSlackFile() 함수 구현 (Slack API url_private_download 호출, 에러 핸들링)
  - [ ] 3.6 임시 파일 저장 테스트 작성 (UUID 파일명, 권한 0600, 특수문자 파일명 처리)
  - [ ] 3.7 saveToTempFile() 함수 구현 (UUID 생성, 파일 저장, 권한 설정)
  - [ ] 3.8 파일 다운로드 유틸리티 단위 테스트 전체 실행 및 검증

- [ ] 4.0 파일 첨부 핸들러 구현 (FR-1, FR-4, FR-5, FR-8, FR-9, FR-11)
  - [ ] 4.1 `src/handlers/file-attachment.ts` 파일 생성 및 기본 인터페이스 정의
  - [ ] 4.2 파일 첨부 감지 테스트 작성 (files 배열 존재 시 감지, files 없을 때 무시)
  - [ ] 4.3 단일 파일 처리 테스트 작성 (1개 파일 처리, 여러 파일 중 첫 번째만 처리)
  - [ ] 4.4 프롬프트 필수 검증 테스트 작성 (파일+프롬프트 정상, 파일만 에러)
  - [ ] 4.5 프롬프트 생성 테스트 작성 (이미지: `@/path\n\nprompt`, 텍스트: 동일 형식)
  - [ ] 4.6 handleFileAttachment() 함수 구현 (파일 검증 → 다운로드 → 프롬프트 생성 통합)
  - [ ] 4.7 에러 메시지 테스트 작성 (타입 불일치, 크기 초과, 다운로드 실패, 프롬프트 없음)
  - [ ] 4.8 에러 핸들링 구현 (FR-11의 모든 에러 케이스 처리)
  - [ ] 4.9 파일 첨부 핸들러 단위 테스트 전체 실행 및 검증

- [ ] 5.0 시스템 통합 및 임시 파일 정리 (FR-10, FR-12, FR-13)
  - [ ] 5.1 `src/types/index.ts` Job 인터페이스에 attachedFilePath 필드 추가
  - [ ] 5.2 `src/index.ts` 파일 이벤트 핸들러 테스트 작성 (message 이벤트에서 files 배열 감지)
  - [ ] 5.3 `src/index.ts` Slack 메시지 이벤트 핸들러 수정 (handleFileAttachment() 호출 추가)
  - [ ] 5.4 `src/queue/orchestrator.ts` Job 정리 로직 테스트 작성 (Job 완료/실패/취소 시 임시 파일 삭제)
  - [ ] 5.5 `src/queue/orchestrator.ts` cleanupTempFile() 함수 구현 및 executeJob()에 try-catch-finally 패턴 적용
  - [ ] 5.6 로깅 추가 (파일 다운로드 시작/완료, 파일 정보, 임시 파일 경로, 에러)
  - [ ] 5.7 시스템 테스트 작성 - US-1: 이미지 첨부 워크플로우 (PNG + "이 이미지를 분석해줘")
  - [ ] 5.8 시스템 테스트 작성 - US-3: 로그 파일 첨부 워크플로우 (.log + "이 로그를 분석해줘")
  - [ ] 5.9 시스템 테스트 작성 - US-6: Space 키 워크플로우 (`` `s` `` 입력 → Space 키 실행)
  - [ ] 5.10 전체 시스템 테스트 실행 및 실제 데이터로 검증
  - [ ] 5.11 프로덕션 통합 검증 (Slack 이벤트 → 파일 처리 → Claude Code 전달 경로 추적)
