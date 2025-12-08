# PRD: Slack 파일 첨부 기능

## 1. 개요 (Introduction/Overview)

현재 Remote Claude 시스템은 Slack을 통해 텍스트 프롬프트만을 Claude Code에 전달할 수 있습니다. 하지만 사용자가 이미지(스크린샷, 에러 화면 등)나 텍스트 파일(로그, 설정 파일 등)을 함께 첨부하여 분석을 요청하는 경우가 빈번합니다.

이 기능은 **Slack 메시지에 파일을 첨부했을 때, 해당 파일을 자동으로 다운로드하여 Claude Code에 전달**하는 것을 목표로 합니다. 이를 통해 사용자는 시각적 정보나 파일 내용을 기반으로 한 더 정확하고 맥락있는 답변을 받을 수 있습니다.

### 문제점
- 사용자가 이미지를 분석해달라고 요청할 때, 별도로 파일을 업로드하거나 경로를 수동으로 입력해야 함
- 로그 파일이나 설정 파일의 내용을 복사-붙여넣기 해야 하는 번거로움
- 시각적 정보(UI 스크린샷, 에러 화면 등)를 텍스트로 설명하기 어려움

### 해결책
Slack 메시지에 파일을 첨부하면:
1. 시스템이 자동으로 파일을 다운로드
2. 임시 저장소에 저장
3. 파일 경로를 참조하는 프롬프트를 생성
4. Claude Code에 전달하여 분석

## 2. 목표 (Goals)

1. **사용자 편의성 향상**: Slack에서 파일을 첨부하는 것만으로 Claude Code가 파일을 분석할 수 있도록 함
2. **이미지 분석 지원**: PNG, JPG, JPEG 형식의 이미지를 Claude Code에 전달하여 시각적 정보 분석 가능
3. **텍스트 파일 참조 지원**: 모든 텍스트 기반 파일을 임시 저장 후 경로 참조를 통해 Claude Code가 읽을 수 있도록 함
4. **안전한 파일 처리**: 5MB 크기 제한, 보안 검증, 임시 파일 관리를 통한 안정적인 시스템 운영

## 3. 사용자 스토리 (User Stories)

### US-1: 이미지 분석 요청
- **As a** 사용자
- **I want to** Slack에 스크린샷을 첨부하고 "이 UI의 문제점을 분석해줘"라고 메시지를 보내면
- **So that** Claude Code가 이미지를 보고 시각적 요소를 분석하여 개선 제안을 해줄 수 있다

### US-2: 에러 화면 디버깅
- **As a** 개발자
- **I want to** 에러가 발생한 화면의 스크린샷을 첨부하고 "이 에러의 원인을 찾아줘"라고 요청하면
- **So that** Claude Code가 에러 메시지, UI 상태 등을 종합적으로 분석하여 원인을 파악할 수 있다

### US-3: 로그 파일 분석
- **As a** 사용자
- **I want to** 로그 파일(.log)을 첨부하고 "이 로그에서 에러를 찾아줘"라고 요청하면
- **So that** Claude Code가 로그 파일 전체를 읽고 문제가 되는 부분을 찾아낼 수 있다

### US-4: 설정 파일 검토
- **As a** 개발자
- **I want to** 설정 파일(.json, .yaml 등)을 첨부하고 "이 설정에 문제가 없는지 검토해줘"라고 요청하면
- **So that** Claude Code가 설정 파일의 문법, 구조, 값 등을 검증하고 피드백을 제공할 수 있다

### US-5: 소스 코드 리뷰
- **As a** 개발자
- **I want to** 소스 코드 파일(.js, .ts, .py 등)을 첨부하고 "이 코드를 리뷰해줘"라고 요청하면
- **So that** Claude Code가 코드 품질, 버그, 개선점 등을 분석할 수 있다

### US-6: 인터랙티브 메뉴 공백 입력
- **As a** 사용자
- **I want to** Claude Code의 인터랙티브 메뉴에서 Space 키를 눌러야 할 때 `` `s` ``로 입력하면
- **So that** Space 키가 실행되어 메뉴 선택이나 입력 작업을 수행할 수 있다

## 4. 기능 요구사항 (Functional Requirements)

### FR-1: 파일 첨부 감지
시스템은 Slack 메시지 이벤트에서 파일 첨부 여부를 감지해야 한다.
- Slack 메시지 이벤트의 `files` 배열을 확인
- 파일이 첨부된 경우에만 파일 처리 로직 실행

### FR-2: 파일 타입 검증
시스템은 첨부된 파일의 타입을 검증하여 지원되는 형식만 처리해야 한다.
- **이미지 파일**: PNG, JPG, JPEG만 허용 (MIME type: `image/png`, `image/jpeg`)
- **텍스트 파일**: 모든 파일 허용 (확장자 제한 없음)
- 지원되지 않는 이미지 형식(GIF, WebP, SVG 등)은 에러 처리

### FR-3: 파일 크기 검증
시스템은 파일 크기를 검증하여 5MB 이하의 파일만 처리해야 한다.
- 파일 크기가 5MB를 초과하는 경우 에러 메시지 전송
- 기존 파일 다운로드 기능과 동일한 제한 적용

### FR-4: 단일 파일 처리
시스템은 한 번에 하나의 파일만 처리해야 한다.
- 여러 파일이 첨부된 경우, 첫 번째 파일만 처리
- 사용자에게 "여러 파일이 첨부되었지만 첫 번째 파일만 처리합니다" 알림 (선택적)

