# PRD: 프로젝트 파일 다운로드 기능

## 1. 개요 (Introduction/Overview)

Remote Claude 시스템에서 사용자가 프로젝트 디렉토리 내의 파일을 Slack을 통해 간편하게 다운로드할 수 있는 기능을 제공합니다. 이 기능은 Claude Code가 생성한 파일, 로그 파일, 설정 파일 등을 빠르게 확인하고 공유할 수 있도록 지원합니다.

**해결하려는 문제:**
- Claude Code가 생성한 파일을 확인하기 위해 프로젝트 디렉토리에 직접 접근해야 하는 불편함
- 로그 파일이나 설정 파일을 확인하기 위한 추가 작업 필요
- Slack에서 작업 중인 상태에서 파일 내용을 즉시 확인하기 어려움

**목표:**
프로젝트 경로를 기준으로 상대 경로를 입력하면 해당 파일을 Slack으로 자동 업로드하여, 사용자가 Slack 내에서 파일을 바로 다운로드하고 확인할 수 있도록 합니다.

## 2. 목표 (Goals)

1. **간편한 파일 접근**: 프로젝트 디렉토리 내 파일을 Slack 명령어 하나로 즉시 다운로드
2. **보안성 확보**: Path traversal 공격 방지 및 민감한 파일 접근 차단
3. **사용자 경험 향상**: 직관적인 명령어와 명확한 에러 메시지 제공
4. **시스템 안정성**: 파일 크기 제한을 통한 시스템 부하 방지

## 3. 사용자 스토리 (User Stories)

### US-1: 로그 파일 다운로드
**As a** 개발자
**I want to** 애플리케이션 로그 파일을 Slack으로 다운로드
**So that** 에러 분석을 즉시 수행할 수 있다

**Acceptance Criteria:**
- `/download logs/app.log` 명령으로 로그 파일이 Slack에 업로드됨
- 파일명과 프로젝트명이 명확하게 표시됨
- 10MB 이하 파일은 즉시 다운로드 가능

### US-2: 생성된 결과물 확인
**As a** 개발자
**I want to** Claude Code가 생성한 마크다운 파일을 다운로드
**So that** 생성 결과를 즉시 검토할 수 있다

**Acceptance Criteria:**
- `/download tasks/0001-prd-feature.md` 명령으로 PRD 파일 다운로드
- Slack에서 마크다운 미리보기 가능
- 파일 내용을 바로 확인하여 피드백 제공 가능

### US-3: 설정 파일 확인
**As a** 개발자
**I want to** 프로젝트 설정 파일을 확인
**So that** 현재 설정 상태를 파악할 수 있다

**Acceptance Criteria:**
- `/download src/config.json` 명령으로 설정 파일 다운로드
- JSON 파일의 경우 Slack에서 코드 하이라이팅 표시

### US-4: 소스 코드 검토
**As a** 코드 리뷰어
**I want to** 특정 소스 파일을 다운로드
**So that** 모바일 환경에서도 코드를 검토할 수 있다

**Acceptance Criteria:**
- `/download src/handlers/file-download.ts` 명령으로 소스 파일 다운로드
- 파일 확장자에 맞는 구문 강조 표시
- 다운로드 후 즉시 검토 가능

### US-5: 보안 정책 준수
**As a** 시스템 관리자
**I want to** 민감한 파일 접근을 자동으로 차단
**So that** 보안 사고를 예방할 수 있다

**Acceptance Criteria:**
- `.env`, `*.key`, `*.pem`, `credentials` 파일 접근 시 에러 메시지 표시
- 프로젝트 디렉토리 외부 파일 접근 시 경고 및 차단
- 10MB 초과 파일 다운로드 시도 시 명확한 안내 메시지

## 4. 기능 요구사항 (Functional Requirements)

### FR-1: 슬래시 커맨드 지원
시스템은 `/download <filepath>` 슬래시 커맨드를 제공해야 합니다.
- 입력: 프로젝트 경로 기준 상대 경로
- 예시: `/download logs/app.log`, `/download src/config.json`

### FR-2: 프로젝트 경로 기준 상대 경로 처리
시스템은 입력된 파일 경로를 `/setup`에서 설정한 `projectPath`를 기준으로 해석해야 합니다.
- `ChannelConfig`에서 `projectPath` 가져오기
- 입력 경로를 `path.resolve(projectPath, userInputPath)`로 처리
- 절대 경로 입력 시에도 `projectPath` 기준으로 재해석

