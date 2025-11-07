# PRD: 사용자 경험 개선 (UX Improvements)

## 1. 개요 (Introduction/Overview)

Remote Claude 사용자들이 Slack을 통해 Claude Code를 원격 제어할 때 겪는 불편함을 해소하고, 특히 모바일 환경에서의 사용성을 향상시키기 위한 종합적인 UX 개선 작업입니다.

**주요 문제점:**
- `/ask` 명령어 실행 시 초기 응답 후 진행 상황이 업데이트되지 않아 작업 완료 여부를 알 수 없음
- 대용량 출력 시 백틱(```) 처리가 깨져 코드 블록이 제대로 표시되지 않음
- 스마트폰에서 슬래시 명령어 입력이 번거로움 (한영 전환, 키보드 타이핑)
- 한글 입력 상태에서 영어 명령어 입력을 위해 언어 전환이 필요함
- 화면 출력이 짧아 상태 확인이 어려움

**해결 방안:**
본 PRD는 5가지 핵심 개선사항을 정의하여, Remote Claude의 사용성과 안정성을 크게 향상시킵니다.

## 2. 목표 (Goals)

1. **결과 보고 안정성 향상**: `/ask` 명령어 실행 시 실시간 진행 상황 업데이트로 사용자 불안감 해소
2. **대용량 출력 안정성 확보**: 백틱 충돌 방지 및 메시지 분할로 Slack 제한 회피
3. **한글 사용자 편의성 향상**: 영어 자판 그대로 입력 가능한 한글 명령어로 언어 전환 불필요
4. **모바일 사용성 개선**: Slack App Home의 버튼 UI로 터치 입력 편의성 극대화
5. **출력 가독성 향상**: 기본 출력 라인 수 증가로 상태 파악 용이

## 3. 사용자 스토리 (User Stories)

### US-1: 실시간 작업 진행 상황 확인
**As a** Remote Claude 사용자
**I want to** `/ask` 명령어 실행 시 실시간으로 진행 상황을 확인할 수 있기를
**So that** 작업이 정상적으로 진행 중인지, 언제 완료될지 알 수 있다.

**시나리오:**
1. 사용자가 `/ask "복잡한 리팩토링 작업 수행"` 명령어 실행
2. 초기 응답: "⏳ 작업을 시작합니다..."
3. 5초마다 화면 출력 업데이트 (최근 50라인)
4. Claude Code가 파일을 수정할 때마다 Slack에 알림
5. 최종 완료 메시지: "✅ 작업 완료" + 최종 결과

**현재 문제:**
- 초기 응답 1번 후 업데이트 없음
- 작업이 성공한 것처럼 표시되지만 실제로는 진행 중

### US-2: 깨지지 않는 대용량 코드 출력
**As a** Remote Claude 사용자
**I want to** 큰 파일이나 긴 코드 출력 시에도 백틱이 깨지지 않고 정상적으로 표시되기를
**So that** 코드를 복사하거나 읽을 때 편리하다.

**시나리오:**
1. 사용자가 `/ask "src/ 디렉토리의 모든 파일 내용 출력"` 실행
2. 출력 내용에 백틱 3개(```)가 포함된 경우 자동으로 '''로 변환
3. 3500자 초과 시 자동으로 메시지 분할
4. 각 메시지는 500ms 간격으로 전송되어 순서 보장
5. 모든 메시지가 코드 블록으로 정상 표시

**현재 문제:**
- 출력 내용에 ```가 있으면 코드 블록이 깨짐
- Slack 4000자 제한 초과 시 메시지 전송 실패

### US-3: 한글 입력 상태에서 명령어 실행
**As a** 한글 키보드를 사용하는 사용자
**I want to** 영어로 언어 전환 없이 한글 상태에서 명령어를 입력할 수 있기를
**So that** 빠르게 명령어를 실행할 수 있다.

**시나리오:**
1. 사용자가 Slack에서 한글 입력 상태
2. `/ㄴㅅㅁ션` 입력 (영어 자판 그대로: /status)
3. 시스템이 자동으로 `/state`로 인식
4. 상태 정보 정상 출력

**지원 명령어:**
- `/ㄴㅅㅁ션` → `/state`
- `/애쥐ㅐㅁㅇ` → `/download`

### US-4: 스마트폰에서 버튼으로 즉시 명령 실행
**As a** 모바일에서 Remote Claude를 사용하는 사용자
**I want to** 봇의 모든 응답에 함께 표시되는 버튼으로 즉시 명령을 실행할 수 있기를
**So that** 타이핑이나 특수 키 입력 없이 빠르게 다음 액션을 수행할 수 있다.

**시나리오:**
1. 사용자가 `/ask` 명령어를 실행하여 Claude Code에 작업 요청
2. 봇이 진행 상황을 보고할 때마다 9개 버튼이 함께 표시됨:
   - 📊 상태 확인
   - 📥 파일 다운로드
   - ⏎ 엔터
   - ⏎⏎ 엔터*2
   - ↑ 위
   - ↓ 아래
   - ← 좌
   - → 우
   - ❌ 취소
3. Claude Code가 "Do you want to proceed? [y/n]" 질문 표시
4. 사용자가 "⏎ 엔터" 버튼 클릭하여 즉시 응답
5. 작업이 계속 진행됨

**특수 키 사용 예시:**
- Claude Code CLI에서 파일 선택 시 ↑↓ 버튼으로 네비게이션
- 확인 프롬프트에서 ⏎ 버튼으로 기본값 선택
- 연속 줄바꿈이 필요한 경우 ⏎⏎ 버튼 사용

### US-5: 충분한 화면 출력으로 상태 파악
**As a** Remote Claude 사용자
**I want to** 상태 확인 시 충분한 양의 출력을 볼 수 있기를
**So that** 스크롤 없이 한 번에 상태를 파악할 수 있다.

**시나리오:**
1. 사용자가 `/state` 명령어 실행
2. 최근 50라인의 tmux 화면 출력 표시
3. 작업 진행 상황 업데이트 시에도 50라인 출력
4. 사용자가 전체 맥락을 파악 가능

**현재 문제:**
- 기본 출력 라인이 너무 적어 상태 확인 어려움

## 4. 기능 요구사항 (Functional Requirements)

### 우선순위 1: 결과 보고 누락 개선

#### FR-1.1: 실시간 출력 업데이트
**설명:** `/ask` 명령어 실행 중 5초마다 tmux 화면 출력을 Slack으로 전송하여 진행 상황을 실시간으로 보고해야 한다.

**상세 요구사항:**
- 초기 작업 시작 메시지: "⏳ 작업을 시작합니다..."
- 5초 주기로 tmux pane 화면 캡처 (최근 50라인)
- 이전 출력과 비교하여 변경사항이 있을 때만 업데이트 전송
- 중복 메시지 방지를 위한 해시 비교 로직 구현
- 작업 완료 시 최종 결과 메시지: "✅ 작업 완료"

**입력:**
- 명령어: `/ask <prompt>`
- 폴링 주기: 5초

**출력:**
- 초기 메시지 (1회)
- 진행 상황 업데이트 메시지 (변경 시마다)
- 최종 완료 메시지 (1회)

**에러 처리:**
- tmux 세션 응답 없음 시: "⚠️ tmux 세션 응답 없음. 재시도 중..."
- 최대 대기 시간 초과 (30분) 시: "⏰ 작업 시간이 초과되었습니다."

#### FR-1.2: 작업 상태 표시
**설명:** 작업이 진행 중, 완료, 실패 상태를 명확히 구분하여 표시해야 한다.

**상태 구분:**
- 🔄 진행 중: "🔄 작업 진행 중... (경과 시간: 1분 30초)"
- ✅ 완료: "✅ 작업 완료 (총 소요 시간: 5분 20초)"
- ❌ 실패: "❌ 작업 실패: [에러 메시지]"
- ⏸️ 대기: "⏸️ 사용자 입력 대기 중..."

**타임스탬프 포함:**
- 시작 시간, 경과 시간, 완료 시간 표시

#### FR-1.3: 출력 라인 수 증가
**설명:** `/state` 명령어 및 작업 진행 상황 보고 시 기본 출력 라인을 50라인으로 증가해야 한다.

**적용 대상:**
- `/state` 명령어 실행 시
- `/ask`, `/run` 명령어 실행 중 진행 상황 업데이트 시
- 대화형 프롬프트 감지 시 화면 출력

**설정:**
- 기본값: 50 라인
- 최소값: 10 라인
- 최대값: 200 라인

### 우선순위 2: 대용량 출력 개선

#### FR-2.1: 백틱 충돌 방지
**설명:** 출력 내용에 백틱 3개(```)가 포함되어 있을 경우, 이를 작은따옴표 3개(''')로 자동 변환하여 코드 블록이 깨지지 않도록 해야 한다.