### FR-5: 프롬프트 필수 검증
시스템은 파일과 함께 프롬프트가 입력되었는지 확인해야 한다.
- 파일만 첨부되고 프롬프트가 없는 경우 에러 메시지 전송
- 에러 메시지: "파일과 함께 프롬프트를 입력해주세요. 예: '이 이미지를 분석해줘'"

### FR-6: 파일 다운로드
시스템은 Slack에 첨부된 파일을 로컬 시스템으로 다운로드해야 한다.
- Slack API의 `url_private_download` 사용
- Bot 토큰으로 인증하여 파일 다운로드
- 다운로드 실패 시 에러 메시지 전송

### FR-7: 임시 파일 저장
시스템은 다운로드한 파일을 전용 임시 디렉토리에 저장해야 한다.
- 저장 위치: `/tmp/remote-claude/` 전용 디렉토리
- 파일명 형식: `{uuid}-{original-filename}` (UUID로 고유성 보장)
- 파일 권한: 0600 (owner만 읽기/쓰기)
- Claude Code가 파일을 읽을 수 있도록 적절한 권한 설정
- Bot과 Claude Code가 같은 사용자 계정으로 실행되어야 함

### FR-8: 프롬프트 생성 (이미지)
시스템은 이미지 파일 첨부 시 파일 경로를 포함한 프롬프트를 생성해야 한다.
- 프롬프트 형식: `@{파일경로}\n\n{사용자 프롬프트}`
- Claude Code가 `@` 파일 참조 문법을 지원함 (확인됨)
- 예시: `@/tmp/remote-claude/abc123-screenshot.png\n\n이 이미지를 분석해줘`

### FR-9: 프롬프트 생성 (텍스트 파일)
시스템은 텍스트 파일 첨부 시 파일 경로를 포함한 프롬프트를 생성해야 한다.
- 프롬프트 형식: `@{파일경로}\n\n{사용자 프롬프트}`
- Claude Code가 `@` 파일 참조 문법을 지원함 (확인됨)
- 예시: `@/tmp/remote-claude/abc123-error.log\n\n이 로그를 분석해줘`

### FR-10: Claude Code 전달
시스템은 생성된 프롬프트를 기존 메시지 처리 흐름을 통해 Claude Code에 전달해야 한다.
- Job Queue에 추가
- TmuxManager를 통해 프롬프트 전송
- 기존 메시지 처리 로직과 동일한 흐름

### FR-11: 에러 처리
시스템은 파일 처리 중 발생하는 에러를 적절히 처리해야 한다.
- 파일 다운로드 실패: "파일 다운로드에 실패했습니다. 다시 시도해주세요."
- 파일 타입 불일치: "지원하지 않는 파일 형식입니다. PNG, JPG, JPEG 이미지만 지원합니다."
- 파일 크기 초과: "파일 크기가 5MB를 초과합니다. 더 작은 파일을 사용해주세요."
- 프롬프트 없음: "파일과 함께 프롬프트를 입력해주세요."
- 저장소 오류: "파일 저장 중 오류가 발생했습니다."

### FR-12: 임시 파일 정리
시스템은 사용이 완료된 임시 파일을 자동으로 삭제해야 한다.
- Job 완료 후 즉시 삭제 (try-catch-finally 패턴 사용)
- Job 실패 시에도 임시 파일 삭제
- Job 취소 시에도 임시 파일 삭제
- finally 블록에서 파일 정리 보장
- 삭제 실패 시 로그만 남기고 계속 진행
- 시스템 시작 시 24시간 이상 된 파일 자동 정리 (선택적, 비정상 종료 대응)

### FR-13: 로깅
시스템은 파일 처리 과정을 로깅해야 한다.
- 파일 다운로드 시작/완료
- 파일 정보 (파일명, 크기, 타입)
- 임시 파일 경로
- 에러 발생 시 상세 정보

### FR-14: 임시 디렉토리 초기화
시스템은 시작 시 전용 임시 디렉토리를 초기화해야 한다.
- 시스템 시작 시 `/tmp/remote-claude/` 디렉토리 생성
- 디렉토리가 이미 존재하면 스킵
- 디렉토리 권한: 0700 (owner만 rwx)
- 생성 실패 시 경고 로그 출력 (시스템은 계속 실행, 파일 첨부 시 에러 발생 가능)

### FR-15: DSL 명령 키워드 확장 (Space 키 지원)
시스템은 DSL 명령에서 Space 키를 지원해야 한다.
- 키 매핑 추가: `s` → `Space` (Space 키 실행)
- 기존 키 매핑과 동일한 방식으로 동작
- 백틱 내에서 `s` 문자 입력 시 Space 키로 변환
- 예시: `` `dds` `` → Down, Down, Space 키 실행
- 기존 키워드: `r` (Right), `l` (Left), `u` (Up), `d` (Down), `e` (Enter)

## 5. 비목표 (Non-Goals / Out of Scope)

다음 항목들은 이번 구현 범위에서 제외됩니다:

1. **여러 파일 동시 첨부**: 한 메시지에 여러 파일을 첨부하여 모두 처리하는 기능
2. **GIF, WebP, SVG 이미지 지원**: PNG, JPG, JPEG 외의 이미지 형식
3. **진행 상황 피드백**: "파일 다운로드 중..." 같은 실시간 진행 상황 알림
4. **파일 미리보기**: Slack에서 파일 내용을 미리 보여주는 기능
5. **파일 압축/최적화**: 큰 파일을 자동으로 압축하거나 이미지 리사이징
6. **자동 재시도**: 파일 다운로드 실패 시 자동 재시도 로직
7. **파일 캐싱**: 동일 파일 재사용을 위한 캐싱 메커니즘
8. **동영상/오디오 파일**: 멀티미디어 파일 지원
9. **압축 파일 (.zip, .tar 등)**: 압축 파일 자동 해제 및 처리
10. **대용량 파일 (>5MB)**: 5MB 초과 파일 처리

## 6. 기술 고려사항 (Technical Considerations)

### 6.1 아키텍처 변경

기존 메시지 처리 흐름에 파일 처리 단계를 추가해야 합니다:

```
[기존 흐름]
Slack Message → processInput → Job Queue → TmuxManager → Claude Code

[새로운 흐름]
Slack Message → File Detection → File Download → File Processing → Job Queue → TmuxManager → Claude Code
```

### 6.2 새로운 모듈

다음 모듈을 신규 생성해야 합니다:

1. **`src/handlers/file-attachment.ts`**
   - 파일 첨부 감지 및 처리 메인 로직
   - `handleFileAttachment(event, app, channelConfig)` 함수

2. **`src/utils/file-downloader.ts`**
   - Slack 파일 다운로드 로직
   - `downloadSlackFile(fileUrl, token)` 함수
   - `saveToTempFile(fileBuffer, originalFilename)` 함수

3. **`src/utils/file-validator.ts`**
   - 파일 타입 및 크기 검증
   - `validateFileType(file)` 함수
   - `validateFileSize(file, maxSize)` 함수

### 6.3 기존 모듈 수정

1. **`src/index.ts`**
   - Slack 메시지 이벤트 핸들러에 파일 처리 로직 추가
   - `event.files` 배열 확인 로직

2. **`src/dsl/parser.ts`** (FR-15: DSL 키워드 확장)
   - 키 매핑 상수에 Space 키 추가
   - `KEY_MAPPING` 객체에 `s: 'Space'` 항목 추가
   - `KEY_CHARS` Set에 `'s'` 추가
   - KeyType 타입에 `'Space'` 추가

3. **`src/tmux/executor.ts`** (FR-15: DSL 키워드 확장)
   - `sendKey()` 함수에서 `'Space'` 키 타입 처리 추가
   - tmux 명령: `tmux send-keys -t {session} Space`

### 6.4 Claude Code 파일 처리 방식 (✅ 확인됨)

**확인된 사실**: Claude Code는 `@/path/to/file` 형식의 파일 참조를 지원합니다.

**동작 방식:**
1. **파일 경로 참조**: `@{절대경로}` 형식으로 이미지 및 텍스트 파일 참조
   - 예시: `@/tmp/remote-claude/abc123-screenshot.png`
2. **접근 권한 필요**: Claude Code가 실행되는 사용자 계정이 해당 파일에 읽기 권한을 가져야 함
3. **지원 파일 타입**: 이미지(PNG, JPG, JPEG) 및 모든 텍스트 기반 파일

**구현 방침:**
- 임시 파일을 `/tmp/remote-claude/` 디렉토리에 저장
- 파일 권한을 0600으로 설정 (owner만 읽기/쓰기)
- Bot과 Claude Code를 **같은 사용자 계정**으로 실행
- 프롬프트 형식: `@{파일경로}\n\n{사용자 프롬프트}`

**대안 방식 (불필요):**
- base64 인코딩: 불필요 (파일 참조로 충분)
- 파일 복사: 불필요 (권한만 올바르면 됨)

### 6.5 필요한 npm 패키지

추가 설치가 필요할 수 있는 패키지:
- `axios` 또는 Node.js 내장 `https` 모듈 (파일 다운로드)
- `uuid` (고유 파일명 생성, 이미 설치되어 있을 수 있음)
- `file-type` (MIME type 검증, 선택적)

### 6.6 보안 고려사항

1. **SSRF 공격 방지**
   - Slack의 `url_private_download`만 허용
   - 외부 URL 다운로드 차단

2. **경로 순회 공격 방지**
   - 파일명에서 `../`, `./` 제거
   - 절대 경로만 사용

3. **파일 내용 검증**
   - MIME type과 파일 확장자 일치 확인
   - 매직 넘버(파일 시그니처) 검증 (선택적)

4. **실행 파일 차단**
   - `.exe`, `.sh`, `.bat` 등 실행 파일 차단
   - 텍스트 파일이라도 실행 권한 부여하지 않음

### 6.7 임시 파일 관리 (업데이트됨)

1. **저장 위치**: `/tmp/remote-claude/` 전용 디렉토리
   - 시스템 시작 시 디렉토리 생성
   - 디렉토리 권한: 0700 (owner만 rwx)

2. **파일명 형식**: `{uuid}-{original-filename}`
   - UUID로 고유성 보장
   - 파일명 충돌 완전 방지
   - 예시: `a1b2c3d4-screenshot.png`

3. **파일 권한**: 0600 (owner만 rw)
   - 다른 사용자의 접근 차단
   - 보안 강화

4. **정리 시점**:
   - Job 완료 후 즉시 삭제 (try-catch-finally 패턴)
   - Job 실패 시에도 삭제
   - Job 취소 시에도 삭제
   - finally 블록에서 정리 보장
   - 시스템 시작 시 24시간 이상 된 파일 자동 정리 (선택적, 비정상 종료 대응)

