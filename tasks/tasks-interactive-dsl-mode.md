# 태스크: Claude Code 제어를 위한 인터랙티브 DSL 모드

PRD: `0001-prd-interactive-dsl-mode.md` 기반

## 관련 파일

### 새로 생성할 파일

- `src/dsl/parser.ts` - 백틱 명령 파싱 및 자동 분류 로직
- `src/dsl/parser.test.ts` - parser.ts 유닛 테스트
- `src/dsl/executor.ts` - DSL 명령 순차 실행 로직
- `src/dsl/executor.test.ts` - executor.ts 유닛 테스트
- `src/dsl/detector.ts` - 인터랙티브 프롬프트 자동 감지
- `src/dsl/detector.test.ts` - detector.ts 유닛 테스트
- `src/dsl/errors.ts` - DSL 에러 정의 및 메시지 생성
- `src/handlers/input-processor.ts` - 4단계 입력 처리 파이프라인
- `src/handlers/input-processor.test.ts` - input-processor.ts 유닛 테스트
- `src/handlers/mention-filter.ts` - Slack 멘션 필터링 로직
- `src/handlers/mention-filter.test.ts` - mention-filter.ts 유닛 테스트
- `src/__tests__/system/dsl-workflow.test.ts` - 시스템 테스트 (종단간 시나리오)

### 수정할 파일

- `src/tmux/executor.ts` - 특수 키 전송 함수 추가 (`sendArrowKey()`, `sendEnter()`)
- `src/tmux/parser.ts` - 화면 캡처 및 ANSI 제거 로직 확장
- `src/queue/orchestrator.ts` - 4단계 입력 처리 파이프라인 통합
- `src/bot/commands/ask.ts` - /ask 명령 제거 또는 deprecated 표시
- `src/bot/formatters.ts` - DSL 응답 메시지 포맷터 추가

## 참고사항

### 테스팅 요구사항

**유닛 테스팅:**
- 유닛 테스트는 테스트 대상 파일과 같은 디렉토리에 배치 (예: `parser.ts`와 `parser.test.ts`)
- Jest를 사용한 TypeScript 테스트
- 각 유닛 테스트는 최소 3개 케이스 포함:
  - **정상 경로 (Happy Path):** 가장 일반적인 사용 시나리오
  - **경계 조건 (Boundary Conditions):** 최소/최대값, 빈 입력, null 값 등
  - **예외 케이스 (Exception Cases):** 잘못된 입력, 에러 조건 등
  - **부작용 검증 (Side Effects):** 테스트 독립성, 전역 상태 영향 없음
- 실행: `npx jest [선택적/경로/테스트파일]`

**시스템 테스팅:**
- PRD의 사용자 스토리 기반으로 최소 5개 종단간 시나리오 테스트
- 실제 데이터 사용 (하드코딩 금지)
- 전체 워크플로우 검증: Slack → 파싱 → tmux → 캡처 → Slack 응답
- 응답 시간 측정 및 기록 (목표: ≤3초)

### 아키텍처 고려사항

- **Stateless 처리:** 별도의 인터랙티브 모드 상태 관리 불필요
- **백틱 파싱:** 정규식으로 백틱 세그먼트 추출 후 각 세그먼트 내용 분석
- **tmux 통합:** `tmux send-keys -t [session] [key]` 사용
- **지연 설정:** 키 사이 100ms, 최종 명령 후 500ms
- **성능 목표:** 파싱 <10ms, 명령당 키 전송 ~100ms, 화면 캡처 ~200ms, 총 응답 시간 ≤3초

### 주요 기술 결정

1. **FR1-FR2:** 백틱 자동 분류 - 키 매핑 문자(r,l,u,d,e) 감지로 키/텍스트 구분
2. **FR6:** 4단계 입력 처리 - Slack 네이티브 → 봇 메타 → 백틱 → 기본 입력
3. **FR9:** Slack 멘션 필터링 - 정규식 `/<@[A-Z0-9]+>|<!channel>|<!here>|<!everyone>/g` 사용
4. **FR10:** /ask 제거 - 기본 입력을 자동으로 Claude Code에 전송

## 태스크

- [x] 1.0 백틱 명령 파싱 및 분류 로직 구현
  - [x] 1.1 `src/dsl/parser.ts` 파일 생성 및 기본 구조 작성
  - [x] 1.2 `isKeySequence()` 함수 구현 - 백틱 내용이 순수 키 시퀀스인지 판별
  - [x] 1.3 키 매핑 정의 (r→Right, l→Left, u→Up, d→Down, e→Enter) - Task 1.1에서 이미 완료
  - [x] 1.4 백틱 추출 정규식 구현 (`` `content` `` 패턴 매칭)
  - [x] 1.5 `parseInteractiveCommand()` 함수 구현 - 백틱 세그먼트 분류 (키/텍스트/에러)
  - [x] 1.6 혼합 문자 감지 로직 구현 - Task 1.2 isKeySequence()에서 이미 구현됨
  - [x] 1.7 에러 객체 생성 및 명확한 가이드 메시지 포함 - Task 1.2에서 이미 구현됨