**변환 규칙:**
- 출력 내용에서 ` ``` ` 패턴 감지
- 감지된 모든 ` ``` `를 `'''`로 치환
- Slack 메시지 전송 전에 변환 수행
- 변환 로그 기록 (디버깅용)

**예시:**
```
// 원본 출력
```javascript
console.log("test");
```

// 변환 후
'''javascript
console.log("test");
'''
```

**주의사항:**
- 백틱 1개(`) 또는 2개(``)는 변환하지 않음
- 코드 블록 외부의 백틱은 유지

#### FR-2.2: 메시지 자동 분할
**설명:** Slack 메시지가 3500자를 초과할 경우, 자동으로 여러 메시지로 분할하여 전송해야 한다.

**분할 규칙:**
- 기준: 3500자 (Slack 제한 4000자보다 여유 있게)
- 분할 지점: 가능한 줄바꿈(\n) 기준으로 분할
- 각 메시지는 코드 블록(```)으로 감싸기
- 분할 표시: 메시지 상단에 `[1/3]`, `[2/3]`, `[3/3]` 형태로 표시

**메시지 구조:**
```
[1/3]
```
<첫 번째 부분>
```

[2/3]
```
<두 번째 부분>
```

[3/3]
```
<세 번째 부분>
```
```

#### FR-2.3: 메시지 전송 간격 제어
**설명:** 분할된 메시지를 전송할 때, 500ms 간격을 두어 Slack API 속도 제한을 회피하고 메시지 순서를 보장해야 한다.

**전송 로직:**
- 첫 번째 메시지 즉시 전송
- 이후 메시지는 500ms 대기 후 전송
- 전송 실패 시 3회까지 재시도 (지수 백오프)
- 모든 메시지 전송 완료 시 로그 기록

**에러 처리:**
- Slack API rate limit 에러 시 대기 후 재시도
- 네트워크 에러 시 재시도
- 최종 실패 시 사용자에게 알림: "⚠️ 메시지 전송 실패: [n]번째 메시지"

### 우선순위 3: 한글 명령어 추가