5. **사용자 계정 통일**:
   - **중요**: Bot과 Claude Code를 **같은 사용자 계정**으로 실행해야 함
   - 다른 사용자 계정으로 실행 시 권한 문제 발생
   - 배포 시 사용자 계정 확인 필수

6. **Job 객체 확장**:
   - Job 객체에 `attachedFilePath` 필드 추가
   - 파일 정리 시 참조하여 삭제

## 7. 테스트 요구사항 (Testing Requirements)

### 7.1 단위 테스트

모든 구현된 함수는 Jest를 사용하여 단위 테스트를 작성해야 합니다.

#### 7.1.1 `validateFileType()` 테스트
- **Happy Path**
  - PNG 이미지 파일 검증 성공
  - JPG 이미지 파일 검증 성공
  - JPEG 이미지 파일 검증 성공
  - 텍스트 파일 (.txt, .log, .md 등) 검증 성공

- **Boundary Conditions**
  - 파일 확장자가 없는 경우
  - 파일 확장자와 MIME type이 불일치하는 경우
  - 대소문자 혼합 확장자 (.PNG, .Jpg 등)

- **Exception Cases**
  - GIF 이미지 파일 검증 실패
  - WebP 이미지 파일 검증 실패
  - SVG 이미지 파일 검증 실패
  - 실행 파일 (.exe, .sh) 검증 실패

- **Side Effects**
  - 원본 파일 객체가 수정되지 않음
  - 여러 번 호출해도 동일한 결과 반환

#### 7.1.2 `validateFileSize()` 테스트
- **Happy Path**
  - 1MB 파일 검증 성공
  - 정확히 5MB 파일 검증 성공

- **Boundary Conditions**
  - 0 바이트 파일
  - 정확히 5MB (5242880 bytes)
  - 5MB + 1 바이트

- **Exception Cases**
  - 5.1MB 파일 검증 실패
  - 10MB 파일 검증 실패

- **Side Effects**
  - 파일 크기가 변경되지 않음

#### 7.1.3 `downloadSlackFile()` 테스트
- **Happy Path**
  - 정상 파일 다운로드 성공
  - 다운로드된 파일 버퍼 반환

- **Boundary Conditions**
  - 빈 파일 (0 바이트) 다운로드
  - 최대 크기 (5MB) 파일 다운로드

- **Exception Cases**
  - 네트워크 오류 (타임아웃, 연결 실패)
  - 인증 실패 (잘못된 토큰)
  - 404 에러 (파일 없음)
  - 403 에러 (권한 없음)

- **Side Effects**
  - 파일 시스템에 영향 없음 (메모리에만 저장)

#### 7.1.4 `saveToTempFile()` 테스트
- **Happy Path**
  - 파일 버퍼를 임시 파일로 저장 성공
  - 올바른 파일 경로 반환

- **Boundary Conditions**
  - 파일명에 특수문자 포함
  - 파일명에 공백 포함
  - 매우 긴 파일명 (255자 이상)

- **Exception Cases**
  - 디스크 공간 부족
  - 임시 디렉토리 권한 없음
  - 잘못된 파일 버퍼

- **Side Effects**
  - 임시 파일이 올바른 위치에 생성됨
  - 파일 권한이 0600으로 설정됨
  - 동일 파일명 충돌 없음 (UUID 사용)

#### 7.1.5 `handleFileAttachment()` 테스트
- **Happy Path**
  - 이미지 파일 + 프롬프트 → 정상 처리
  - 텍스트 파일 + 프롬프트 → 정상 처리

- **Boundary Conditions**
  - 정확히 5MB 파일
  - 파일명 특수문자 포함
  - 매우 긴 프롬프트 (3000자 이상)

- **Exception Cases**
  - 파일만 첨부 (프롬프트 없음)
  - 여러 파일 첨부 (첫 번째만 처리 확인)
  - 지원하지 않는 파일 형식
  - 파일 크기 초과

- **Side Effects**
  - 임시 파일이 생성됨
  - Job Queue에 작업이 추가됨
  - 사용자에게 적절한 메시지 전송

#### 7.1.6 프롬프트 생성 테스트
- **Happy Path**
  - 이미지 파일 경로 + 프롬프트 → 올바른 형식
  - 텍스트 파일 경로 + 프롬프트 → 올바른 형식

- **Boundary Conditions**
  - 파일 경로에 공백 포함
  - 파일 경로에 특수문자 포함
  - 매우 긴 파일 경로

- **Exception Cases**
  - 파일 경로가 null 또는 undefined
  - 프롬프트가 null 또는 undefined

- **Side Effects**
  - 원본 프롬프트가 변경되지 않음
  - 파일 경로가 변경되지 않음

#### 7.1.7 임시 디렉토리 초기화 테스트
- **Happy Path**
  - 디렉토리 생성 성공
  - 권한 0700 확인

- **Boundary Conditions**
  - 디렉토리가 이미 존재하는 경우
  - 부모 디렉토리 (/tmp) 권한 부족

- **Exception Cases**
  - /tmp가 가득 찬 경우
  - 권한 설정 실패

- **Side Effects**
  - 기존 파일에 영향 없음
  - 디렉토리가 올바른 위치에 생성됨

#### 7.1.8 DSL Space 키 파싱 테스트 (FR-15)
- **Happy Path**
  - `` `s` `` → Space 키 변환 성공
  - `` `dds` `` → Down, Down, Space 키 변환 성공
  - `` `sss` `` → Space, Space, Space 키 변환 성공

