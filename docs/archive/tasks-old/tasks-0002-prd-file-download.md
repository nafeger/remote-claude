# Task List: 프로젝트 파일 다운로드 기능

PRD: `0002-prd-file-download.md`

## Relevant Files

### 새로 생성할 파일
- `src/utils/file-security.ts` - 파일 경로 보안 검증 유틸리티 (Path traversal 방지, 민감한 파일 차단)
- `src/utils/__tests__/file-security.test.ts` - file-security 유닛 테스트
- `src/handlers/file-download.ts` - 파일 다운로드 핸들러 (Slack 파일 업로드, 에러 처리)
- `src/handlers/__tests__/file-download.test.ts` - file-download 핸들러 유닛 테스트

### 수정할 파일
- `src/index.ts` - `/download` 슬래시 커맨드 등록 및 통합

### Notes

#### Testing Requirements

**유닛 테스트:**
- 유닛 테스트는 테스트 대상 파일과 같은 디렉토리 내 `__tests__` 폴더에 위치합니다.
- 모든 구현은 Jest 테스트 프레임워크를 사용합니다.
- 각 유닛 테스트 스위트는 최소 3가지 테스트 케이스를 포함해야 합니다:
  - **Happy Path:** 가장 일반적이고 예상되는 시나리오가 올바르게 작동하는지 확인
  - **Boundary Conditions:** 최솟값, 최댓값, 빈 입력, null 값 등 경계 조건 테스트
  - **Exception Cases:** 잘못된 입력, 에러 조건, 예외 상황에 대한 적절한 에러 처리 검증
  - **Side Effects:** 테스트 독립성 보장 (테스트 간 간섭 없음) 및 전역 상태나 외부 시스템에 영향을 주지 않는지 확인
- Jest 테스트 실행: `npx jest [optional/path/to/test/file]` (경로 없이 실행 시 모든 테스트 실행)

**시스템 테스트:**
- PRD의 사용자 스토리를 기반으로 시스템 테스트 생성
- 최소 2개의 실제 사용자 시나리오를 테스트
- **실제 데이터를 사용하여 검증** - 하드코딩된 값이나 더미 데이터 사용 금지
- 시작부터 끝까지 완전한 사용자 워크플로우 검증
- 시스템 테스트는 모든 컴포넌트 통합 및 기능의 end-to-end 동작을 검증해야 함

## Tasks

- [x] 1.0 보안 검증 유틸리티 구현
  - [x] 1.1 `src/utils/file-security.ts` 파일 생성 및 기본 구조 설정
  - [x] 1.2 민감한 파일 패턴 상수 정의 (`.env`, `*.key`, `*.pem`, `credentials`, `password`, `.ssh/`, `id_rsa`, `.git/config`)
  - [x] 1.3 `validateFilePath()` 함수 구현 - 빈 경로 검증
  - [x] 1.4 `validateFilePath()` 함수 구현 - `path.resolve()`를 사용한 절대 경로 변환
  - [x] 1.5 `validateFilePath()` 함수 구현 - Path traversal 공격 방지 (프로젝트 디렉토리 내부 확인)
  - [x] 1.6 `validateFilePath()` 함수 구현 - 민감한 파일 패턴 매칭 및 차단
  - [x] 1.7 `validateFilePath()` 함수 구현 - 파일 존재 여부 확인 (`fs.existsSync()`)
  - [x] 1.8 `validateFilePath()` 함수 구현 - 디렉토리 여부 확인 (`fs.statSync().isDirectory()`)
  - [x] 1.9 `validateFilePath()` 함수 구현 - 파일 크기 제한 검증 (10MB 이하)
  - [x] 1.10 `validateFilePath()` 함수 구현 - 에러 메시지 반환 로직 (각 검증 실패 케이스별 한글 메시지)
  - [x] 1.11 TypeScript 타입 정의 추가 (`ValidationResult` 인터페이스)
  - [x] 1.12 JSDoc 주석 추가 (함수 설명, 파라미터, 반환값)