#### FR-3.1: 영어 자판 한글 매핑
**설명:** 사용자가 한글 입력 상태에서 영어 자판 위치 그대로 입력한 명령어를 인식하여 처리해야 한다.

**지원 명령어:**
- `/ㄴㅅㅁ션` → `/state` (영어: `/status`)
- `/애쥐ㅐㅁㅇ` → `/download`

**매핑 테이블:**
| 한글 입력 | 영어 자판 | 실제 명령어 |
|----------|---------|-----------|
| ㄴㅅㅁ션   | status  | /state    |
| 애쥐ㅐㅁㅇ  | download | /download |

**동작:**
1. Slack 슬래시 커맨드 리스너에서 한글 명령어 감지
2. 매핑 테이블에서 해당하는 영어 명령어로 변환
3. 기존 영어 명령어 핸들러로 전달
4. 정상 처리

**에러 처리:**
- 매핑되지 않은 한글 명령어 입력 시: "⚠️ 알 수 없는 명령어입니다. `/help`를 실행하여 사용 가능한 명령어를 확인하세요."

#### FR-3.2: 한글-영어 명령어 병행 지원
**설명:** 기존 영어 명령어는 그대로 유지하고, 한글 명령어를 추가로 지원해야 한다.

**호환성:**
- `/state`와 `/ㄴㅅㅁ션` 모두 동일하게 동작
- `/download`와 `/애쥐ㅐㅁㅇ` 모두 동일하게 동작
- 내부 로직은 공통 핸들러 사용

**문서화:**
- README.md에 한글 명령어 사용법 추가
- `/help` 명령어 출력에 한글 명령어 표시

### 우선순위 4: 인터랙티브 버튼 UI (응답마다 표시)

#### FR-4.1: 응답 메시지에 인터랙티브 버튼 블록 추가
**설명:** 봇이 메시지를 전송할 때마다 자동으로 9개의 인터랙티브 버튼을 함께 표시하여, 사용자가 타이핑 없이 즉시 다음 액션을 수행할 수 있도록 해야 한다.

**버튼 구성 (9개):**
```
첫 번째 행:
[📊 상태 확인] [📥 파일 다운로드] [❌ 취소]

두 번째 행:
[⏎ 엔터] [⏎⏎ 엔터*2] [↑] [↓] [←] [→]
```

**버튼 목록:**
1. **📊 상태 확인** - `/state` 명령어 즉시 실행
2. **📥 파일 다운로드** - 모달 입력 폼 표시 (파일 경로 입력)
3. **⏎ 엔터** - tmux에 Enter 키 전송
4. **⏎⏎ 엔터*2** - tmux에 Enter 키 2번 연속 전송
5. **↑ 위** - tmux에 Up 화살표 키 전송
6. **↓ 아래** - tmux에 Down 화살표 키 전송
7. **← 좌** - tmux에 Left 화살표 키 전송
8. **→ 우** - tmux에 Right 화살표 키 전송
9. **❌ 취소** - 현재 실행 중인 작업 취소 (`/cancel`)

**표시 위치:**
- 모든 봇 응답 메시지 하단에 자동 추가
- 진행 상황 업데이트 메시지
- 작업 완료 메시지
- 에러 메시지

**Slack Block Kit 구조:**
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "[봇 응답 메시지]"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "📊 상태 확인" },
          "action_id": "quick_state"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "📥 파일 다운로드" },
          "action_id": "quick_download"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "❌ 취소" },
          "action_id": "cancel_job",
          "style": "danger"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "⏎ 엔터" },
          "action_id": "send_enter"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "⏎⏎ 엔터*2" },
          "action_id": "send_enter_twice"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "↑" },
          "action_id": "send_up"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "↓" },
          "action_id": "send_down"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "←" },
          "action_id": "send_left"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "→" },
          "action_id": "send_right"
        }
      ]
    }
  ]
}
```

#### FR-4.2: 버튼 동작 구현
**설명:** 각 버튼 클릭 시 적절한 동작을 수행해야 한다.

**명령어 실행 버튼:**

1. **📊 상태 확인** 버튼
   - 즉시 `/state` 명령어 실행
   - 채널 설정 확인 후 상태 정보 표시
   - 버튼 클릭 응답: "✅ 상태 확인 중..."

2. **📥 파일 다운로드** 버튼
   - 모달 입력 폼 표시
   - 필드: 파일 경로 (텍스트 입력)
   - Placeholder: "예: logs/app.log"
   - Submit 시 `/download <filepath>` 실행

3. **❌ 취소** 버튼
   - 현재 실행 중인 작업 취소
   - `/cancel` 명령어와 동일한 동작
   - 확인 메시지: "⚠️ 정말 작업을 취소하시겠습니까?" (확인/취소 버튼)

**특수 키 전송 버튼:**

4. **⏎ 엔터** 버튼
   - tmux send-keys 명령어로 Enter 키 전송
   - 대화형 프롬프트에 기본값으로 응답
   - 버튼 클릭 응답: "✅ Enter 전송"

5. **⏎⏎ 엔터*2** 버튼
   - tmux send-keys 명령어로 Enter 키 2번 연속 전송
   - 연속 줄바꿈이 필요한 경우 사용
   - 버튼 클릭 응답: "✅ Enter*2 전송"

6. **↑ 위** 버튼
   - tmux send-keys 명령어로 Up 화살표 키 전송
   - CLI 메뉴에서 위로 이동
   - 버튼 클릭 응답: "✅ ↑ 전송"

7. **↓ 아래** 버튼
   - tmux send-keys 명령어로 Down 화살표 키 전송
   - CLI 메뉴에서 아래로 이동
   - 버튼 클릭 응답: "✅ ↓ 전송"

8. **← 좌** 버튼
   - tmux send-keys 명령어로 Left 화살표 키 전송
   - 커서를 왼쪽으로 이동
   - 버튼 클릭 응답: "✅ ← 전송"

9. **→ 우** 버튼
   - tmux send-keys 명령어로 Right 화살표 키 전송
   - 커서를 오른쪽으로 이동
   - 버튼 클릭 응답: "✅ → 전송"

**공통 에러 처리:**
- 채널 미설정 시: "⚠️ 먼저 `/setup` 명령으로 프로젝트를 설정해주세요."
- tmux 세션 없음 시: "⚠️ 활성화된 tmux 세션이 없습니다."
- 버튼 클릭 실패 시: "❌ 버튼 처리 중 오류가 발생했습니다."

#### FR-4.3: 특수 키 전송 로직 구현
**설명:** tmux send-keys 명령어를 사용하여 특수 키(엔터, 화살표)를 원격 tmux 세션으로 전송해야 한다.

**tmux send-keys 명령어:**
```bash
# Enter 키 전송
tmux send-keys -t <session-name> Enter