- **Boundary Conditions**
  - `` `s` `` (단일 Space 키)
  - `` `rluds` `` (모든 키워드 조합)
  - `` `ssss` `` (연속된 Space 키)

- **Exception Cases**
  - `` `sx` `` → 혼합 문자 에러 (키 + 일반 문자)
  - `` `s s` `` → 혼합 문자 에러 (키 + 공백)

- **Side Effects**
  - 기존 키워드 (r, l, u, d, e) 동작에 영향 없음
  - KEY_MAPPING 및 KEY_CHARS 일관성 유지

#### 7.1.9 DSL Space 키 실행 테스트 (FR-15)
- **Happy Path**
  - sendKey() 함수에 Space 키 타입 전달 → tmux send-keys 실행
  - tmux 세션에서 Space 키 입력 확인

- **Boundary Conditions**
  - 세션이 없는 경우
  - tmux가 응답하지 않는 경우

- **Exception Cases**
  - 잘못된 세션 이름
  - tmux 명령 실패

- **Side Effects**
  - tmux 세션에 Space 키가 정확히 입력됨
  - 다른 키 타입 실행에 영향 없음

### 7.2 시스템 테스트

실제 Slack 환경과 Claude Code를 사용하여 end-to-end 테스트를 수행해야 합니다.

#### 7.2.1 이미지 첨부 워크플로우
1. Slack 채널에 PNG 이미지 + "이 이미지를 분석해줘" 메시지 전송
2. 시스템이 파일을 다운로드하고 임시 저장소에 저장하는지 확인
3. Claude Code에 `@/tmp/...` 형식의 프롬프트가 전달되는지 확인
4. Claude Code가 이미지를 읽고 분석 응답을 반환하는지 확인
5. 임시 파일이 삭제되는지 확인

**검증 항목:**
- 파일 다운로드 로그 확인
- 임시 파일 생성 확인 (`ls /tmp/remote-claude-*`)
- tmux 세션에서 전달된 프롬프트 확인
- Claude Code 응답 확인
- 임시 파일 삭제 확인

#### 7.2.2 텍스트 파일 첨부 워크플로우
1. Slack 채널에 .log 파일 + "이 로그를 분석해줘" 메시지 전송
2. 시스템이 파일을 다운로드하고 임시 저장소에 저장하는지 확인
3. Claude Code에 파일 경로 참조가 포함된 프롬프트가 전달되는지 확인
4. Claude Code가 파일을 읽고 내용을 분석하는지 확인
5. 임시 파일이 삭제되는지 확인

**검증 항목:**
- 다양한 파일 형식 테스트 (.txt, .json, .yaml, .js, .ts, .py 등)
- 파일 내용이 올바르게 전달되는지 확인
- Claude Code가 파일 내용을 정확히 읽는지 확인

#### 7.2.3 DSL Space 키 워크플로우 (FR-15)
1. Claude Code에서 인터랙티브 메뉴나 입력창이 나타나는 상황 생성
2. Slack에서 `` `s` `` 메시지 전송
3. Claude Code에 Space 키가 입력되는지 확인
4. 예상된 동작 (메뉴 선택, 입력 완료 등)이 발생하는지 확인

**검증 항목:**
- Space 키가 정확히 입력됨
- 기존 키워드 (r, l, u, d, e)와 조합 가능 (예: `` `dds` ``)
- tmux 세션에 올바른 키 입력 확인

### 7.3 에러 처리 테스트

#### 7.3.1 파일 크기 초과
- 6MB 파일 첨부 → 에러 메시지 확인

#### 7.3.2 지원하지 않는 이미지 형식
- GIF 파일 첨부 → 에러 메시지 확인
- WebP 파일 첨부 → 에러 메시지 확인

#### 7.3.3 프롬프트 없음
- 파일만 첨부 (메시지 없음) → 에러 메시지 확인

#### 7.3.4 네트워크 오류
- Slack API 타임아웃 시뮬레이션 → 에러 메시지 확인

#### 7.3.5 DSL 혼합 문자 에러 (FR-15)
- `` `sx` `` 입력 → 에러 메시지 확인 (키 + 일반 문자 혼합)
- `` `s hello` `` 입력 → 에러 메시지 확인 (키 + 공백 + 텍스트)

## 8. 배포 요구사항 (Deployment Requirements)

### 8.1 배포 환경

이 기능은 다음 환경에서 배포 및 테스트되어야 합니다:

1. **개발 환경 (Development)**
   - 로컬 개발 머신
   - 테스트용 Slack Workspace
   - 단위 테스트 및 통합 테스트 실행

2. **스테이징 환경 (Staging)**
   - 프로덕션과 동일한 구성
   - 실제 Slack Workspace (테스트 채널)
   - 전체 시스템 테스트 실행

3. **프로덕션 환경 (Production)**
   - 실제 운영 서버
   - 실제 사용자 Slack Workspace
   - 모니터링 및 알림 활성화

### 8.2 시스템 요구사항

#### 8.2.1 운영체제
- Linux (Ubuntu 20.04 이상 권장) 또는 macOS
- `/tmp` 디렉토리에 쓰기 권한 필요
- 최소 10GB 디스크 여유 공간

#### 8.2.2 Node.js 환경
- Node.js 16.x 이상
- npm 또는 yarn 패키지 매니저
- TypeScript 5.x

#### 8.2.3 필수 npm 패키지
```bash
npm install axios uuid
# 또는
yarn add axios uuid
```

