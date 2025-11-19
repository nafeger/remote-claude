# Testing Guide: Claude Code 시작 검증 로직

## 📋 개요

이번 업데이트에서 추가된 **Claude Code 시작 검증 및 폴백 로직**에 대한 테스트 가이드입니다.

### 추가된 기능
- `startClaudeCode()` 함수의 출력 검증 로직
- "claude --continue" 실패 감지 및 "claude" 명령으로 자동 폴백
- "No conversation found to continue" 메시지 감지

### 테스트 목적
- Claude Code가 정상적으로 시작되는지 확인
- 실패 시 적절한 폴백이 동작하는지 검증
- 오류 메시지를 정확하게 감지하는지 확인

---

## 🧪 테스트 범위

### 1. 단위 테스트 (Unit Tests)
- `TmuxManager.startClaudeCode()` 메서드
- 출력 검증 로직
- 폴백 메커니즘

### 2. 통합 테스트 (Integration Tests)
- Slack 메시지 → 작업 처리 → Claude Code 시작 전체 흐름
- tmux 세션 생성 및 관리
- 실제 Claude Code CLI와의 상호작용

### 3. 수동 테스트 (Manual Tests)
- 실제 사용 환경에서의 동작 확인
- 에지 케이스 검증

---

## 🔬 단위 테스트

### 테스트 파일 위치
`tests/unit/tmux/manager.test.ts`

### 테스트 케이스

#### TC1: "claude --continue" 성공 시나리오
**목적**: 기존 세션이 있을 때 정상 동작 확인

**Mock 설정**:
```typescript
capturePane.mockResolvedValueOnce({
  success: true,
  output: 'Claude Code is running\nWhat would you like me to help you with?',
});
```

**검증 항목**:
- `success: true` 반환
- "claude --continue" 명령만 실행 (폴백 없음)
- 로그: `'Claude Code started with "claude --continue"'`

#### TC2: "No conversation found" 감지 및 폴백
**목적**: 세션이 없을 때 자동 폴백 동작 확인

**Mock 설정**:
```typescript
// 첫 번째 캡처: --continue 실패
capturePane.mockResolvedValueOnce({
  success: true,
  output: 'No conversation found to continue',
});

// 두 번째 캡처: claude 성공
capturePane.mockResolvedValueOnce({
  success: true,
  output: 'Welcome to Claude Code\nclaudev1.anthropic.com',
});
```

**검증 항목**:
- `success: true` 반환
- "claude --continue" 실패 감지
- "claude" 명령 실행
- 로그: `'"claude --continue" failed, trying "claude"...'`
- 로그: `'Claude Code started with "claude" command'`

#### TC3: 양쪽 모두 실패
**목적**: Claude Code CLI 문제 시 적절한 에러 반환

**Mock 설정**:
```typescript
// 첫 번째 캡처: --continue 실패
capturePane.mockResolvedValueOnce({
  success: true,
  output: 'No conversation found to continue',
});

// 두 번째 캡처: claude도 실패
capturePane.mockResolvedValueOnce({
  success: true,
  output: 'command not found: claude',
});
```

**검증 항목**:
- `success: false` 반환
- `error` 메시지 포함
- 로그: `'Failed to start Claude Code with both "claude --continue" and "claude"'`

#### TC4: 이미 실행 중인 Claude Code
**목적**: 기존 Claude Code가 실행 중일 때 성공 처리

**Mock 설정**:
```typescript
capturePane.mockResolvedValueOnce({
  success: true,
  output: '어떤 작업을 도와드릴까요?\n예시:\n- 코드 분석 또는 개선',
});
```

**검증 항목**:
- `success: true` 반환 ("No conversation found" 메시지가 없으므로)
- "claude" 명령 실행하지 않음

---

## 🔗 통합 테스트

### 테스트 환경 준비