- [x] 2.0 tmux 특수 키 전송 및 화면 캡처 구현
  - [x] 2.1 `src/tmux/executor.ts`에 `sendArrowKey()` 함수 추가
  - [x] 2.2 `sendEnter()` 함수 추가 - 이미 구현되어 있음
  - [x] 2.3 `executeCommandSequence()` 함수 구현 - 명령 배열을 순차 실행
  - [x] 2.4 키 전송 간 지연 구현 (100ms) - Task 2.3에 통합됨
  - [x] 2.5 최종 명령 후 대기 시간 구현 (500ms) - Task 2.3에 통합됨
  - [x] 2.6 `src/tmux/parser.ts`에 화면 캡처 로직 확장 - 선택 메뉴, 번호 옵션, 종합 감지 추가
  - [x] 2.7 ANSI 이스케이프 코드 제거 로직 구현 - 이미 구현되어 있음, DSL 포맷터 추가
  - [x] 2.8 `src/bot/formatters.ts`에 DSL 응답 메시지 포맷터 추가 - 5개 함수 추가
  - [x] 2.9 Slack 메시지 전송 통합 (캡처된 화면 + 도움말) - JobOrchestrator에 5개 함수 추가

- [x] 3.0 인터랙티브 프롬프트 자동 감지 구현
  - [x] 3.1 `src/dsl/detector.ts` 파일 생성 - detectAndSuggest, confidence 계산, 통계 기능
  - [x] 3.2 패턴 매칭 로직 구현 - `❯` 마커 감지 - Task 2.6에서 구현됨 (parser.ts)
  - [x] 3.3 번호 옵션 감지 (1., 2., 3. 패턴) - Task 2.6에서 구현됨 (parser.ts)
  - [x] 3.4 [y/n] 프롬프트 감지 - 이미 구현되어 있음 (parser.ts)
  - [x] 3.5 감지 시 제안 메시지 생성 로직 - Task 2.8에서 구현됨 (formatters.ts)
  - [x] 3.6 Slack 알림 전송 통합 - Task 2.9에서 구현됨 (orchestrator.ts)

- [ ] 4.0 4단계 입력 처리 파이프라인 구현
  - [x] 4.1 `src/handlers/input-processor.ts` 파일 생성
  - [x] 4.2 1단계 구현: Slack 네이티브 명령 감지 및 패스스루
  - [x] 4.3 2단계 구현: 봇 메타 명령 처리 (`/setup`, `/status`, `/help`, `/stop`)
  - [x] 4.4 3단계 구현: 백틱 명령 감지 및 DSL 파서 호출
  - [x] 4.5 4단계 구현: 기본 입력 처리 - Slack 멘션 필터링 후 Claude Code 전송
  - [x] 4.6 `src/handlers/mention-filter.ts` 파일 생성
  - [x] 4.7 `filterSlackMentions()` 함수 구현 - 정규식으로 Slack 멘션 제거
  - [x] 4.8 멘션 제거 시 사용자 알림 메시지 생성
  - [x] 4.9 `processInput()` 함수 구현 - 전체 4단계 파이프라인 조율
  - [x] 4.10 `src/queue/orchestrator.ts`에 입력 처리 파이프라인 통합 - Task 2.9에서 구현됨
  - [x] 4.11 `src/bot/commands/ask.ts` 수정 - /ask deprecated 표시

- [ ] 5.0 오류 처리 및 사용자 가이드 구현
  - [ ] 5.1 `src/dsl/errors.ts` 파일 생성
  - [ ] 5.2 혼합 문자 에러 클래스 정의 (`MixedCharacterError`)
  - [ ] 5.3 혼합 문자 에러 메시지 템플릿 작성 (키 문자 vs 일반 문자 구분 표시)
  - [ ] 5.4 사용자 가이드 메시지 생성 (해결 방법 제시)
  - [ ] 5.5 tmux 실패 에러 처리 로직
  - [ ] 5.6 타임아웃 에러 처리 로직
  - [ ] 5.7 각 에러 타입별 Slack 메시지 포맷 정의