#### 8.2.4 Slack API 권한
Bot이 다음 권한을 가져야 합니다:
- `files:read` - 파일 메타데이터 읽기
- `files:write` - 파일 다운로드
- `chat:write` - 메시지 전송
- `channels:history` - 채널 메시지 읽기

### 8.3 사용자 계정 설정 (⚠️ 중요)

#### 8.3.1 계정 통일 요구사항
**Bot과 Claude Code는 반드시 같은 사용자 계정으로 실행되어야 합니다.**

**이유:**
- Bot이 다운로드한 파일을 Claude Code가 읽어야 함
- 파일 권한이 0600 (owner만 읽기/쓰기)으로 설정됨
- 다른 사용자 계정으로 실행 시 권한 오류 발생

**확인 방법:**
```bash
# Bot 실행 사용자 확인
ps aux | grep "node.*index.js"

# Claude Code 실행 사용자 확인
ps aux | grep "claude"

# 두 프로세스의 사용자가 동일해야 함
```

#### 8.3.2 사용자 권한
실행 사용자는 다음 권한을 가져야 합니다:
- `/tmp` 디렉토리 읽기/쓰기 권한
- tmux 세션 접근 권한
- 네트워크 접근 권한 (Slack API 통신)

### 8.4 디렉토리 및 권한 설정

#### 8.4.1 임시 디렉토리 생성
시스템 시작 시 자동으로 생성되지만, 수동 생성 방법:

```bash
# 디렉토리 생성
mkdir -p /tmp/remote-claude

# 권한 설정 (owner만 rwx)
chmod 0700 /tmp/remote-claude

# 소유자 확인
ls -ld /tmp/remote-claude
# 출력: drwx------ ... username username ... /tmp/remote-claude
```

#### 8.4.2 권한 검증
```bash
# 디렉토리 권한 확인
stat -c "%a %U" /tmp/remote-claude
# 출력: 700 username

# 테스트 파일 생성 및 권한 확인
touch /tmp/remote-claude/test.txt
chmod 0600 /tmp/remote-claude/test.txt
ls -l /tmp/remote-claude/test.txt
# 출력: -rw------- ... username username ... test.txt

# 테스트 파일 삭제
rm /tmp/remote-claude/test.txt
```

### 8.5 환경 변수

다음 환경 변수가 설정되어 있어야 합니다:

```bash
# Slack Bot 토큰
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Slack Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret

# Claude Code 설정
CLAUDE_CODE_SESSION=your-tmux-session-name

# 옵션: 임시 파일 디렉토리 (기본값: /tmp/remote-claude)
TEMP_FILE_DIR=/tmp/remote-claude

# 옵션: 최대 파일 크기 (기본값: 5MB = 5242880 bytes)
MAX_FILE_SIZE=5242880
```

### 8.6 배포 전 체크리스트

배포 전 다음 항목을 확인해야 합니다:

- [ ] Node.js 버전 확인 (16.x 이상)
- [ ] npm 패키지 설치 (`axios`, `uuid`)
- [ ] 환경 변수 설정 (`.env` 파일)
- [ ] Slack App 권한 확인 (`files:read`, `files:write` 등)
- [ ] Bot과 Claude Code 사용자 계정 동일 여부 확인
- [ ] `/tmp` 디렉토리 쓰기 권한 확인
- [ ] 디스크 여유 공간 확인 (최소 10GB)
- [ ] 단위 테스트 실행 및 통과 (`npm test`)
- [ ] TypeScript 컴파일 오류 없음 (`npm run build`)
- [ ] ESLint 경고 없음 (`npm run lint`)

### 8.7 배포 절차

#### 8.7.1 코드 배포
```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 의존성 설치
npm install

# 3. TypeScript 컴파일
npm run build

# 4. 테스트 실행
npm test

# 5. 임시 디렉토리 초기화 (시스템 시작 시 자동 실행되지만 수동 확인)
mkdir -p /tmp/remote-claude
chmod 0700 /tmp/remote-claude
```

#### 8.7.2 서비스 재시작
```bash
# PM2 사용 시
pm2 restart remote-claude

# systemd 사용 시
sudo systemctl restart remote-claude

# 또는 직접 실행
npm start
```

#### 8.7.3 로그 확인
```bash
# PM2 사용 시
pm2 logs remote-claude

# systemd 사용 시
sudo journalctl -u remote-claude -f

# 또는 로그 파일 확인
tail -f logs/app.log
```

### 8.8 배포 후 검증

배포 후 다음 항목을 검증해야 합니다:

#### 8.8.1 기본 동작 확인
- [ ] 시스템이 정상적으로 시작됨
- [ ] 로그에 에러 없음
- [ ] `/tmp/remote-claude/` 디렉토리 생성됨
- [ ] 디렉토리 권한 0700 확인

#### 8.8.2 파일 첨부 기능 테스트
```bash
# Slack에서 테스트 메시지 전송
# 1. PNG 이미지 + "이 이미지를 분석해줘" → 정상 응답 확인
# 2. 텍스트 파일 + "이 파일을 읽어줘" → 정상 응답 확인
# 3. 6MB 파일 + "테스트" → "파일 크기 초과" 에러 확인
# 4. GIF 파일 + "테스트" → "지원하지 않는 형식" 에러 확인
```

#### 8.8.3 임시 파일 정리 확인
```bash
# 파일 처리 후 임시 디렉토리 확인
ls -la /tmp/remote-claude/
# 출력: total 0 (파일이 모두 삭제되어야 함)

# 30분 후 재확인 (정리 누락 확인)
ls -la /tmp/remote-claude/
```