```bash
# 1. 테스트용 tmux 세션 생성
tmux new-session -d -s test-claude-session -c /tmp/test-project

# 2. 환경 변수 설정
export NODE_ENV=test
export LOG_LEVEL=debug
```

### 시나리오 1: 재시작 후 첫 명령 (핵심 버그 재현)

**절차**:
1. tmux 세션에서 Claude Code 종료
   ```bash
   tmux send-keys -t test-claude-session C-c
   ```

2. remote-claude 재시작
   ```bash
   npm run dev
   ```

3. Slack에서 메시지 전송
   ```
   현재 상태 확인
   ```

4. 로그 확인
   ```bash
   tail -f ~/.remote-claude/logs/combined.log | grep -A 5 "Starting Claude Code"
   ```

**기대 결과**:
```
[info]: Starting Claude Code in tmux session: test-claude-session
[info]: Trying "claude --continue"...
[debug]: tmux command output: No conversation found to continue
[info]: "claude --continue" failed, trying "claude"...
[info]: Claude Code started with "claude" command
[info]: Sending prompt to Claude Code...
[info]: Prompt sent successfully
```

**검증**:
- [ ] "No conversation found" 메시지 정확히 감지
- [ ] "claude" 명령으로 자동 폴백
- [ ] 7초 대기 후 Claude Code 정상 시작
- [ ] 프롬프트 정상 전송
- [ ] Slack에서 Claude Code 응답 수신

### 시나리오 2: 이미 실행 중일 때

**절차**:
1. Claude Code가 실행 중인 상태 확인
   ```bash
   tmux capture-pane -t test-claude-session -p | tail -20
   ```

2. Slack에서 연속으로 메시지 전송
   ```
   package.json 파일 읽어줘
   ```

**기대 결과**:
```
[info]: Starting Claude Code in tmux session: test-claude-session
[info]: Trying "claude --continue"...
[debug]: tmux command output: 어떤 작업을 도와드릴까요?
[info]: Claude Code started with "claude --continue"
[info]: Sending prompt to Claude Code...
```

**검증**:
- [ ] 기존 Claude Code 세션 유지
- [ ] "claude" 명령 실행하지 않음
- [ ] 2초 대기 후 바로 프롬프트 전송

### 시나리오 3: Claude CLI 미설치 상황

**절차**:
1. PATH에서 claude 제거 (임시)
   ```bash
   export PATH=$(echo $PATH | sed 's|:/usr/local/bin||')
   ```

2. Slack에서 메시지 전송

**기대 결과**:
```
[error]: Failed to start Claude Code with both "claude --continue" and "claude"
```

**검증**:
- [ ] 적절한 에러 메시지 반환
- [ ] Slack에 사용자 친화적 에러 메시지 표시
- [ ] 시스템이 중단되지 않음

---

## 🖐️ 수동 테스트 체크리스트

### 테스트 준비
- [ ] remote-claude 최신 코드로 재시작
- [ ] 로그 파일 백업 및 초기화
- [ ] tmux 세션 상태 확인

### 기본 기능
- [ ] `/setup` 명령으로 새 채널 설정
- [ ] 일반 텍스트 메시지 전송 (한글)
- [ ] 일반 텍스트 메시지 전송 (영문)
- [ ] DSL 명령 전송 (`Down Down Enter`)
- [ ] 긴 프롬프트 전송 (500자 이상)

### 에지 케이스
- [ ] remote-claude 재시작 직후 메시지 전송
- [ ] Claude Code 응답 중에 추가 메시지 전송
- [ ] 네트워크 지연 상황에서 메시지 전송
- [ ] 특수 문자가 포함된 메시지 전송
- [ ] 여러 줄로 구성된 프롬프트 전송

### 오류 복구
- [ ] Claude Code 강제 종료 후 메시지 전송
- [ ] tmux 세션 삭제 후 메시지 전송
- [ ] 잘못된 프로젝트 경로 설정 시 동작