- [ ] 6.0 유닛 테스트 구현
  - [ ] 6.1 `src/dsl/parser.test.ts` 생성 및 `parseInteractiveCommand()` 테스트
    - [ ] 6.1.1 정상 경로: `ddd` → [Down, Down, Down]
    - [ ] 6.1.2 경계 조건: `ddd` text `e` → [Down×3, "text", Enter]
    - [ ] 6.1.3 예외 케이스: `ddx` → 혼합 문자 에러 발생
  - [ ] 6.2 `isKeySequence()` 테스트 추가
    - [ ] 6.2.1 정상 경로: "ddd" → true
    - [ ] 6.2.2 경계 조건: "console" → false
    - [ ] 6.2.3 예외 케이스: "ddx" → 혼합 감지 에러
  - [ ] 6.3 `src/tmux/executor.ts`에 `sendArrowKey()` 테스트 추가
    - [ ] 6.3.1 정상 경로: Down 키 성공적으로 전송
    - [ ] 6.3.2 경계 조건: 4가지 방향 모두 테스트 (Right, Left, Up, Down)
    - [ ] 6.3.3 예외 케이스: 잘못된 세션 이름 오류 처리
  - [ ] 6.4 `src/dsl/executor.test.ts` 생성 및 `executeCommandSequence()` 테스트
    - [ ] 6.4.1 정상 경로: [Down, Enter] 성공적으로 실행
    - [ ] 6.4.2 경계 조건: 단일 키 명령
    - [ ] 6.4.3 예외 케이스: 시퀀스 중간에 tmux 실패
  - [ ] 6.5 `src/handlers/mention-filter.test.ts` 생성 및 `filterSlackMentions()` 테스트
    - [ ] 6.5.1 정상 경로: "<@U12345> text" → "text", 멘션 1개 감지
    - [ ] 6.5.2 경계 조건: "<!channel> <!here> text" → "text", 멘션 2개 감지
    - [ ] 6.5.3 예외 케이스: "@file.ts text" → "@file.ts text", 멘션 0개
  - [ ] 6.6 `src/handlers/input-processor.test.ts` 생성 및 `processInput()` 테스트
    - [ ] 6.6.1 정상 경로: "implement feature" → Claude Code 전송
    - [ ] 6.6.2 경계 조건: "/status" → 봇 명령, "`ddd`" → 백틱 명령
    - [ ] 6.6.3 예외 케이스: "" (빈 문자열) → 무시 또는 에러

- [ ] 7.0 시스템 테스트 구현
  - [ ] 7.1 `src/__tests__/system/dsl-workflow.test.ts` 파일 생성
  - [ ] 7.2 시스템 테스트 1: 간단한 선택
    - [ ] 7.2.1 선택 UI를 표시하는 테스트 프롬프트로 Claude Code 시작
    - [ ] 7.2.2 사용자가 Slack을 통해 `e` 전송 시뮬레이션
    - [ ] 7.2.3 검증: 명령 파싱, Enter 전송, 화면 캡처, Slack 메시지 업데이트
    - [ ] 7.2.4 응답 시간 측정 및 ≤3초 검증
  - [ ] 7.3 시스템 테스트 2: 혼합 입력
    - [ ] 7.3.1 텍스트 입력 필요 프롬프트로 Claude Code 트리거
    - [ ] 7.3.2 사용자가 `ddd` custom value `e` 전송 시뮬레이션
    - [ ] 7.3.3 검증: Down×3, "custom value" 텍스트, Enter 전송, 화면 캡처
    - [ ] 7.3.4 응답 시간 측정 및 ≤3초 검증
  - [ ] 7.4 시스템 테스트 3: 혼합 문자 에러
    - [ ] 7.4.1 사용자가 `ddx` 전송 시뮬레이션
    - [ ] 7.4.2 검증: 에러 메시지 표시, 명령 실행 안 됨, 가이드 제공
    - [ ] 7.4.3 사용자가 `dd` 재전송 시뮬레이션
    - [ ] 7.4.4 검증: Down×2 정상 실행
  - [ ] 7.5 시스템 테스트 4: Slack 멘션 필터링 (FR9)
    - [ ] 7.5.1 사용자가 "@홍길동 @file.ts 파일 수정" 입력 시뮬레이션
    - [ ] 7.5.2 Slack이 "<@U12345> @file.ts 파일 수정"으로 변환
    - [ ] 7.5.3 검증: Slack 멘션 감지, 필터링, 사용자 알림
    - [ ] 7.5.4 검증: "@file.ts 파일 수정"만 Claude Code로 전송
    - [ ] 7.5.5 검증: @file.ts 파일 참조 정상 작동
  - [ ] 7.6 시스템 테스트 5: 기본 입력 처리 (FR10)
    - [ ] 7.6.1 사용자가 "/ask" 없이 "implement feature X" 입력 시뮬레이션
    - [ ] 7.6.2 검증: 자동으로 Claude Code에 요청 전송
    - [ ] 7.6.3 사용자가 "이 코드 설명해줘" 입력 시뮬레이션
    - [ ] 7.6.4 검증: 자동으로 Claude Code에 요청 전송
    - [ ] 7.6.5 사용자가 `/status` 입력 시뮬레이션
    - [ ] 7.6.6 검증: 봇 명령 우선 처리
    - [ ] 7.6.7 사용자가 `ddd` 입력 시뮬레이션
    - [ ] 7.6.8 검증: 백틱 명령 정상 처리
    - [ ] 7.6.9 검증: 4단계 입력 처리 로직 정상 작동
  - [ ] 7.7 응답 시간 로깅 및 성능 분석 추가
  - [ ] 7.8 타임아웃 및 오류 조건 테스트 시나리오 추가