#### 8.8.4 성능 확인
```bash
# 응답 시간 모니터링 (로그에서 확인)
grep "File download completed" logs/app.log | tail -10

# 메모리 사용량 확인
ps aux | grep "node.*index.js" | awk '{print $6}'

# CPU 사용량 확인
top -p $(pgrep -f "node.*index.js")
```

### 8.9 롤백 계획

#### 8.9.1 롤백 트리거 조건
다음 조건 중 하나라도 발생 시 즉시 롤백:
- 파일 처리 성공률 < 95% (10개 이상 시도 기준)
- 시스템 크래시 발생
- 디스크 공간 부족 (임시 파일 미정리)
- 메모리 누수 감지 (메모리 사용량 지속 증가)
- 기존 기능 동작 불가

#### 8.9.2 롤백 절차
```bash
# 1. 이전 버전으로 코드 되돌리기
git revert <commit-hash>
# 또는
git checkout <previous-tag>

# 2. 의존성 재설치
npm install

# 3. 빌드
npm run build

# 4. 서비스 재시작
pm2 restart remote-claude

# 5. 임시 파일 정리
rm -rf /tmp/remote-claude/*

# 6. 동작 확인
pm2 logs remote-claude
```

#### 8.9.3 롤백 후 조치
- 롤백 사유 문서화
- 버그 리포트 작성
- 수정 계획 수립
- 재배포 일정 계획

### 8.10 모니터링 및 알림

#### 8.10.1 모니터링 항목
1. **파일 처리 성공률**
   - 로그 분석: 성공/실패 건수 집계
   - 알림 기준: 성공률 < 95%

2. **디스크 사용량**
   - `/tmp/remote-claude/` 디렉토리 크기 모니터링
   - 알림 기준: 크기 > 100MB (비정상)

3. **응답 시간**
   - 파일 다운로드 시간 측정
   - 알림 기준: 평균 > 5초 (1MB 기준)

4. **에러 발생**
   - 로그에서 ERROR 레벨 추출
   - 알림 기준: 에러율 > 1%

#### 8.10.2 알림 설정
```bash
# Cron으로 임시 파일 감시 (10분마다)
*/10 * * * * [ $(du -s /tmp/remote-claude | cut -f1) -gt 102400 ] && echo "Temp dir size alert" | mail -s "Alert" admin@example.com

# 24시간 이상 된 파일 자동 정리 (매일 새벽 3시)
0 3 * * * find /tmp/remote-claude -type f -mtime +1 -delete
```

#### 8.10.3 로그 수준
- **개발 환경**: `DEBUG` 레벨 (모든 로그)
- **스테이징 환경**: `INFO` 레벨 (주요 동작 로그)
- **프로덕션 환경**: `WARN` 레벨 (경고 및 에러만)

### 8.11 보안 고려사항

#### 8.11.1 파일 접근 제어
- 임시 파일 권한: 0600 (owner만 읽기/쓰기)
- 임시 디렉토리 권한: 0700 (owner만 rwx)
- 다른 사용자의 접근 차단

#### 8.11.2 네트워크 보안
- HTTPS를 통한 Slack API 통신
- Bot 토큰 환경 변수로 관리 (코드에 하드코딩 금지)
- `url_private_download`만 허용 (외부 URL 차단)

#### 8.11.3 파일 검증
- MIME type 검증
- 파일 크기 제한 (5MB)
- 실행 파일 차단 (.exe, .sh, .bat 등)

#### 8.11.4 민감 정보 보호
- 임시 파일 즉시 삭제
- 로그에 파일 내용 기록 금지
- 파일명에서 사용자 정보 제거 (UUID 사용)

### 8.12 문제 해결 가이드

#### 8.12.1 "Permission denied" 에러
**증상**: 파일 다운로드 또는 읽기 시 권한 오류

**원인**: Bot과 Claude Code가 다른 사용자 계정으로 실행

**해결**:
```bash
# 1. 실행 사용자 확인
ps aux | grep "node.*index.js"
ps aux | grep "claude"

# 2. 사용자 계정 통일 (예: 모두 'ubuntu' 계정으로)
sudo systemctl restart remote-claude
```

#### 8.12.2 "/tmp/remote-claude 디렉토리 없음" 에러
**증상**: 파일 저장 시 디렉토리 없음 에러

**원인**: 시스템 시작 시 디렉토리 생성 실패

**해결**:
```bash
# 수동으로 디렉토리 생성
mkdir -p /tmp/remote-claude
chmod 0700 /tmp/remote-claude
```

#### 8.12.3 "파일 다운로드 실패" 에러
**증상**: Slack에서 파일 다운로드 실패

**원인**: 네트워크 오류 또는 Bot 토큰 문제

**해결**:
```bash
# 1. 네트워크 연결 확인
curl https://slack.com/api/auth.test -H "Authorization: Bearer $SLACK_BOT_TOKEN"

# 2. Bot 토큰 확인
echo $SLACK_BOT_TOKEN

# 3. Bot 권한 확인 (files:read, files:write)
```

#### 8.12.4 "임시 파일 누적" 문제
**증상**: /tmp/remote-claude 디렉토리에 파일이 계속 쌓임

**원인**: 비정상 종료로 파일 정리 실패

**해결**:
```bash
# 수동으로 오래된 파일 정리
find /tmp/remote-claude -type f -mtime +1 -delete

# 또는 전체 삭제
rm -rf /tmp/remote-claude/*
```