### FR-3: 보안 검증 - Path Traversal 방지
시스템은 경로 해석 후 반드시 프로젝트 디렉토리 내부인지 확인해야 합니다.
- 해석된 절대 경로가 `projectPath`로 시작하는지 검증
- `../../etc/passwd` 같은 상위 디렉토리 접근 시도 차단
- 에러 메시지: `⚠️ 프로젝트 디렉토리 외부 파일은 접근할 수 없습니다.`

### FR-4: 보안 검증 - 민감한 파일 차단
시스템은 다음 패턴의 파일 접근을 차단해야 합니다:
- `.env`, `.env.*` (환경 변수 파일)
- `*.key`, `*.pem` (암호화 키, 인증서)
- `credentials`, `password` (대소문자 무관, 파일명에 포함)
- `.ssh/` 디렉토리 내 파일
- `id_rsa`, `id_ed25519` (SSH 키)
- `.git/config` (Git 설정)
- 에러 메시지: `⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다.`

### FR-5: 파일 존재 및 타입 확인
시스템은 파일이 존재하고 일반 파일인지 확인해야 합니다.
- `fs.existsSync()`로 파일 존재 확인
- `fs.statSync().isDirectory()`로 디렉토리 여부 확인
- 파일 없음 에러: `❌ 파일을 찾을 수 없습니다: <filepath>`
- 디렉토리 에러: `⚠️ 디렉토리는 다운로드할 수 없습니다. 파일 경로를 지정하세요.`

### FR-6: 파일 크기 제한
시스템은 10MB를 초과하는 파일 다운로드를 차단해야 합니다.
- `fs.statSync().size`로 파일 크기 확인
- 제한: 10MB (10 * 1024 * 1024 bytes)
- 에러 메시지: `⚠️ 파일이 너무 큽니다 (<size>MB). 최대 10MB까지 가능합니다.`

### FR-7: Slack 파일 업로드
시스템은 검증을 통과한 파일을 Slack으로 업로드해야 합니다.
- Slack API: `app.client.files.uploadV2()`
- 업로드 파라미터:
  - `channel_id`: 현재 채널 ID
  - `file`: `fs.createReadStream(resolvedPath)`
  - `filename`: `path.basename(resolvedPath)`
  - `title`: `${projectName}: ${userInputPath}`
  - `initial_comment`: `✅ 파일 다운로드 완료: \`${userInputPath}\``

### FR-8: 사용자 피드백
시스템은 작업 진행 상황과 결과를 Slack 메시지로 전달해야 합니다.
- 작업 시작 메시지: `⏳ 파일을 다운로드하는 중입니다: \`<filepath>\``
- 성공 시: 파일 업로드 + `✅ 파일 다운로드 완료`
- 실패 시: 에러 메시지 (FR-3~FR-6 참조)

### FR-9: 채널 설정 확인
시스템은 `/download` 명령 실행 전 채널 설정 여부를 확인해야 합니다.
- `ChannelConfig` 존재 여부 확인
- 미설정 시 에러: `⚠️ 먼저 /setup 명령으로 프로젝트를 설정해주세요.`

### FR-10: 에러 처리 및 로깅
시스템은 모든 단계에서 발생하는 에러를 로깅하고 사용자에게 안내해야 합니다.
- 파일 읽기 권한 오류: `❌ 파일 읽기 권한이 없습니다.`
- Slack API 업로드 실패: `❌ 파일 업로드에 실패했습니다. 다시 시도해주세요.`
- 모든 에러는 `getLogger().error()` 로 로깅

## 5. 비목표 (Non-Goals / Out of Scope)

본 기능의 초기 버전(MVP)에서는 다음 기능을 포함하지 않습니다:

1. **디렉토리 다운로드**: 폴더 전체를 zip으로 압축하여 다운로드하는 기능 (향후 확장 가능)
2. **와일드카드 지원**: `logs/*.log` 패턴으로 여러 파일 동시 다운로드 (Phase 2에서 구현 예정)
3. **파일 미리보기**: 작은 텍스트 파일을 Slack 메시지로 먼저 표시하는 기능
4. **파일 검색**: 파일명으로 프로젝트 내 파일을 검색하는 기능
5. **파일 편집**: Slack에서 파일을 수정하여 프로젝트에 반영하는 기능
6. **파일 삭제**: Slack 명령으로 프로젝트 파일을 삭제하는 기능
7. **버전 관리 통합**: 다운로드한 파일의 Git 히스토리 표시 기능