### 성능
- [ ] 첫 메시지 전송 시간 측정 (< 10초)
- [ ] 연속 메시지 전송 시간 측정 (< 3초)
- [ ] 메모리 사용량 확인
- [ ] CPU 사용량 확인

---

## 📊 회귀 테스트 (Regression Tests)

### 기존 기능 검증

#### 1. 기본 메시지 처리
```bash
# Slack에서 전송
안녕하세요
```
**검증**: Claude Code에서 정상 응답

#### 2. DSL 명령 처리
```bash
# Slack에서 전송
Down Down Enter
```
**검증**: 방향키 및 Enter 키 정상 전송

#### 3. 스니펫 기능
```bash
# Slack에서 전송
/snippet list
```
**검증**: 스니펫 목록 정상 표시

#### 4. 상태 조회
```bash
# Slack에서 전송
/status
```
**검증**: 세션 상태 정상 표시

---

## 🔍 디버깅 가이드

### 로그 확인

**실시간 로그 모니터링**:
```bash
tail -f ~/.remote-claude/logs/combined.log
```

**특정 함수 로그 필터링**:
```bash
grep "startClaudeCode" ~/.remote-claude/logs/combined.log | tail -50
```

**에러만 확인**:
```bash
grep "error" ~/.remote-claude/logs/combined.log | tail -20
```

### tmux 세션 디버깅

**현재 화면 출력 확인**:
```bash
tmux capture-pane -t claude-test-C09QWQGM50F -p | tail -30
```

**전체 히스토리 확인**:
```bash
tmux capture-pane -t claude-test-C09QWQGM50F -p -S -100
```

**세션 직접 접속**:
```bash
tmux attach -t claude-test-C09QWQGM50F
# 빠져나오기: Ctrl+B → D
```

### 프로세스 확인

**실행 중인 프로세스**:
```bash
ps aux | grep "ts-node src/index.ts"
```

**포트 사용 확인**:
```bash
lsof -i :3000
```

---

## 📈 성능 기준

### 응답 시간
- **첫 메시지 전송** (Claude Code 시작 포함): < 10초
- **연속 메시지 전송**: < 3초
- **"claude --continue" 감지**: < 2초
- **폴백 실행**: < 9초 (2초 + 7초)

### 리소스 사용
- **메모리**: < 200MB
- **CPU**: < 10% (유휴 시)

---

## ✅ 테스트 완료 체크리스트

### 단위 테스트
- [ ] TC1: "claude --continue" 성공
- [ ] TC2: "No conversation found" 폴백
- [ ] TC3: 양쪽 모두 실패
- [ ] TC4: 이미 실행 중

### 통합 테스트
- [ ] 시나리오 1: 재시작 후 첫 명령
- [ ] 시나리오 2: 이미 실행 중
- [ ] 시나리오 3: CLI 미설치

### 수동 테스트
- [ ] 기본 기능 (5개 항목)
- [ ] 에지 케이스 (5개 항목)
- [ ] 오류 복구 (3개 항목)
- [ ] 성능 (4개 항목)

### 회귀 테스트
- [ ] 기본 메시지 처리
- [ ] DSL 명령 처리
- [ ] 스니펫 기능
- [ ] 상태 조회

---

## 📝 테스트 결과 보고 템플릿

```markdown
## 테스트 결과

**테스트 날짜**: 2025-11-10
**테스트 환경**: macOS, Node.js v18+, tmux 3.x

### 단위 테스트
- TC1: ✅ PASS
- TC2: ✅ PASS
- TC3: ✅ PASS
- TC4: ✅ PASS

### 통합 테스트
- 시나리오 1: ✅ PASS
- 시나리오 2: ✅ PASS
- 시나리오 3: ✅ PASS

### 발견된 이슈
- 없음

### 성능 측정
- 첫 메시지: 8.5초
- 연속 메시지: 2.1초

### 결론
모든 테스트 통과. 프로덕션 배포 가능.
```