## 9. 성공 지표 (Success Metrics)

### 9.1 기능적 성공

1. **파일 처리 성공률**: ≥ 99%
   - 측정 방법: (성공한 파일 처리 수 / 전체 파일 첨부 수) × 100

2. **Claude Code 이미지 인식률**: 100%
   - 측정 방법: Claude Code가 이미지를 읽고 분석 응답을 반환한 비율

3. **Claude Code 파일 읽기 성공률**: 100%
   - 측정 방법: Claude Code가 텍스트 파일을 읽고 내용을 참조한 비율

### 9.2 비기능적 성공

1. **파일 다운로드 시간**: 평균 < 3초 (1MB 파일 기준)
   - 측정 방법: 다운로드 시작부터 완료까지 시간 측정

2. **메모리 누수 없음**
   - 측정 방법: 24시간 운영 후 임시 파일 디렉토리 확인
   - 기준: 처리 완료된 파일이 모두 삭제되어야 함

3. **에러율**: < 1%
   - 측정 방법: (에러 발생 수 / 전체 파일 처리 시도 수) × 100

### 9.3 사용자 만족도

1. **사용 편의성**
   - 측정 방법: 사용자가 파일 첨부 기능을 직관적으로 사용할 수 있는지 관찰

2. **에러 메시지 명확성**
   - 측정 방법: 에러 발생 시 사용자가 원인을 이해하고 해결할 수 있는지 확인

## 10. 미해결 질문 (Open Questions)

### ~~Q1: Claude Code의 이미지 처리 방식~~ (✅ 해결됨)

**답변**: Claude Code는 `@/path/to/file` 형식의 파일 참조를 지원합니다.

**확인된 사항**:
1. `@{절대경로}` 형식으로 이미지 및 텍스트 파일 참조 가능
2. Claude Code가 실행되는 사용자 계정이 해당 파일에 읽기 권한을 가져야 함
3. PNG, JPG, JPEG 이미지 및 모든 텍스트 기반 파일 지원
4. base64 인코딩 등 다른 방식은 불필요

**구현 방침**:
- 임시 파일을 `/tmp/remote-claude/` 디렉토리에 저장
- 파일 권한을 0600으로 설정
- Bot과 Claude Code를 같은 사용자 계정으로 실행
- 프롬프트 형식: `@{파일경로}\n\n{사용자 프롬프트}`

**해결 완료**: 2025-12-08 (사용자 확인)

### ~~Q2: 임시 파일 정리 시점~~ (✅ 해결됨)

**답변**: Job 완료/실패/취소 시 즉시 삭제하되, finally 블록에서 보장합니다.

**결정된 전략**:
1. **즉시 정리**: Job 완료 후 try-catch-finally 패턴으로 즉시 삭제
2. **실패 시에도 정리**: Job 실패나 취소 시에도 finally 블록에서 삭제
3. **백업 정리**: 시스템 시작 시 24시간 이상 된 파일 자동 정리 (비정상 종료 대응)

**구현 방침**:
- JobOrchestrator의 executeJob()에서 try-catch-finally 사용
- Job 객체에 attachedFilePath 필드 추가
- finally 블록에서 cleanupTempFile() 호출

**해결 완료**: FR-12에 반영됨

### Q3: 여러 파일 첨부 시 알림 필요성
**질문**: 여러 파일이 첨부되었을 때 "첫 번째 파일만 처리합니다"라는 알림이 필요한가?

**옵션**:
1. 알림 제공: 사용자에게 명확한 피드백
2. 알림 없음: 간단한 구현, 사용자가 자연스럽게 인지

**고려사항**:
- 사용자 혼란 가능성
- 불필요한 메시지로 인한 노이즈

**결정 필요**: UX 관점에서 알림 필요성 검토

### Q4: 파일 다운로드 재시도 로직
**질문**: 파일 다운로드 실패 시 자동 재시도가 필요한가?

**현재 구현**: 에러 메시지만 표시 (재시도 없음)

**고려사항**:
- 일시적 네트워크 오류 대응
- 재시도 횟수 및 간격 설정
- 사용자 경험 향상

**결정 필요**: 자동 재시도 로직 추가 여부 결정

### Q5: 파일 타입별 프롬프트 차별화
**질문**: 이미지와 텍스트 파일에 대해 프롬프트 형식을 다르게 해야 하는가?

**현재 계획**: 동일한 형식 (`@{파일경로}\n\n{사용자 프롬프트}`)

**대안**:
- 이미지: `이 이미지를 분석해주세요: @{파일경로}\n\n{사용자 프롬프트}`
- 텍스트: `이 파일을 참조해주세요: @{파일경로}\n\n{사용자 프롬프트}`

**고려사항**:
- Claude Code의 이해도
- 사용자 의도 명확성

**결정 필요**: 프롬프트 형식 차별화 여부 및 구체적 형식 확정

---

## 부록: 참고 자료

### Slack API 문서
- [Files API](https://api.slack.com/methods/files.info)
- [File Upload](https://api.slack.com/methods/files.uploadV2)

### 기존 코드 참조
- `src/handlers/file-download.ts`: 파일 다운로드 기능 (Slack → 사용자)
- `src/utils/file-security.ts`: 파일 보안 검증 로직
- `src/tmux/manager.ts`: Claude Code 프롬프트 전송 로직

### 기술 스택
- Node.js
- TypeScript
- Slack Bolt Framework
- Jest (테스팅)
- Winston (로깅)