# Enter 키 2번 전송
tmux send-keys -t <session-name> Enter Enter

# 화살표 키 전송
tmux send-keys -t <session-name> Up
tmux send-keys -t <session-name> Down
tmux send-keys -t <session-name> Left
tmux send-keys -t <session-name> Right
```

**구현 위치:** `src/tmux/executor.ts`

**새로운 메서드 추가:**
```typescript
/**
 * tmux 세션에 특수 키를 전송합니다.
 * @param sessionName tmux 세션 이름
 * @param key 전송할 키 (Enter, Up, Down, Left, Right)
 */
async sendKey(
  sessionName: string,
  key: 'Enter' | 'Up' | 'Down' | 'Left' | 'Right'
): Promise<void> {
  const command = `tmux send-keys -t ${sessionName} ${key}`;
  await this.executeCommand(command);
  getLogger().info(`Sent key to tmux session: ${sessionName} - ${key}`);
}

/**
 * tmux 세션에 Enter 키를 연속으로 전송합니다.
 * @param sessionName tmux 세션 이름
 * @param count Enter 키 전송 횟수 (기본값: 2)
 */
async sendEnterMultiple(
  sessionName: string,
  count: number = 2
): Promise<void> {
  const keys = Array(count).fill('Enter').join(' ');
  const command = `tmux send-keys -t ${sessionName} ${keys}`;
  await this.executeCommand(command);
  getLogger().info(`Sent ${count} Enter keys to tmux session: ${sessionName}`);
}
```

**버튼 핸들러에서 호출:**
```typescript
// src/index.ts 또는 src/bot/interactive-buttons.ts
app.action('send_enter', async ({ ack, body }) => {
  await ack();
  const channelId = body.channel.id;
  const channelConfig = configStore.getChannel(channelId);

  if (!channelConfig) {
    await app.client.chat.postMessage({
      channel: channelId,
      text: '⚠️ 먼저 `/setup` 명령으로 프로젝트를 설정해주세요.',
    });
    return;
  }

  await tmuxExecutor.sendKey(channelConfig.tmuxSession, 'Enter');
  await app.client.chat.postMessage({
    channel: channelId,
    text: '✅ Enter 전송',
  });
});

app.action('send_enter_twice', async ({ ack, body }) => {
  await ack();
  const channelId = body.channel.id;
  const channelConfig = configStore.getChannel(channelId);

  if (!channelConfig) {
    await app.client.chat.postMessage({
      channel: channelId,
      text: '⚠️ 먼저 `/setup` 명령으로 프로젝트를 설정해주세요.',
    });
    return;
  }

  await tmuxExecutor.sendEnterMultiple(channelConfig.tmuxSession, 2);
  await app.client.chat.postMessage({
    channel: channelId,
    text: '✅ Enter*2 전송',
  });
});
```

#### FR-4.4: 버튼 블록 자동 추가 유틸리티
**설명:** 모든 봇 응답 메시지에 인터랙티브 버튼 블록을 자동으로 추가하는 유틸리티 함수를 구현해야 한다.

**구현 위치:** `src/bot/formatters.ts`

**새로운 함수:**
```typescript
/**
 * 메시지에 인터랙티브 버튼 블록을 추가합니다.
 * @param text 메시지 텍스트
 * @returns Slack Block Kit 형식의 blocks 배열
 */
export function addInteractiveButtons(text: string): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📊 상태 확인' },
          action_id: 'quick_state',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '📥 파일 다운로드' },
          action_id: 'quick_download',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ 취소' },
          action_id: 'cancel_job',
          style: 'danger',
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '⏎ 엔터' },
          action_id: 'send_enter',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '⏎⏎ 엔터*2' },
          action_id: 'send_enter_twice',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '↑' },
          action_id: 'send_up',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '↓' },
          action_id: 'send_down',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '←' },
          action_id: 'send_left',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '→' },
          action_id: 'send_right',
        },
      ],
    },
  ];
}
```

**사용 예시:**
```typescript
// 기존: 텍스트만 전송
await app.client.chat.postMessage({
  channel: channelId,
  text: '✅ 작업 완료',
});

