# Task List: FR-4.4 버튼 블록 자동 추가 유틸리티 구현

**PRD 참조:** `/tasks/0003-prd-ux-improvements.md` - FR-4.4

**기능 개요:** 모든 봇 응답 메시지에 인터랙티브 버튼 블록(9개 버튼)을 자동으로 추가하여, 사용자가 타이핑 없이 즉시 다음 액션을 수행할 수 있도록 개선

---

## Relevant Files

- `src/bot/formatters.ts` - addInteractiveButtons() 유틸리티 함수 추가
- `src/bot/formatters.test.ts` - formatters.ts 단위 테스트
- `src/bot/interactive-buttons.ts` - 기존 createQuickActionButtons() 함수 활용
- `src/index.ts` - 메시지 전송 코드 수정 (43개소)
- `src/handlers/file-download.ts` - 파일 다운로드 핸들러 메시지 수정 (5개소)
- `src/bot/interactive-buttons.ts` - 버튼 핸들러 메시지 수정 (43개소)
- `src/queue/progress-tracker.ts` - 진행 상황 업데이트 메시지 수정 (1개소)
- `src/queue/orchestrator.ts` - 작업 완료 메시지 수정 (8개소)
- `src/utils/message-splitter.ts` - 메시지 분할 전송 함수 수정 (2개소)

### Notes

#### 구현 배경

**현재 상태:**
- `createQuickActionButtons()` 함수는 이미 구현되어 있음 (src/bot/interactive-buttons.ts:29)
- 9개 버튼 핸들러 모두 구현 완료
- 하지만 실제 메시지 전송 시 버튼 블록이 첨부되지 않음

**문제점:**
- 6개 파일에 분산된 102개의 메시지 전송 코드가 모두 `text` 파라미터만 사용
- `blocks` 파라미터를 사용하는 곳이 없음
- 사용자가 버튼을 활용할 수 없어 타이핑 필요

**해결 방안:**
- `addInteractiveButtons(text: string)` 유틸리티 함수 구현
- 텍스트를 받아 Slack Block Kit 형식의 blocks 배열 반환
- 기존 메시지 전송 코드를 blocks 방식으로 변경

#### Testing Requirements

**Unit Testing:**
- 단위 테스트는 테스트 대상 파일과 동일한 디렉토리에 배치 (예: `formatters.ts` → `formatters.test.ts`)
- Jest 테스트 프레임워크 사용
- 각 단위 테스트는 최소 3개 테스트 케이스 포함:
  - **Happy Path:** 정상적인 사용 시나리오 검증
  - **Boundary Conditions:** 엣지 케이스 (빈 문자열, 긴 텍스트, 특수 문자)
  - **Exception Cases:** 잘못된 입력, 에러 조건 처리
- 테스트 실행: `npx jest src/bot/formatters.test.ts`

**System Testing:**
- PRD의 사용자 스토리 기반 시스템 테스트
- 최소 2개의 실제 사용자 시나리오 검증
- **실제 데이터 사용 필수** - 하드코딩 또는 더미 데이터 금지
- 전체 사용자 워크플로우 검증 (시작부터 끝까지)

---

## Tasks

- [x] 1.0 addInteractiveButtons() 유틸리티 함수 구현
  - [x] 1.1 PRD FR-4.4 요구사항 분석 및 함수 인터페이스 설계
  - [x] 1.2 src/bot/formatters.ts에 addInteractiveButtons() 함수 구현
  - [x] 1.3 텍스트 섹션 블록 생성 (type: 'section', text.type: 'mrkdwn')
  - [x] 1.4 첫 번째 actions 블록 생성 (상태 확인, 파일 다운로드, 취소 버튼)
  - [x] 1.5 두 번째 actions 블록 생성 (엔터, 엔터*2, 방향키 4개 버튼)
  - [x] 1.6 TypeScript 반환 타입 정의 (Block[] 또는 any[])
  - [x] 1.7 JSDoc 주석 작성 (@param, @returns, @example)
  - [x] 1.8 함수 export 및 TypeScript 컴파일 확인

- [ ] 2.0 메시지 전송 코드 수정 (6개 파일, 102개소)
  - [ ] 2.1 src/bot/formatters.ts에 addInteractiveButtons import 추가
  - [ ] 2.2 src/index.ts의 43개 메시지 전송 코드 수정
    - [ ] 2.2.1 handleSetupCommand() 메서드 내 메시지 수정 (text → blocks)
    - [ ] 2.2.2 handleStateCommand() 메서드 내 메시지 수정
    - [ ] 2.2.3 handleRunCommand() 메서드 내 메시지 수정
    - [ ] 2.2.4 handleSnippetCommand() 메서드 내 메시지 수정
    - [ ] 2.2.5 handleCancelCommand() 메서드 내 메시지 수정
    - [ ] 2.2.6 handleHelpCommand() 메서드 내 메시지 수정
    - [ ] 2.2.7 handleDownloadCommand() 메서드 내 메시지 수정
    - [ ] 2.2.8 handleMentionEvent() 메서드 내 메시지 수정
    - [ ] 2.2.9 기타 에러 메시지 및 안내 메시지 수정
  - [ ] 2.3 src/handlers/file-download.ts의 5개 메시지 전송 코드 수정
    - [ ] 2.3.1 addInteractiveButtons import 추가
    - [ ] 2.3.2 handleFileDownload() 함수 내 메시지 수정 (text → blocks)
  - [ ] 2.4 src/bot/interactive-buttons.ts의 43개 메시지 전송 코드 수정
    - [ ] 2.4.1 addInteractiveButtons import 추가
    - [ ] 2.4.2 handleQuickState() 함수 내 메시지 수정
    - [ ] 2.4.3 handleQuickDownload() 함수 내 메시지 수정
    - [ ] 2.4.4 handleQuickCancel() 함수 내 메시지 수정
    - [ ] 2.4.5 handleSendEnter() 함수 내 메시지 수정
    - [ ] 2.4.6 handleSendEnterTwice() 함수 내 메시지 수정
    - [ ] 2.4.7 handleSendUp/Down/Left/Right() 함수 내 메시지 수정
  - [ ] 2.5 src/queue/progress-tracker.ts의 1개 메시지 전송 코드 수정
    - [ ] 2.5.1 addInteractiveButtons import 추가
    - [ ] 2.5.2 진행 상황 업데이트 메시지 수정 (text → blocks)
  - [ ] 2.6 src/queue/orchestrator.ts의 8개 메시지 전송 코드 수정
    - [ ] 2.6.1 addInteractiveButtons import 추가
    - [ ] 2.6.2 작업 시작/완료/실패 메시지 수정 (text → blocks)
  - [ ] 2.7 src/utils/message-splitter.ts의 2개 메시지 전송 코드 수정
    - [ ] 2.7.1 addInteractiveButtons import 추가
    - [ ] 2.7.2 sendSplitMessages() 함수 내 메시지 수정 (text → blocks)
  - [ ] 2.8 TypeScript 컴파일 확인 및 타입 에러 수정

