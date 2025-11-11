# Remote Claude - Testing Guide

이번에 추가된 Claude Code 시작 검증 로직에 대한 테스트 가이드입니다.

## 📁 테스트 구조

```
tests/
├── README.md                          # 이 파일
├── TESTING_GUIDE.md                   # 상세 테스트 가이드
├── unit/                              # 단위 테스트
│   └── tmux/
│       └── manager.test.ts            # TmuxManager 테스트
└── integration/                       # 통합 테스트
    └── test-claude-start.sh           # Claude Code 시작 검증 통합 테스트
```

---

## 🚀 빠른 시작

### 1. 단위 테스트 실행

```bash
# 모든 단위 테스트 실행
npm test

# 특정 테스트 파일만 실행
npm test -- tests/unit/tmux/manager.test.ts

# watch 모드로 실행
npm run test:watch

# 커버리지 포함 실행
npm test -- --coverage
```

### 2. 통합 테스트 실행

```bash
# 통합 테스트 스크립트 실행
./tests/integration/test-claude-start.sh
```

**예상 출력**:
```
========================================
Claude Code Start Verification - Integration Tests
========================================

========================================
Test Environment Setup
========================================

✅ Test project created at /tmp/test-claude-project
✅ tmux session created: test-claude-integration

========================================
Test 1: No Conversation Found → Fallback
========================================

ℹ️  Sending: claude --continue
✅ Detected: 'No conversation found to continue'
ℹ️  Fallback: Sending 'claude'
✅ Test 1 PASSED: Fallback executed successfully

... (추가 테스트 출력)

========================================
Test Results
========================================

Total Tests: 5
Passed: 5
Failed: 0

✅ All tests passed!
```

---

## 📋 테스트 체크리스트

### 단위 테스트 (Jest)

- [ ] **TC1**: "claude --continue" 성공 시나리오
  - 기존 세션이 있을 때 정상 동작
  - 이미 실행 중인 Claude Code 인식

- [ ] **TC2**: "No conversation found" 감지 및 폴백
  - 세션이 없을 때 자동 폴백
  - 메시지 변형 감지

- [ ] **TC3**: 양쪽 모두 실패
  - Claude Code CLI 없을 때 에러 반환
  - 타임아웃 발생 시 에러 반환

- [ ] **TC4**: 에지 케이스
  - capturePane 실패 처리
  - 세션 없을 때 세션 생성
  - 빈 출력 처리

- [ ] **TC5**: 타이밍 검증
  - "claude --continue" 후 2초 대기
  - "claude" 명령 후 7초 대기

### 통합 테스트 (Bash)

- [ ] **Test 1**: No Conversation Found → Fallback
  - "No conversation found" 메시지 감지
  - "claude" 명령으로 폴백 실행

- [ ] **Test 2**: Claude Code Already Running
  - 이미 실행 중일 때 에러 메시지 없음
  - 기존 세션 유지

- [ ] **Test 3**: Timing Verification
  - 2초 대기 시간 검증
  - 7초 대기 시간 검증

- [ ] **Test 4**: Output Capture Verification
  - 여러 줄 출력 정상 캡처
  - 마지막 20줄 캡처 검증

- [ ] **Test 5**: Empty Output Handling
  - 빈 출력 정상 감지
  - 히스토리 클리어 후 처리

### 수동 테스트 (실제 환경)

- [ ] **기본 기능**
  - `/setup` 명령으로 새 채널 설정
  - 일반 텍스트 메시지 전송 (한글)
  - 일반 텍스트 메시지 전송 (영문)
  - DSL 명령 전송 (`Down Down Enter`)

- [ ] **에지 케이스**
  - remote-claude 재시작 직후 메시지 전송
  - Claude Code 응답 중에 추가 메시지 전송
  - 특수 문자 포함 메시지 전송

- [ ] **오류 복구**
  - Claude Code 강제 종료 후 메시지 전송
  - tmux 세션 삭제 후 메시지 전송

---