- [x] 2.0 파일 다운로드 핸들러 구현
  - [x] 2.1 `src/handlers/file-download.ts` 파일 생성 및 기본 구조 설정
  - [x] 2.2 필요한 import 추가 (`@slack/bolt`, `fs`, `path`, `getLogger`, `validateFilePath`)
  - [x] 2.3 `handleFileDownload()` 함수 기본 구조 구현 (함수 시그니처, 파라미터)
  - [x] 2.4 채널 설정 존재 여부 확인 로직 구현 (ChannelConfig 검증)
  - [x] 2.5 `validateFilePath()` 호출 및 검증 결과 처리
  - [x] 2.6 검증 실패 시 Slack 에러 메시지 전송 로직 구현
  - [x] 2.7 작업 시작 메시지 전송 (`⏳ 파일을 다운로드하는 중입니다...`)
  - [x] 2.8 파일 스트림 생성 (`fs.createReadStream()`)
  - [x] 2.9 Slack `files.uploadV2()` API 호출 구현 (channel_id, file, filename, title, initial_comment)
  - [x] 2.10 파일 업로드 성공 시 완료 메시지 전송 (`✅ 파일 다운로드 완료`)
  - [x] 2.11 파일 읽기 권한 오류 처리 (`❌ 파일 읽기 권한이 없습니다.`)
  - [x] 2.12 Slack API 업로드 실패 에러 처리 (`❌ 파일 업로드에 실패했습니다.`)
  - [x] 2.13 모든 단계에서 `getLogger().error()` 로 에러 로깅
  - [x] 2.14 try-catch 블록으로 전체 에러 핸들링 구현
  - [x] 2.15 TypeScript 타입 정의 및 JSDoc 주석 추가

- [x] 3.0 슬래시 커맨드 통합
  - [x] 3.1 `src/index.ts` 파일에서 `/download` 커맨드 핸들러 영역 추가
  - [x] 3.2 `handleFileDownload` import 추가
  - [x] 3.3 `/download` 슬래시 커맨드 리스너 등록 (`app.command('/download')`)
  - [x] 3.4 커맨드 인자에서 파일 경로 추출 (`command.text`)
  - [x] 3.5 빈 경로 입력 시 사용법 안내 메시지 전송 (`사용법: /download <filepath>`)
  - [x] 3.6 StateManager에서 ChannelConfig 가져오기
  - [x] 3.7 채널 미설정 시 에러 메시지 전송 (`⚠️ 먼저 /setup 명령으로 프로젝트를 설정해주세요.`)
  - [x] 3.8 `handleFileDownload()` 함수 호출 (app, channelId, channelConfig, filePath 전달)
  - [x] 3.9 Slack `ack()` 응답 처리 (즉시 응답으로 타임아웃 방지)
  - [x] 3.10 에러 발생 시 로깅 및 사용자에게 일반 에러 메시지 전송