// 변경: 버튼과 함께 전송
await app.client.chat.postMessage({
  channel: channelId,
  blocks: addInteractiveButtons('✅ 작업 완료'),
});
```

### 우선순위 5: 화면 출력 개선

#### FR-5.1: 기본 출력 라인 수 설정
**설명:** tmux pane 화면 캡처 시 기본 출력 라인을 50라인으로 설정해야 한다.

**설정값:**
- 기본: 50 라인
- 적용 명령어: `/state`, `/ask`, `/run` 진행 상황 업데이트

**구현:**
- `tmux/executor.ts`의 `capturePaneOutput()` 함수에서 `-p -S -50` 옵션 사용
- 환경 변수로 커스터마이징 가능하게 구현: `DEFAULT_OUTPUT_LINES=50`

#### FR-5.2: 출력 라인 수 사용자 설정 (선택사항)
**설명:** 사용자가 선호하는 출력 라인 수를 설정할 수 있도록 한다.

**설정 방법:**
- `/state --lines 100` 형태로 명령어 옵션 제공
- 설정 파일에 기본값 저장: `~/.remote-claude/config.json`

**설정 범위:**
- 최소: 10 라인
- 최대: 200 라인
- 기본: 50 라인

## 5. 비기능 요구사항 (Non-Goals / Out of Scope)

### Phase 1에서 제외되는 기능:

1. **모든 명령어의 한글 매핑**
   - `/help`, `/setup`, `/unsetup` 등의 한글 매핑은 Phase 2에서 구현
   - Phase 1에서는 자주 사용하는 `/state`, `/download`만 지원

2. **모바일 전용 UI**
   - 모바일 네이티브 앱은 개발하지 않음
   - Slack 앱의 기능만 활용

3. **출력 내용 필터링**
   - 출력 내용에서 민감한 정보를 자동으로 감지하고 마스킹하는 기능은 Phase 2에서 구현

4. **대화형 프롬프트 자동 응답**
   - y/n 프롬프트에 자동으로 응답하는 기능은 제외
   - 사용자가 수동으로 응답해야 함

5. **출력 형식 변환**
   - HTML, PDF 등 다른 형식으로 출력을 변환하는 기능은 제외
   - Slack 메시지 형식만 지원

6. **명령어 히스토리 및 자동완성**
   - 이전에 실행한 명령어 히스토리 조회 및 자동완성 기능은 Phase 2에서 구현

## 6. 설계 고려사항 (Design Considerations)

### 6.1 인터랙티브 버튼 UI 디자인

**Block Kit Components:**
- `section`: 메시지 텍스트
- `actions`: 버튼 그룹 (2개 행)
- `button`: 9개 버튼 (명령어 3개 + 특수 키 6개)

**버튼 레이아웃:**
```
첫 번째 행 (명령어 버튼):
[📊 상태 확인] [📥 파일 다운로드] [❌ 취소]

두 번째 행 (특수 키 버튼):
[⏎ 엔터] [⏎⏎ 엔터*2] [↑] [↓] [←] [→]
```

**색상 및 스타일:**
- Default 버튼: 상태 확인, 파일 다운로드, 특수 키 버튼
- Danger 버튼: 취소 버튼 (빨간색)

**아이콘 사용:**
- 각 버튼에 직관적인 이모지 아이콘 사용
- 특수 키 버튼은 화살표 유니코드 문자 사용 (↑↓←→)
- 엔터 버튼은 ⏎ 기호 사용

**모바일 최적화:**
- 버튼 크기: Slack 기본 크기 (터치 친화적)
- 두 행 레이아웃으로 화면 공간 효율적 사용
- 특수 키 버튼은 간결한 1-2자 텍스트로 표시

### 6.2 메시지 포맷팅

**코드 블록 표시:**
```
```
[출력 내용]
```
```

**분할 메시지 표시:**
```
[1/3] 📄 출력 결과
```
[내용 1]
```

[2/3]
```
[내용 2]
```
```

**진행 상황 표시:**
```
🔄 작업 진행 중... (경과: 1분 30초)

[최근 50라인 출력]
```

### 6.3 한글 명령어 매핑 알고리즘

**한글 → 영어 자판 변환 테이블:**
```typescript
const KOREAN_TO_ENGLISH_MAP: Record<string, string> = {
  'ㄱ': 'r', 'ㄴ': 's', 'ㄷ': 'e', 'ㄹ': 'f', 'ㅁ': 'a', 'ㅂ': 'q',
  'ㅅ': 't', 'ㅇ': 'd', 'ㅈ': 'w', 'ㅊ': 'c', 'ㅋ': 'z', 'ㅌ': 'x',
  'ㅍ': 'v', 'ㅎ': 'g',
  'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'O', 'ㅓ': 'j', 'ㅔ': 'p',
  'ㅕ': 'u', 'ㅖ': 'P', 'ㅗ': 'h', 'ㅛ': 'y', 'ㅜ': 'n', 'ㅠ': 'b',
  'ㅡ': 'm', 'ㅣ': 'l',
  // ... (전체 매핑 테이블)
};