- [ ] 3.0 단위 테스트 작성 및 실행
  - [ ] 3.1 src/bot/formatters.test.ts 파일 생성
  - [ ] 3.2 테스트 환경 설정 (Jest imports, describe 블록)
  - [ ] 3.3 Happy Path 테스트 케이스 3개 작성
    - [ ] 3.3.1 정상적인 텍스트 입력 시 blocks 배열 반환 검증
    - [ ] 3.3.2 blocks 배열 길이 검증 (3개: section + 2개 actions)
    - [ ] 3.3.3 텍스트 섹션 블록 구조 검증 (type, text.type, text.text)
  - [ ] 3.4 Boundary Conditions 테스트 케이스 3개 작성
    - [ ] 3.4.1 빈 문자열 입력 시 정상 처리 검증
    - [ ] 3.4.2 긴 텍스트 입력 시 정상 처리 검증 (1000자 이상)
    - [ ] 3.4.3 특수 문자 포함 텍스트 처리 검증 (마크다운 이스케이프)
  - [ ] 3.5 버튼 블록 구조 검증 테스트 3개 작성
    - [ ] 3.5.1 첫 번째 actions 블록 검증 (3개 버튼: quick_state, quick_download, cancel_job)
    - [ ] 3.5.2 두 번째 actions 블록 검증 (6개 버튼: 엔터, 엔터*2, 방향키 4개)
    - [ ] 3.5.3 버튼 action_id 정확성 검증
  - [ ] 3.6 단위 테스트 실행 (`npx jest src/bot/formatters.test.ts`)
  - [ ] 3.7 테스트 커버리지 확인 (최소 80% 목표)
  - [ ] 3.8 테스트 실패 시 수정 및 재실행

- [ ] 4.0 시스템 테스트 작성 및 실행
  - [ ] 4.1 시스템 테스트 시나리오 설계 (PRD 사용자 스토리 기반)
  - [ ] 4.2 테스트 시나리오 1: /state 명령어 실행 후 버튼 표시 검증
    - [ ] 4.2.1 Slack에서 /state 명령어 실행
    - [ ] 4.2.2 응답 메시지에 9개 버튼 표시 확인
    - [ ] 4.2.3 각 버튼 클릭 시 정상 동작 검증
  - [ ] 4.3 테스트 시나리오 2: Claude Code 작업 완료 메시지에 버튼 표시 검증
    - [ ] 4.3.1 Claude Code 작업 요청 전송
    - [ ] 4.3.2 작업 완료 메시지에 9개 버튼 표시 확인
    - [ ] 4.3.3 버튼을 통한 후속 작업 실행 검증
  - [ ] 4.4 실제 Slack에서 버튼 클릭 동작 검증
    - [ ] 4.4.1 📊 상태 확인 버튼 클릭 → /state 실행 검증
    - [ ] 4.4.2 📥 파일 다운로드 버튼 클릭 → 모달 표시 검증
    - [ ] 4.4.3 ⏎ 엔터 버튼 클릭 → Enter 키 전송 검증
    - [ ] 4.4.4 방향키 버튼 클릭 → 화살표 키 전송 검증
    - [ ] 4.4.5 ❌ 취소 버튼 클릭 → 작업 취소 검증
  - [ ] 4.5 시스템 테스트 결과 문서화 (tests/integration/button-ui-test-results.md)

- [ ] 5.0 문서화 업데이트
  - [ ] 5.1 README.md에 버튼 UI 기능 설명 추가
    - [ ] 5.1.1 "인터랙티브 버튼 UI" 섹션 작성
    - [ ] 5.1.2 9개 버튼 목록 및 기능 설명
    - [ ] 5.1.3 사용 예시 추가
  - [ ] 5.2 개발자 가이드에 addInteractiveButtons() 사용법 추가
    - [ ] 5.2.1 함수 시그니처 및 파라미터 설명
    - [ ] 5.2.2 반환값 구조 설명 (Slack Block Kit 형식)
    - [ ] 5.2.3 코드 예시 추가
  - [ ] 5.3 CHANGELOG.md 업데이트
    - [ ] 5.3.1 버전 번호 및 날짜 추가
    - [ ] 5.3.2 "Added" 섹션에 버튼 UI 기능 추가
    - [ ] 5.3.3 "Changed" 섹션에 메시지 전송 방식 변경 명시
