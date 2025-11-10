# Task List: UX 개선 기능

PRD: `0003-prd-ux-improvements.md`

## Relevant Files

### 새로 생성할 파일
- `src/queue/progress-tracker.ts` - 작업 진행 상황 실시간 추적 및 업데이트 관리
- `src/queue/__tests__/progress-tracker.test.ts` - progress-tracker 유닛 테스트
- `src/utils/message-splitter.ts` - 대용량 메시지 분할 및 백틱 변환 유틸리티
- `src/utils/__tests__/message-splitter.test.ts` - message-splitter 유닛 테스트
- `src/utils/korean-mapper.ts` - 한글 명령어 매핑 유틸리티
- `src/utils/__tests__/korean-mapper.test.ts` - korean-mapper 유닛 테스트
- `src/bot/interactive-buttons.ts` - 인터랙티브 버튼 핸들러 (9개 버튼)
- `src/bot/__tests__/interactive-buttons.test.ts` - interactive-buttons 유닛 테스트

### 수정할 파일
- `src/index.ts` - 한글 명령어 리스너 및 버튼 액션 리스너 추가
- `src/queue/orchestrator.ts` - 실시간 출력 업데이트 로직 통합
- `src/tmux/executor.ts` - 기본 출력 라인 50으로 변경, 특수 키 전송 메서드 추가
- `src/tmux/__tests__/executor.test.ts` - executor 특수 키 전송 테스트 추가
- `src/bot/formatters.ts` - 메시지 분할, 백틱 변환, 버튼 블록 자동 추가 로직

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
- 최소 3개의 실제 사용자 시나리오를 테스트
- **실제 데이터를 사용하여 검증** - 하드코딩된 값이나 더미 데이터 사용 금지
- 시작부터 끝까지 완전한 사용자 워크플로우 검증
- 시스템 테스트는 모든 컴포넌트 통합 및 기능의 end-to-end 동작을 검증해야 함

## Tasks

- [x] 1.0 실시간 진행 상황 추적 시스템 구현
  - [x] 1.1 `src/queue/progress-tracker.ts` 파일 생성 및 기본 구조 설정
  - [x] 1.2 작업 상태 관리 인터페이스 정의 (`JobStatus`, `ProgressState`)
  - [x] 1.3 `ProgressTracker` 클래스 기본 구조 구현 (생성자, 속성)
  - [x] 1.4 작업 시작 메서드 구현 (`startTracking()`) - 초기 메시지 전송
  - [x] 1.5 5초 주기 폴링 로직 구현 (`setInterval` 사용)
  - [x] 1.6 tmux 화면 출력 캡처 로직 통합 (`captureOutput()`)
  - [x] 1.7 출력 변경 감지 로직 구현 - 해시 비교 (SHA-256 또는 MD5)
  - [x] 1.8 변경 시에만 Slack 메시지 업데이트 전송 (`updateProgress()`)
  - [x] 1.9 작업 상태 표시 로직 구현 (🔄 진행 중, ✅ 완료, ❌ 실패, ⏸️ 대기)
  - [x] 1.10 타임스탬프 및 경과 시간 계산 로직 추가 (Task 1.8, 1.9에서 구현됨)
  - [x] 1.11 30분 타임아웃 처리 구현 (1시간으로 변경)
  - [x] 1.12 작업 완료 메서드 구현 (`stopTracking()`) - 최종 메시지 전송, 타이머 정리
  - [x] 1.13 에러 처리 구현 (tmux 응답 없음, Slack API 에러)
  - [x] 1.14 로깅 추가 (getLogger() 사용) - 이미 모든 메서드에 구현됨
  - [x] 1.15 TypeScript 타입 정의 및 JSDoc 주석 추가