## 🔍 테스트 실행 결과 확인

### 단위 테스트 결과

```bash
# 테스트 실행 후 결과 확인
PASS  tests/unit/tmux/manager.test.ts
  TmuxManager.startClaudeCode()
    TC1: "claude --continue" 성공 시나리오
      ✓ 기존 세션이 있을 때 정상 동작해야 함 (2015 ms)
      ✓ 이미 실행 중인 Claude Code를 인식해야 함 (2012 ms)
    TC2: "No conversation found" 감지 및 폴백
      ✓ 세션이 없을 때 자동으로 "claude" 명령으로 폴백해야 함 (9015 ms)
      ✓ "No conversation found to continue" 메시지 변형도 감지해야 함 (9013 ms)
    TC3: 양쪽 모두 실패
      ✓ Claude Code CLI가 없을 때 에러를 반환해야 함 (9012 ms)
      ✓ 타임아웃 발생 시 에러를 반환해야 함 (9011 ms)
    TC4: 에지 케이스
      ✓ capturePane 실패 시 적절히 처리해야 함 (2010 ms)
      ✓ 세션이 없을 때 세션을 먼저 생성해야 함 (2014 ms)
      ✓ 빈 출력도 올바르게 처리해야 함 (2012 ms)
    TC5: 타이밍 검증
      ✓ "claude --continue" 후 2초 대기해야 함 (2015 ms)
      ✓ "claude" 명령 후 7초 대기해야 함 (9016 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

### 통합 테스트 결과

위의 "빠른 시작" 섹션 참조

---

## 🐛 테스트 실패 시 디버깅

### 단위 테스트 실패

```bash
# 특정 테스트만 실행
npm test -- -t "기존 세션이 있을 때"

# 디버그 모드로 실행
node --inspect-brk node_modules/.bin/jest tests/unit/tmux/manager.test.ts
```

### 통합 테스트 실패

```bash
# 로그 확인
tail -f ~/.remote-claude/logs/combined.log

# tmux 세션 직접 확인
tmux attach -t test-claude-integration

# 수동으로 명령 테스트
tmux send-keys -t test-claude-integration -l "claude --continue"
tmux send-keys -t test-claude-integration Enter
tmux capture-pane -t test-claude-integration -p -S -20
```

---

## 📊 커버리지 확인

```bash
# 커버리지 리포트 생성
npm test -- --coverage

# HTML 리포트 보기
open coverage/lcov-report/index.html
```

**목표 커버리지**:
- **Statements**: 80% 이상
- **Branches**: 75% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상

---

## 🔄 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run integration tests
        run: ./tests/integration/test-claude-start.sh

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 📚 추가 리소스

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 상세 테스트 가이드
- [Jest 문서](https://jestjs.io/docs/getting-started)
- [tmux 매뉴얼](https://man7.org/linux/man-pages/man1/tmux.1.html)

---

## ❓ FAQ

### Q: 단위 테스트가 타임아웃으로 실패합니다

A: Jest의 기본 타임아웃(5초)보다 테스트가 오래 걸립니다. `jest.config.js`에서 타임아웃을 늘리세요:

```javascript
module.exports = {
  testTimeout: 15000, // 15초
};
```

### Q: 통합 테스트에서 tmux 세션을 찾을 수 없습니다

A: tmux가 설치되어 있는지 확인하세요:

```bash
which tmux
tmux -V
```

### Q: 수동 테스트를 어떻게 시작하나요?

A: [TESTING_GUIDE.md](./TESTING_GUIDE.md)의 "수동 테스트 체크리스트" 섹션을 참조하세요.

---

## 🤝 기여하기

새로운 테스트를 추가하거나 기존 테스트를 개선하려면:

1. `tests/unit/` 또는 `tests/integration/`에 테스트 파일 추가
2. 이 README와 TESTING_GUIDE.md 업데이트
3. 모든 테스트가 통과하는지 확인
4. Pull Request 생성

---

**마지막 업데이트**: 2025-11-10