## 6. 설계 고려사항 (Design Considerations)

### 사용자 인터페이스
- **명령어 형식**: `/download <filepath>`
- **자동 완성**: Slack 슬래시 커맨드 자동완성 힌트 제공 (선택사항)
- **에러 메시지**: 이모지와 함께 명확한 한글 메시지 (⚠️, ❌, ✅ 활용)
- **파일 제목**: `${projectName}: ${filepath}` 형식으로 프로젝트 구분 가능

### 아키텍처
- **새 파일 생성**:
  - `src/utils/file-security.ts` - 보안 검증 유틸리티
  - `src/handlers/file-download.ts` - 파일 다운로드 핸들러
- **기존 파일 수정**:
  - `src/index.ts` - `/download` 슬래시 커맨드 등록

### 컴포넌트 구조
```typescript
// src/utils/file-security.ts
export function validateFilePath(
  projectPath: string,
  userInputPath: string
): { valid: boolean; resolvedPath?: string; error?: string }

// src/handlers/file-download.ts
export async function handleFileDownload(
  app: App,
  channelId: string,
  channelConfig: ChannelConfig,
  filePath: string
): Promise<void>
```

## 7. 기술 고려사항 (Technical Considerations)

### 의존성
- **기존 라이브러리 활용**:
  - `@slack/bolt`: `app.client.files.uploadV2()` 사용
  - `fs`: 파일 시스템 접근 (Node.js 내장 모듈)
  - `path`: 경로 처리 (Node.js 내장 모듈)
- **새 의존성**: 없음

### 성능 고려사항
- **파일 스트림 사용**: 대용량 파일(10MB)을 메모리에 모두 로드하지 않고 스트림으로 처리
- **비동기 처리**: 파일 읽기 및 Slack 업로드를 비동기로 처리하여 블로킹 방지

### 보안 아키텍처
- **레이어드 보안 검증**:
  1. Path traversal 검증
  2. 민감한 파일 패턴 검증
  3. 파일 존재 및 타입 검증
  4. 파일 크기 검증
  5. 파일 읽기 권한 확인

### 에러 처리 전략
- **Graceful Degradation**: Slack API 업로드 실패 시에도 명확한 에러 메시지 표시
- **로깅**: 모든 검증 실패 및 에러를 로그에 기록하여 디버깅 지원

## 8. 테스트 요구사항 (Testing Requirements)

### 유닛 테스트 (Unit Testing)

#### 8.1. `validateFilePath()` 함수 테스트

**테스트 파일**: `src/utils/__tests__/file-security.test.ts`

**Happy Path (정상 동작):**
1. 유효한 상대 경로 입력 시 절대 경로 반환 검증
   - Input: `projectPath="/Users/test/project"`, `userInputPath="src/config.json"`
   - Expected: `{ valid: true, resolvedPath: "/Users/test/project/src/config.json" }`

2. 중첩된 디렉토리 경로 처리
   - Input: `projectPath="/Users/test/project"`, `userInputPath="src/handlers/file-download.ts"`
   - Expected: `{ valid: true, resolvedPath: "/Users/test/project/src/handlers/file-download.ts" }`

3. 프로젝트 루트의 파일 접근
   - Input: `projectPath="/Users/test/project"`, `userInputPath="package.json"`
   - Expected: `{ valid: true, resolvedPath: "/Users/test/project/package.json" }`

**Boundary Conditions (경계 조건):**
1. 빈 파일명 입력
   - Input: `userInputPath=""`
   - Expected: `{ valid: false, error: "파일 경로를 입력해주세요." }`

2. 정확히 10MB 크기의 파일
   - Setup: 10MB 테스트 파일 생성
   - Expected: `{ valid: true }`

3. 10MB + 1 byte 크기의 파일
   - Setup: 10MB + 1 byte 테스트 파일 생성
   - Expected: `{ valid: false, error: "파일이 너무 큽니다..." }`

**Exception Cases (예외 처리):**
1. Path traversal 공격 시도 (`../../etc/passwd`)
   - Expected: `{ valid: false, error: "프로젝트 디렉토리 외부..." }`

2. 민감한 파일 접근 시도 (`.env`, `*.key`, `credentials`)
   - Expected: `{ valid: false, error: "보안상 민감한 파일..." }`

3. 존재하지 않는 파일
   - Expected: `{ valid: false, error: "파일을 찾을 수 없습니다." }`