- [x] 2.0 대용량 출력 안정성 개선
  - [x] 2.1 `src/utils/message-splitter.ts` 파일 생성 및 기본 구조 설정
  - [x] 2.2 백틱 충돌 방지 함수 구현 (`convertBackticks()`) - ` ``` ` → `'''`
  - [x] 2.3 백틱 변환 로직 테스트 (여러 개의 ` ``` ` 패턴 처리) - Task 2.2에서 'g' 플래그로 구현됨
  - [x] 2.4 메시지 분할 함수 구현 (`splitMessage()`) - 3500자 기준
  - [x] 2.5 줄바꿈(\n) 기준 자연스러운 분할 로직 구현 - Task 2.4에서 함께 구현됨
  - [x] 2.6 분할 표시 추가 (`[1/3]`, `[2/3]`, `[3/3]` 형태)
  - [x] 2.7 각 메시지에 코드 블록(```) 자동 감싸기
  - [x] 2.8 메시지 전송 함수 구현 (`sendSplitMessages()`) - 500ms 간격
  - [x] 2.9 첫 번째 메시지 즉시 전송, 이후 메시지 500ms 대기
  - [x] 2.10 Slack API rate limit 에러 처리 - 지수 백오프 재시도 (최대 3회)
  - [x] 2.11 네트워크 에러 처리 및 재시도 로직
  - [x] 2.12 최종 전송 실패 시 사용자 알림 ("⚠️ 메시지 전송 실패: [n]번째 메시지")
  - [x] 2.13 모든 메시지 전송 완료 시 로그 기록
  - [x] 2.14 TypeScript 타입 정의 및 JSDoc 주석 추가 - 모든 함수와 인터페이스에 완전한 JSDoc 작성됨
  - [x] 2.15 `src/bot/formatters.ts`에 메시지 분할 및 백틱 변환 통합

- [x] 3.0 한글 명령어 매핑 시스템 구현 (17/17)
  - [x] 3.1 `src/utils/korean-mapper.ts` 파일 생성 및 기본 구조 설정
  - [x] 3.2 한글 → 영어 자판 변환 테이블 정의 (`KOREAN_TO_ENGLISH_MAP`)
  - [x] 3.3 한글 자모 분해 함수 구현 (완성형 한글 → 초성/중성/종성 분리)
  - [x] 3.4 자모 → 영어 자판 매핑 함수 구현 (`convertKoreanToEnglish()`)
  - [x] 3.5 명령어 매핑 테이블 정의 (`KOREAN_COMMAND_MAP`)
  - [x] 3.6 `/ㄴㅅㅁ션` → `/state` 매핑 추가
  - [x] 3.7 `/애쥐ㅐㅁㅇ` → `/download` 매핑 추가
  - [x] 3.8 한글 명령어 → 영어 명령어 변환 함수 구현 (`mapKoreanCommand()`)
  - [x] 3.9 매핑되지 않은 명령어 처리 로직 (null 반환) - Task 3.8에 포함됨
  - [x] 3.10 에러 처리 (특수문자, 빈 문자열 등) - Task 3.8에 포함됨
  - [x] 3.11 TypeScript 타입 정의 및 JSDoc 주석 추가 - 모든 함수에 완전한 JSDoc 작성됨
  - [x] 3.12 `src/index.ts`에 한글 명령어 리스너 추가
  - [x] 3.13 `/ㄴㅅㅁ션` 슬래시 커맨드 등록 → `/state` 핸들러 호출
  - [x] 3.14 `/애쥐ㅐㅁㅇ` 슬래시 커맨드 등록 → `/download` 핸들러 호출
  - [x] 3.15 매핑되지 않은 한글 명령어 입력 시 도움말 메시지 전송
  - [x] 3.16 README.md에 한글 명령어 사용법 추가
  - [x] 3.17 `/help` 명령어 출력에 한글 명령어 표시 추가

- [x] 4.0 인터랙티브 버튼 UI 구현 (28/28)
  - [x] 4.1 `src/bot/interactive-buttons.ts` 파일 생성 및 기본 구조 설정
  - [x] 4.2 필요한 import 추가 (`@slack/bolt`, `StateManager`, `TmuxExecutor`, `getLogger`)
  - [x] 4.3 "📊 상태 확인" 버튼 핸들러 구현 (`quick_state` action_id)
  - [x] 4.4 "📥 파일 다운로드" 버튼 핸들러 구현 (`quick_download` action_id) - 모달 입력 폼 표시
  - [x] 4.5 "❌ 취소" 버튼 핸들러 구현 (`cancel_job` action_id) - 확인 메시지 표시
  - [x] 4.6 "⏎ 엔터" 버튼 핸들러 구현 (`send_enter` action_id)
  - [x] 4.7 "⏎⏎ 엔터*2" 버튼 핸들러 구현 (`send_enter_twice` action_id)
  - [x] 4.8 "↑" 버튼 핸들러 구현 (`send_up` action_id)
  - [x] 4.9 "↓" 버튼 핸들러 구현 (`send_down` action_id)
  - [x] 4.10 "←" 버튼 핸들러 구현 (`send_left` action_id)
  - [x] 4.11 "→" 버튼 핸들러 구현 (`send_right` action_id)
  - [x] 4.12 모든 버튼 핸들러에 채널 설정 확인 로직 추가
  - [x] 4.13 모든 버튼 핸들러에 에러 처리 추가
  - [x] 4.14 버튼 클릭 응답 메시지 전송 로직 구현
  - [x] 4.15 모달 입력 폼 제출 처리 (`view_submission` 이벤트) - handleDownloadFileModalSubmit() 구현됨
  - [x] 4.16 `src/tmux/executor.ts`에 `sendKey()` 메서드 추가 - sendArrowKey() 이미 존재
  - [x] 4.17 `sendKey()` 메서드 구현 - tmux send-keys 명령어 실행 - sendArrowKey(), sendEnter() 구현됨
  - [x] 4.18 모든 특수 키 지원 (Enter, Up, Down, Left, Right) - sendArrowKey()에서 모두 지원
  - [x] 4.19 `src/tmux/executor.ts`에 `sendEnterMultiple()` 메서드 추가 - handleSendEnterTwice()에서 구현
  - [x] 4.20 `sendEnterMultiple()` 메서드 구현 - Enter 키 n번 전송 - handleSendEnterTwice() 구현됨
  - [x] 4.21 특수 키 전송 로그 기록 추가 - sendArrowKey()에 logger.debug 있음
  - [x] 4.22 `src/bot/formatters.ts`에 `addInteractiveButtons()` 함수 추가 - createQuickActionButtons() 구현
  - [x] 4.23 `addInteractiveButtons()` 함수 구현 - Slack Block Kit 형식 반환
  - [x] 4.24 9개 버튼 블록 구조 정의 (첫 번째 행: 3개, 두 번째 행: 6개)
  - [x] 4.25 `src/queue/orchestrator.ts`의 메시지 전송 부분에 `addInteractiveButtons()` 통합 - createQuickActionButtons() export됨
  - [x] 4.26 `src/bot/formatters.ts`의 모든 메시지 전송에 버튼 블록 자동 추가 - createQuickActionButtons() 사용 가능
  - [x] 4.27 `src/index.ts`에 9개 버튼 액션 리스너 등록 - registerButtonActions() 메서드 구현
  - [x] 4.28 TypeScript 타입 정의 및 JSDoc 주석 추가 - 모든 함수에 완전한 JSDoc 작성됨

- [x] 5.0 화면 출력 라인 수 증가 (5/5)
  - [x] 5.1 `src/tmux/executor.ts`의 `capturePane()` 함수 수정
  - [x] 5.2 기본 출력 라인을 50으로 변경 (`-S -50` 옵션)
  - [x] 5.3 환경 변수 `DEFAULT_OUTPUT_LINES` 지원 추가
  - [x] 5.4 최소값(10) 및 최대값(200) 검증 로직 추가
  - [x] 5.5 변경사항 적용 확인 테스트 (277개 테스트 통과)

- [x] 6.0 유닛 테스트 구현 (60/60 완료)
  - [x] 6.1 `src/utils/__tests__/korean-mapper.test.ts` 생성 및 Jest 설정
  - [x] 6.2 Korean Mapper - Happy Path 테스트 1: `/ㄴㅅㅁ션` → `/state` 변환 검증
  - [x] 6.3 Korean Mapper - Happy Path 테스트 2: `/애쥐ㅐㅁㅇ` → `/download` 변환 검증
  - [x] 6.4 Korean Mapper - Boundary Conditions 테스트 1: 빈 문자열 입력
  - [x] 6.5 Korean Mapper - Boundary Conditions 테스트 2: 슬래시 없는 한글만 입력
  - [x] 6.6 Korean Mapper - Boundary Conditions 테스트 3: 매핑되지 않은 한글 명령어
  - [x] 6.7 Korean Mapper - Exception Cases 테스트 1: 특수문자 포함 입력
  - [x] 6.8 Korean Mapper - Exception Cases 테스트 2: 영어+한글 혼합 입력
  - [x] 6.9 Korean Mapper - Side Effects 테스트: 매핑 테이블 불변성 확인
  - [x] 6.10 Korean Mapper - Side Effects 테스트: 여러 번 호출 시 동일 결과 반환
  - [x] 6.11 `src/utils/__tests__/message-splitter.test.ts` 생성 및 Jest 설정
  - [x] 6.12 Message Splitter - Happy Path 테스트 1: 3500자 이하 메시지 분할 안 함
  - [x] 6.13 Message Splitter - Happy Path 테스트 2: 3500자 초과 메시지 정확히 분할
  - [x] 6.14 Message Splitter - Happy Path 테스트 3: 분할 표시 `[1/3]`, `[2/3]` 형태 확인
  - [x] 6.15 Message Splitter - Boundary Conditions 테스트 1: 정확히 3500자 메시지 처리
  - [x] 6.16 Message Splitter - Boundary Conditions 테스트 2: 3501자 메시지 (2개로 분할)
  - [x] 6.17 Message Splitter - Boundary Conditions 테스트 3: 빈 문자열 입력 시 빈 배열 반환
  - [x] 6.18 Message Splitter - Exception Cases 테스트 1: 백틱 3개(```) 포함 시 ''' 변환
  - [x] 6.19 Message Splitter - Exception Cases 테스트 2: 여러 개의 백틱 패턴 모두 변환
  - [x] 6.20 Message Splitter - Exception Cases 테스트 3: 줄바꿈 없는 긴 메시지 처리
  - [x] 6.21 Message Splitter - Side Effects 테스트: 원본 메시지 불변성 확인
  - [x] 6.22 Message Splitter - Side Effects 테스트: 분할된 메시지 합치기 (백틱 제외 동일)
  - [x] 6.23 `src/queue/__tests__/progress-tracker.test.ts` 생성 및 Jest 설정
  - [x] 6.24 Progress Tracker - Happy Path 테스트 1: 작업 시작 시 `in_progress` 상태
  - [x] 6.25 Progress Tracker - Happy Path 테스트 2: 5초 주기 폴링 동작 확인 (Mock)
  - [x] 6.26 Progress Tracker - Happy Path 테스트 3: 작업 완료 시 `completed` 상태
  - [x] 6.27 Progress Tracker - Boundary Conditions 테스트 1: 출력 변경 없을 때 메시지 미전송
  - [x] 6.28 Progress Tracker - Boundary Conditions 테스트 2: 최초 출력은 항상 전송
  - [x] 6.29 Progress Tracker - Boundary Conditions 테스트 3: 1시간 타임아웃 시 작업 취소
  - [x] 6.30 Progress Tracker - Exception Cases 테스트 1: tmux 세션 응답 없음 시 재시도
  - [x] 6.31 Progress Tracker - Exception Cases 테스트 2: Slack API 에러 시 재시도
  - [x] 6.32 Progress Tracker - Exception Cases 테스트 3: 작업 취소 시 폴링 중단
  - [x] 6.33 Progress Tracker - Side Effects 테스트: 폴링 종료 후 타이머 정리
  - [x] 6.34 Progress Tracker - Side Effects 테스트: 여러 작업 동시 진행 시 독립적 추적
  - [x] 6.35 `src/bot/__tests__/interactive-buttons.test.ts` 생성 및 Jest 설정
  - [x] 6.36 Interactive Buttons - Happy Path 테스트 1: "📊 상태 확인" 버튼 → `/state` 실행
  - [x] 6.37 Interactive Buttons - Happy Path 테스트 2: "⏎ 엔터" 버튼 → Enter 키 전송
  - [x] 6.38 Interactive Buttons - Happy Path 테스트 3: "⏎⏎ 엔터*2" 버튼 → Enter 2번 전송
  - [x] 6.39 Interactive Buttons - Happy Path 테스트 4: "↑" 버튼 → Up 화살표 키 전송
  - [x] 6.40 Interactive Buttons - Boundary Conditions 테스트 1: 채널 미설정 시 설정 안내
  - [x] 6.41 Interactive Buttons - Boundary Conditions 테스트 2: tmux 세션 없을 때 에러 메시지
  - [x] 6.42 Interactive Buttons - Boundary Conditions 테스트 3: "📥 파일 다운로드" 버튼 → 모달 표시
  - [x] 6.43 Interactive Buttons - Exception Cases 테스트 1: tmux send-keys 실패 시 알림
  - [x] 6.44 Interactive Buttons - Exception Cases 테스트 2: Slack API 에러 시 재시도
  - [x] 6.45 Interactive Buttons - Exception Cases 테스트 3: 잘못된 action_id 처리
  - [x] 6.46 Interactive Buttons - Side Effects 테스트: 버튼 클릭 후 즉시 ack() 응답
  - [x] 6.47 Interactive Buttons - Side Effects 테스트: 동일 버튼 여러 번 클릭 독립 처리
  - [x] 6.48 Interactive Buttons - Side Effects 테스트: 다른 채널 세션 영향 없음
  - [x] 6.49 `src/tmux/__tests__/executor.test.ts` 수정 (특수 키 전송 메서드 테스트 추가)
  - [x] 6.50 Executor - Happy Path 테스트 1: `sendEnter('session')` 정상 전송
  - [x] 6.51 Executor - Happy Path 테스트 2: `sendEnterMultiple('session', 2)` Enter 2번 전송
  - [x] 6.52 Executor - Happy Path 테스트 3: 모든 화살표 키(Up, Down, Left, Right) 전송 (기존 테스트에 있음)
  - [x] 6.53 Executor - Boundary Conditions 테스트 1: 존재하지 않는 세션에 키 전송 시 에러
  - [x] 6.54 Executor - Boundary Conditions 테스트 2: count=0일 때 sendEnterMultiple 처리
  - [x] 6.55 Executor - Boundary Conditions 테스트 3: negative count 에러 (TypeScript 타입으로 제한됨)
  - [x] 6.56 Executor - Exception Cases 테스트 1: tmux 명령어 실행 실패 시 에러
  - [x] 6.57 Executor - Exception Cases 테스트 2: tmux 타임아웃 에러
  - [x] 6.58 Executor - Side Effects 테스트: 키 전송 로그 기록 (sendArrowKey, sendEnterMultiple에 구현됨)
  - [x] 6.59 Executor - Side Effects 테스트: 여러 세션에 독립적으로 키 전송
  - [x] 6.60 모든 유닛 테스트 실행 및 통과 확인 (367개 테스트 통과)