- [x] 4.0 유닛 테스트 구현
  - [x] 4.1 `src/utils/__tests__/file-security.test.ts` 생성 및 Jest 설정
  - [x] 4.2 테스트 픽스처 설정 (임시 테스트 디렉토리 및 파일 생성 헬퍼)
  - [x] 4.3 Happy Path 테스트 1: 유효한 상대 경로 입력 시 절대 경로 반환 검증
  - [x] 4.4 Happy Path 테스트 2: 중첩된 디렉토리 경로 처리
  - [x] 4.5 Happy Path 테스트 3: 프로젝트 루트의 파일 접근
  - [x] 4.6 Boundary Conditions 테스트 1: 빈 파일명 입력
  - [x] 4.7 Boundary Conditions 테스트 2: 정확히 10MB 크기의 파일
  - [x] 4.8 Boundary Conditions 테스트 3: 10MB + 1 byte 크기의 파일
  - [x] 4.9 Exception Cases 테스트 1: Path traversal 공격 시도 (`../../etc/passwd`)
  - [x] 4.10 Exception Cases 테스트 2: 민감한 파일 접근 시도 (`.env`, `*.key`, `credentials`)
  - [x] 4.11 Exception Cases 테스트 3: 존재하지 않는 파일
  - [x] 4.12 Exception Cases 테스트 4: 디렉토리 경로 입력
  - [x] 4.13 Side Effects 테스트: 함수 호출 후 파일 시스템 상태 변화 없음 확인
  - [x] 4.14 Side Effects 테스트: 전역 변수 변경 없음 확인
  - [x] 4.15 Side Effects 테스트: 여러 번 호출 시 동일 입력에 대해 동일 결과 반환 확인
  - [x] 4.16 `src/handlers/__tests__/file-download.test.ts` 생성 및 Jest 설정
  - [x] 4.17 Slack API Mock 설정 (`app.client.files.uploadV2`, `app.client.chat.postMessage`)
  - [x] 4.18 Happy Path 테스트: 정상 파일 다운로드 플로우 검증 (Mock 응답 설정, API 호출 검증)
  - [x] 4.19 Exception Cases 테스트 1: 채널 설정 없음 시 에러 처리
  - [x] 4.20 Exception Cases 테스트 2: Slack API 업로드 실패 시 에러 메시지 전송
  - [x] 4.21 Exception Cases 테스트 3: 파일 읽기 권한 오류 처리
  - [x] 4.22 모든 유닛 테스트 실행 및 통과 확인 (`npx jest src/utils/__tests__/file-security.test.ts`)
  - [x] 4.23 모든 유닛 테스트 실행 및 통과 확인 (`npx jest src/handlers/__tests__/file-download.test.ts`)

- [x] 5.0 시스템 테스트 구현
  - [x] 5.1 시스템 테스트 환경 준비 (테스트 Slack 채널, 테스트 프로젝트 디렉토리)
  - [x] 5.2 테스트 시나리오 1 Setup: 실제 로그 파일 생성 (`logs/test-app.log`, 5MB)
  - [x] 5.3 테스트 시나리오 1 Step 1: `/setup` 명령으로 테스트 채널 설정
  - [x] 5.4 테스트 시나리오 1 Step 2: Slack에서 `/download logs/test-app.log` 명령 입력
  - [x] 5.5 테스트 시나리오 1 Step 3: 시스템 파일 검증 수행 확인 (3초 이내)
  - [x] 5.6 테스트 시나리오 1 Step 4: Slack 파일 업로드 완료 메시지 표시 확인
  - [x] 5.7 테스트 시나리오 1 Step 5: 업로드된 파일 다운로드 및 원본과 SHA-256 해시 일치 확인
  - [x] 5.8 테스트 시나리오 1 검증: 파일 제목 형식 확인 (`{projectName}: logs/test-app.log`)
  - [x] 5.9 테스트 시나리오 2 Setup: 테스트 프로젝트에 `.env` 파일 생성
  - [x] 5.10 테스트 시나리오 2 Step 1: Slack에서 `/download .env` 명령 입력
  - [x] 5.11 테스트 시나리오 2 Step 2: 시스템 민감한 파일 검증 수행 확인 (1초 이내)
  - [x] 5.12 테스트 시나리오 2 Step 3: 에러 메시지 표시 확인 (`⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다.`)
  - [x] 5.13 테스트 시나리오 2 Step 4: 파일이 Slack에 업로드되지 않았는지 확인
  - [x] 5.14 테스트 시나리오 2 검증: 로그에 보안 검증 실패 기록 확인
  - [x] 5.15 추가 시나리오 테스트: Claude Code가 생성한 마크다운 파일 다운로드 (US-2)
  - [x] 5.16 추가 시나리오 테스트: 설정 파일 다운로드 및 Slack 코드 하이라이팅 확인 (US-3)
  - [x] 5.17 모든 시스템 테스트 통과 확인 및 결과 문서화