function convertKoreanToEnglish(koreanInput: string): string {
  // 한글 문자를 자모로 분해
  // 각 자모를 영어 자판으로 매핑
  // 영어 문자열 반환
}
```

**명령어 매핑 테이블:**
```typescript
const KOREAN_COMMAND_MAP: Record<string, string> = {
  '/ㄴㅅㅁ션': '/state',    // /status → /state
  '/애쥐ㅐㅁㅇ': '/download', // /download
};
```

## 7. 기술 고려사항 (Technical Considerations)

### 7.1 아키텍처

**새로운 모듈:**
- `src/bot/interactive-buttons.ts`: 인터랙티브 버튼 핸들러
- `src/utils/korean-mapper.ts`: 한글 명령어 매핑 유틸리티
- `src/utils/message-splitter.ts`: 메시지 분할 유틸리티
- `src/queue/progress-tracker.ts`: 작업 진행 상황 추적

**수정할 파일:**
- `src/index.ts`: 한글 명령어 리스너 추가, 버튼 액션 리스너 추가
- `src/queue/orchestrator.ts`: 실시간 출력 업데이트 로직 추가
- `src/tmux/executor.ts`: 기본 출력 라인 수 50으로 변경, 특수 키 전송 메서드 추가
- `src/bot/formatters.ts`: 메시지 분할, 백틱 변환, 버튼 블록 자동 추가 로직

### 7.2 Slack API 요구사항

**필요한 권한 (Bot Token Scopes):**
- 기존 권한 유지 (변경 없음)
- 추가 권한 없음

**Slack App 설정:**
- Interactivity 활성화 (인터랙티브 버튼 및 모달용)
- Request URL 설정 (Socket Mode에서는 불필요)

**이벤트 구독:**
- `block_actions`: 버튼 클릭 시 (9가지 버튼 액션)
- `view_submission`: 모달 제출 시 (파일 다운로드 입력 폼)

### 7.3 성능 고려사항

**폴링 최적화:**
- 5초 주기 폴링 시 불필요한 업데이트 방지를 위한 해시 비교
- 출력이 변경되지 않았을 경우 메시지 전송 생략

**메시지 분할 최적화:**
- 3500자 기준으로 분할하되, 줄바꿈(\n) 기준으로 자연스럽게 분할
- 메모리 효율성을 위해 스트리밍 방식으로 분할 처리

**Slack API Rate Limit 관리:**
- Tier 3: 분당 50+회 (메시지 전송)
- 500ms 간격으로 메시지 전송하여 여유 확보
- 초당 최대 2개 메시지로 제한

### 7.4 에러 처리

**네트워크 에러:**
- Slack API 호출 실패 시 3회 재시도 (지수 백오프)
- 최종 실패 시 사용자에게 알림

**tmux 에러:**
- tmux 세션 응답 없음 시 재시도
- 30분 타임아웃 후 작업 취소

**한글 명령어 매핑 에러:**
- 매핑되지 않은 한글 명령어 입력 시 도움말 메시지 표시

### 7.5 하위 호환성

**기존 기능 유지:**
- 모든 기존 영어 명령어는 동일하게 동작
- 기존 사용자는 아무런 변경 없이 사용 가능

**설정 마이그레이션:**
- 기존 설정 파일 형식 유지
- 새로운 설정 추가 시 기본값 제공

## 8. 테스트 요구사항 (Testing Requirements)

### 8.1 유닛 테스트

**테스트 프레임워크:** Jest

**테스트 대상 모듈:**

#### 8.1.1 `src/utils/korean-mapper.ts`
**테스트 케이스 (최소 3가지):**

1. **Happy Path:**
   - `/ㄴㅅㅁ션` 입력 시 `/state` 반환
   - `/애쥐ㅐㅁㅇ` 입력 시 `/download` 반환

2. **Boundary Conditions:**
   - 빈 문자열 입력 시 빈 문자열 반환
   - 슬래시(/) 없이 한글만 입력 시 원본 반환
   - 매핑되지 않은 한글 명령어 입력 시 `null` 반환

3. **Exception Cases:**
   - 특수문자 포함된 입력 처리
   - 대소문자 혼합 입력 처리
   - 영어+한글 혼합 입력 처리

4. **Side Effects:**
   - 매핑 테이블이 변경되지 않음
   - 여러 번 호출해도 동일한 결과 반환

#### 8.1.2 `src/utils/message-splitter.ts`
**테스트 케이스 (최소 3가지):**

1. **Happy Path:**
   - 3500자 이하 메시지는 분할하지 않음
   - 3500자 초과 메시지는 정확히 분할됨
   - 분할 시 `[1/3]`, `[2/3]` 형태로 표시됨

2. **Boundary Conditions:**
   - 정확히 3500자 메시지 처리
   - 3501자 메시지 처리 (2개로 분할)
   - 빈 문자열 입력 시 빈 배열 반환

3. **Exception Cases:**
   - 백틱 3개(```) 포함된 메시지에서 백틱을 '''로 변환
   - 여러 개의 백틱 3개 패턴이 있을 경우 모두 변환
   - 줄바꿈이 없는 긴 메시지 처리

4. **Side Effects:**
   - 원본 메시지가 변경되지 않음
   - 분할된 메시지를 합치면 원본과 동일 (백틱 변환 제외)

#### 8.1.3 `src/queue/progress-tracker.ts`
**테스트 케이스 (최소 3가지):**

1. **Happy Path:**
   - 작업 시작 시 상태가 `in_progress`로 설정됨
   - 5초마다 폴링하여 출력 변경 감지
   - 작업 완료 시 상태가 `completed`로 변경됨

2. **Boundary Conditions:**
   - 출력이 변경되지 않았을 때 메시지 전송하지 않음
   - 최초 출력은 항상 전송됨
   - 30분 타임아웃 시 작업 취소

3. **Exception Cases:**
   - tmux 세션 응답 없음 시 재시도
   - Slack API 에러 시 재시도
   - 작업 취소 시 폴링 중단

4. **Side Effects:**
   - 폴링 종료 후 타이머가 정리됨
   - 여러 작업 동시 진행 시 독립적으로 추적

#### 8.1.4 `src/bot/interactive-buttons.ts`
**테스트 케이스 (최소 3가지):**

1. **Happy Path:**
   - "📊 상태 확인" 버튼 클릭 시 `/state` 명령어 실행
   - "⏎ 엔터" 버튼 클릭 시 Enter 키 전송
   - "⏎⏎ 엔터*2" 버튼 클릭 시 Enter 키 2번 전송
   - "↑" 버튼 클릭 시 Up 화살표 키 전송

2. **Boundary Conditions:**
   - 채널 미설정 상태에서 버튼 클릭 시 설정 안내
   - tmux 세션이 없을 때 특수 키 버튼 클릭 시 에러 메시지
   - "📥 파일 다운로드" 버튼 클릭 시 모달 입력 폼 표시

3. **Exception Cases:**
   - tmux send-keys 실패 시 사용자에게 알림
   - Slack API 에러 시 재시도 및 최종 에러 메시지
   - 잘못된 action_id 처리

4. **Side Effects:**
   - 버튼 클릭 후 즉시 ack() 응답
   - 동일 버튼 여러 번 클릭 시 독립적으로 처리
   - 버튼 클릭이 다른 채널의 세션에 영향 주지 않음

#### 8.1.5 `src/tmux/executor.ts` (특수 키 전송 메서드)
**테스트 케이스 (최소 3가지):**

1. **Happy Path:**
   - `sendKey('session-name', 'Enter')` 호출 시 정상 전송
   - `sendEnterMultiple('session-name', 2)` 호출 시 Enter 2번 전송
   - 모든 화살표 키(Up, Down, Left, Right) 정상 전송

2. **Boundary Conditions:**
   - 존재하지 않는 세션에 키 전송 시 에러
   - count=0일 때 sendEnterMultiple 처리
   - 잘못된 키 이름 입력 시 에러

3. **Exception Cases:**
   - tmux 명령어 실행 실패 시 에러 throw
   - 네트워크 문제로 tmux 응답 없음 시 타임아웃

4. **Side Effects:**
   - 키 전송 로그 기록 확인
   - 여러 세션에 독립적으로 키 전송 가능

### 8.2 통합 테스트

**테스트 시나리오:**

#### 시나리오 1: 한글 명령어로 상태 확인
1. Slack에서 `/ㄴㅅㅁ션` 입력
2. 시스템이 `/state`로 매핑
3. 상태 정보 정상 출력 (50라인)

**검증:**
- 명령어 매핑 정상 동작
- 50라인 출력 확인

#### 시나리오 2: 대용량 출력 처리
1. `/ask "src/ 디렉토리의 모든 파일 내용 출력"` 실행
2. 출력 내용이 3500자 초과
3. 자동으로 3개 메시지로 분할
4. 각 메시지가 500ms 간격으로 전송
5. 모든 메시지가 코드 블록으로 정상 표시

**검증:**
- 메시지 분할 정상 동작
- 백틱 변환 정상 동작
- 순서 보장 확인

#### 시나리오 3: 실시간 진행 상황 업데이트
1. `/ask "복잡한 리팩토링 작업"` 실행
2. 초기 메시지: "⏳ 작업을 시작합니다..."
3. 5초마다 진행 상황 업데이트 (변경 시마다)
4. Claude Code가 파일 수정 시 화면 출력 변경
5. 최종 메시지: "✅ 작업 완료"

**검증:**
- 폴링 정상 동작
- 출력 변경 감지 정상
- 중복 메시지 없음

### 8.3 시스템 테스트

**환경:** 실제 Slack 채널

#### 시스템 테스트 1: 인터랙티브 버튼으로 특수 키 전송 및 대화형 프롬프트 응답
1. `/ask "Create a new component with interactive prompts"` 실행
2. 봇이 진행 상황을 보고하며 9개 버튼 표시
3. Claude Code가 "Do you want to proceed? [y/n]" 질문 표시
4. "⏎ 엔터" 버튼 클릭하여 기본값(y) 선택
5. 작업이 계속 진행됨
6. Claude Code가 파일 선택 메뉴 표시
7. "↓" 버튼 2번 클릭하여 메뉴 네비게이션
8. "⏎ 엔터" 버튼 클릭하여 선택 확인
9. 작업 완료 메시지 및 버튼 표시

**검증:**
- 모든 응답 메시지에 9개 버튼 정상 표시
- Enter 키 전송 정상 동작
- 화살표 키 전송 정상 동작
- 대화형 프롬프트 응답 성공
- tmux 세션에서 키 입력 확인

#### 시스템 테스트 2: 인터랙티브 버튼으로 파일 다운로드 및 상태 확인
1. `/ask "복잡한 리팩토링 작업"` 실행
2. 봇이 진행 상황을 보고하며 버튼 표시
3. "📊 상태 확인" 버튼 클릭
4. 상태 정보 출력 (50라인) 및 버튼 표시
5. "📥 파일 다운로드" 버튼 클릭
6. 모달 입력 폼에 `logs/app.log` 입력
7. Submit 버튼 클릭
8. 파일 다운로드 완료 메시지 및 버튼 표시

**검증:**
- "📊 상태 확인" 버튼 즉시 실행
- "📥 파일 다운로드" 버튼 → 모달 표시
- 모달 제출 → 파일 다운로드 성공
- 모든 단계에서 9개 버튼 표시

#### 시스템 테스트 3: 한글 명령어 + 엔터*2 버튼 조합
1. 한글 키보드 상태에서 `/애쥐ㅐㅁㅇ logs/app.log` 입력
2. 명령어가 `/download logs/app.log`로 매핑됨
3. 파일 다운로드 완료 메시지 및 버튼 표시
4. `/ㄴㅅㅁ션` 입력하여 상태 확인
5. 상태 정보 출력 및 버튼 표시
6. Claude Code에서 연속 줄바꿈 필요한 프롬프트 표시
7. "⏎⏎ 엔터*2" 버튼 클릭
8. 연속 Enter 입력으로 프롬프트 종료

**검증:**
- 한글 명령어 정상 매핑
- 엔터*2 버튼으로 연속 Enter 전송 성공
- 모든 응답에 버튼 표시

## 9. 성공 지표 (Success Metrics)

### 9.1 기능 동작 검증

1. **한글 명령어 성공률:** 100% (모든 한글 명령어 입력이 정상 매핑)
2. **메시지 분할 성공률:** 100% (3500자 초과 시 100% 분할 전송)
3. **백틱 변환 성공률:** 100% (백틱 3개 패턴 100% 변환)
4. **인터랙티브 버튼 동작률:** 100% (9개 버튼 모두 정상 동작)
5. **특수 키 전송 성공률:** 100% (엔터, 엔터*2, 화살표 4방향 모두 정상 전송)
6. **실시간 업데이트 정확도:** 95% 이상 (5초 주기로 95% 이상 업데이트)
7. **버튼 자동 표시율:** 100% (모든 봇 응답에 버튼 블록 표시)

### 9.2 출력 안정성

1. **대용량 출력 에러율:** 0% (백틱 깨짐 0건, 메시지 전송 실패 0건)
2. **메시지 순서 보장:** 100% (분할된 메시지가 항상 순서대로 표시)

### 9.3 사용성 개선 (정량적)

1. **모바일 명령어 입력 시간 감소:** 50% (버튼 클릭으로 5초 → 2.5초)
2. **한글 사용자 언어 전환 횟수 감소:** 100% (명령어당 0회)

### 9.4 사용자 만족도 (정성적)

1. **사용자 피드백:** "작업 진행 상황을 실시간으로 확인할 수 있어 편리하다"
2. **사용자 피드백:** "스마트폰에서 버튼으로 특수 키를 입력할 수 있어 편리하다"
3. **사용자 피드백:** "한글 상태에서 명령어를 입력할 수 있어 편리하다"
4. **사용자 피드백:** "대화형 프롬프트에 버튼으로 즉시 응답할 수 있어 편리하다"

## 10. 미해결 질문 (Open Questions)

1. **한글 명령어 확장 범위**
   - Phase 2에서 모든 명령어에 한글 매핑을 추가할지?
   - 사용자 정의 한글 명령어를 지원할지?

2. **출력 필터링**
   - Phase 2에서 민감한 정보 자동 마스킹 기능을 추가할지?
   - 어떤 패턴을 민감한 정보로 간주할지? (API 키, 비밀번호 등)

3. **인터랙티브 버튼 확장**
   - 추가 특수 키 버튼이 필요한가? (Tab, Backspace, Ctrl+C 등)
   - 버튼 레이아웃을 사용자가 커스터마이징할 수 있게 할지?
   - 버튼 표시 여부를 설정으로 제어할 수 있게 할지?

4. **성능 모니터링**
   - 실시간 업데이트 및 버튼 표시로 인한 Slack API 사용량 증가를 어떻게 모니터링할지?
   - API Rate Limit에 도달할 경우 대응 방안은?
   - 버튼 클릭 시 응답 시간 목표는? (현재: 즉시 ack, 1초 이내 처리)

5. **다국어 지원**
   - 한글 외에 다른 언어(일본어, 중국어 등)도 지원할지?
   - 명령어 출력 메시지를 다국어로 제공할지?
   - 버튼 텍스트를 다국어로 제공할지?

---

**문서 버전:** 1.1
**작성일:** 2025-11-07
**최종 수정일:** 2025-11-07
**다음 단계:** Task List 생성 및 구현 시작

## 변경 이력

### v1.1 (2025-11-07)
- **주요 변경:** 우선순위 4 기능을 App Home에서 인터랙티브 버튼으로 변경
- **추가된 버튼:** 9개 (상태 확인, 파일 다운로드, 엔터, 엔터*2, 화살표 4방향, 취소)
- **주요 개선:**
  - 모든 봇 응답에 인터랙티브 버튼 자동 표시
  - 특수 키 전송 기능 추가 (엔터, 엔터*2, 화살표)
  - 대화형 프롬프트 즉시 응답 가능
  - 모바일에서 화살표 키 입력 문제 해결
- **변경된 섹션:**
  - US-4: App Home → 인터랙티브 버튼
  - FR-4.1~4.4: App Home 구현 → 버튼 블록 추가 및 특수 키 전송
  - 6.1: UI 디자인 변경
  - 7.1~7.2: 아키텍처 및 Slack API 요구사항 변경
  - 8.1.4~8.1.5: 테스트 케이스 변경 (app-home.ts → interactive-buttons.ts)
  - 8.3: 시스템 테스트 3개 시나리오 재작성
  - 9.1: 성공 지표에 특수 키 전송 및 버튼 표시 항목 추가
  - 10: 미해결 질문에 인터랙티브 버튼 확장 항목 추가

### v1.0 (2025-11-07)
- 초기 PRD 작성
- 5가지 UX 개선사항 정의
- 우선순위 설정 및 기능 요구사항 작성