4. 디렉토리 경로 입력
   - Input: `userInputPath="src/"`
   - Expected: `{ valid: false, error: "디렉토리는 다운로드할 수 없습니다." }`

**Side Effects (부작용 검증):**
1. 함수 호출 후 파일 시스템 상태 변화 없음 확인
2. 전역 변수 변경 없음 확인
3. 여러 번 호출 시 동일 입력에 대해 동일 결과 반환 확인

#### 8.2. `handleFileDownload()` 함수 테스트

**테스트 파일**: `src/handlers/__tests__/file-download.test.ts`

**Happy Path:**
1. 정상 파일 다운로드 플로우 검증
   - Mock Slack API 응답 설정
   - 함수 호출 후 `files.uploadV2()` 호출 검증
   - 성공 메시지 전송 확인

**Exception Cases:**
1. 채널 설정 없음 시 에러 처리
2. Slack API 업로드 실패 시 에러 메시지 전송
3. 파일 읽기 권한 오류 처리

### 시스템 테스트 (System Testing)

**테스트 시나리오 1: 로그 파일 다운로드 (US-1 기반)**

**Setup:**
- 테스트 프로젝트에 실제 로그 파일 생성 (`logs/test-app.log`, 5MB)
- `/setup` 명령으로 테스트 채널 설정 완료

**Steps:**
1. Slack에서 `/download logs/test-app.log` 명령 입력
2. 시스템이 파일 검증 수행 (3초 이내)
3. Slack에 파일 업로드 완료 메시지 표시
4. 업로드된 파일 다운로드 및 원본 파일과 내용 일치 확인

**Expected Results:**
- 파일 업로드 성공 메시지: `✅ 파일 다운로드 완료: logs/test-app.log`
- 파일 제목: `{projectName}: logs/test-app.log`
- 다운로드한 파일과 원본 파일의 SHA-256 해시 일치

**테스트 시나리오 2: 보안 정책 검증 (US-5 기반)**

**Setup:**
- 테스트 프로젝트에 `.env` 파일 생성
- `/setup` 명령으로 테스트 채널 설정 완료

**Steps:**
1. Slack에서 `/download .env` 명령 입력
2. 시스템이 민감한 파일 검증 수행 (1초 이내)
3. 에러 메시지 표시 확인
4. 파일이 Slack에 업로드되지 않았는지 확인

**Expected Results:**
- 에러 메시지: `⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다.`
- Slack 채널에 파일 업로드 없음
- 로그에 보안 검증 실패 기록

## 9. 성공 지표 (Success Metrics)

### 기능 성능 지표
- **응답 시간**: 1MB 파일 다운로드 요청 후 Slack 업로드 완료까지 평균 3초 이내
- **성공률**: 정상 파일 다운로드 요청의 95% 이상 성공
- **보안 차단율**: 민감한 파일 접근 시도 100% 차단

### 사용성 지표
- **명령어 사용 빈도**: 주 5회 이상 `/download` 명령 사용
- **에러 발생률**: 사용자 에러(잘못된 경로 입력 등) 20% 미만
- **재시도율**: 에러 발생 후 재시도 성공률 80% 이상

### 비즈니스 지표
- **워크플로우 개선**: 파일 확인을 위한 프로젝트 디렉토리 접근 횟수 50% 감소
- **사용자 만족도**: 기능 사용 후 피드백 설문 평점 4.0/5.0 이상

## 10. 미해결 질문 (Open Questions)

1. **파일 캐싱 필요성**
   - 동일 파일을 반복 다운로드할 경우 Slack 내 캐시 활용 가능한가?
   - 답변: 필요없음

2. **다중 채널 동시 사용**
   - 여러 채널에서 동시에 `/download` 요청 시 성능 문제 발생 가능성
   - 답변: 초기에는 채널별 직렬 처리, 필요 시 병렬 처리 개선

3. **파일 다운로드 이력 관리**
   - 누가 언제 어떤 파일을 다운로드했는지 추적 필요한가?
   - 답변: 필요없음

4. **와일드카드 지원 우선순위**
   - Phase 2에서 와일드카드 지원 시 구현 범위는?
   - 답변: `logs/*.log` 패턴 지원, 압축하지 않고 각각 다운로드

5. **Slack API 제한 대응**
   - Slack API rate limit 초과 시 대응 방안
   - 답변: 에러 메시지로 안내 후 재시도 유도, 필요 시 rate limiting 구현