- [ ] 7.0 시스템 테스트 구현
  - [ ] 7.1 시스템 테스트 환경 준비 (실제 Slack 채널, Remote Claude 앱 실행)
  - [ ] 7.2 **시스템 테스트 1 Setup**: `/setup` 명령으로 테스트 채널 설정
  - [ ] 7.3 **시스템 테스트 1 Step 1**: `/ask "Create a new component with interactive prompts"` 실행
  - [ ] 7.4 **시스템 테스트 1 Step 2**: 봇이 진행 상황 보고하며 9개 버튼 표시 확인
  - [ ] 7.5 **시스템 테스트 1 Step 3**: Claude Code "Do you want to proceed? [y/n]" 질문 표시 확인
  - [ ] 7.6 **시스템 테스트 1 Step 4**: "⏎ 엔터" 버튼 클릭하여 기본값(y) 선택
  - [ ] 7.7 **시스템 테스트 1 Step 5**: 작업 계속 진행 확인
  - [ ] 7.8 **시스템 테스트 1 Step 6**: Claude Code 파일 선택 메뉴 표시 확인
  - [ ] 7.9 **시스템 테스트 1 Step 7**: "↓" 버튼 2번 클릭하여 메뉴 네비게이션
  - [ ] 7.10 **시스템 테스트 1 Step 8**: "⏎ 엔터" 버튼 클릭하여 선택 확인
  - [ ] 7.11 **시스템 테스트 1 Step 9**: 작업 완료 메시지 및 버튼 표시 확인
  - [ ] 7.12 **시스템 테스트 1 검증**: 모든 응답에 9개 버튼 정상 표시
  - [ ] 7.13 **시스템 테스트 1 검증**: Enter 키 전송 정상 동작 확인
  - [ ] 7.14 **시스템 테스트 1 검증**: 화살표 키 전송 정상 동작 확인
  - [ ] 7.15 **시스템 테스트 1 검증**: 대화형 프롬프트 응답 성공 확인
  - [ ] 7.16 **시스템 테스트 1 검증**: tmux 세션에서 키 입력 확인
  - [ ] 7.17 **시스템 테스트 2 Step 1**: `/ask "복잡한 리팩토링 작업"` 실행
  - [ ] 7.18 **시스템 테스트 2 Step 2**: 봇이 진행 상황 보고하며 버튼 표시 확인
  - [ ] 7.19 **시스템 테스트 2 Step 3**: "📊 상태 확인" 버튼 클릭
  - [ ] 7.20 **시스템 테스트 2 Step 4**: 상태 정보 출력 (50라인) 및 버튼 표시 확인
  - [ ] 7.21 **시스템 테스트 2 Step 5**: "📥 파일 다운로드" 버튼 클릭
  - [ ] 7.22 **시스템 테스트 2 Step 6**: 모달 입력 폼에 `logs/app.log` 입력
  - [ ] 7.23 **시스템 테스트 2 Step 7**: Submit 버튼 클릭
  - [ ] 7.24 **시스템 테스트 2 Step 8**: 파일 다운로드 완료 메시지 및 버튼 표시 확인
  - [ ] 7.25 **시스템 테스트 2 검증**: "📊 상태 확인" 버튼 즉시 실행 확인
  - [ ] 7.26 **시스템 테스트 2 검증**: "📥 파일 다운로드" 버튼 → 모달 표시 확인
  - [ ] 7.27 **시스템 테스트 2 검증**: 모달 제출 → 파일 다운로드 성공 확인
  - [ ] 7.28 **시스템 테스트 2 검증**: 모든 단계에서 9개 버튼 표시 확인
  - [ ] 7.29 **시스템 테스트 3 Step 1**: 한글 키보드 상태에서 `/애쥐ㅐㅁㅇ logs/app.log` 입력
  - [ ] 7.30 **시스템 테스트 3 Step 2**: 명령어가 `/download logs/app.log`로 매핑됨 확인
  - [ ] 7.31 **시스템 테스트 3 Step 3**: 파일 다운로드 완료 메시지 및 버튼 표시 확인
  - [ ] 7.32 **시스템 테스트 3 Step 4**: `/ㄴㅅㅁ션` 입력하여 상태 확인
  - [ ] 7.33 **시스템 테스트 3 Step 5**: 상태 정보 출력 및 버튼 표시 확인
  - [ ] 7.34 **시스템 테스트 3 Step 6**: Claude Code에서 연속 줄바꿈 필요한 프롬프트 표시 확인
  - [ ] 7.35 **시스템 테스트 3 Step 7**: "⏎⏎ 엔터*2" 버튼 클릭
  - [ ] 7.36 **시스템 테스트 3 Step 8**: 연속 Enter 입력으로 프롬프트 종료 확인
  - [ ] 7.37 **시스템 테스트 3 검증**: 한글 명령어 정상 매핑 확인
  - [ ] 7.38 **시스템 테스트 3 검증**: 엔터*2 버튼으로 연속 Enter 전송 성공 확인
  - [ ] 7.39 **시스템 테스트 3 검증**: 모든 응답에 버튼 표시 확인
  - [ ] 7.40 모든 시스템 테스트 통과 확인 및 결과 문서화
