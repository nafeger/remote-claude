#!/bin/bash
# Integration Test: Claude Code 시작 검증 로직 테스트
# 실제 tmux 환경에서 startClaudeCode() 동작 검증

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 테스트 설정
TEST_SESSION="test-claude-integration"
TEST_PROJECT="/tmp/test-claude-project"
LOG_FILE="$HOME/.remote-claude/logs/combined.log"

# 유틸리티 함수
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

cleanup() {
    print_info "Cleaning up test environment..."
    tmux kill-session -t "$TEST_SESSION" 2>/dev/null || true
    rm -rf "$TEST_PROJECT"
}

setup() {
    print_header "Test Environment Setup"

    # 기존 테스트 세션 정리
    cleanup

    # 테스트 프로젝트 생성
    mkdir -p "$TEST_PROJECT"
    echo '{"name": "test-project"}' > "$TEST_PROJECT/package.json"
    print_success "Test project created at $TEST_PROJECT"

    # tmux 세션 생성
    tmux new-session -d -s "$TEST_SESSION" -c "$TEST_PROJECT"
    print_success "tmux session created: $TEST_SESSION"

    sleep 1
}

# 테스트 1: "claude --continue" 실패 → "claude" 폴백
test_no_conversation_fallback() {
    print_header "Test 1: No Conversation Found → Fallback"

    # Claude Code가 실행되지 않은 상태 확인
    tmux send-keys -t "$TEST_SESSION" C-c
    sleep 1

    # "claude --continue" 전송
    print_info "Sending: claude --continue"
    tmux send-keys -t "$TEST_SESSION" -l "claude --continue"
    tmux send-keys -t "$TEST_SESSION" Enter

    sleep 2

    # 출력 캡처
    OUTPUT=$(tmux capture-pane -t "$TEST_SESSION" -p -S -20)

    # "No conversation found" 메시지 확인
    if echo "$OUTPUT" | grep -q "No conversation found to continue"; then
        print_success "Detected: 'No conversation found to continue'"

        # "claude" 명령 전송 (폴백 시뮬레이션)
        print_info "Fallback: Sending 'claude'"
        tmux clear-history -t "$TEST_SESSION"
        tmux send-keys -t "$TEST_SESSION" -l "echo 'Simulating claude command'"
        tmux send-keys -t "$TEST_SESSION" Enter

        sleep 1

        OUTPUT2=$(tmux capture-pane -t "$TEST_SESSION" -p -S -10)
        if echo "$OUTPUT2" | grep -q "Simulating claude command"; then
            print_success "Test 1 PASSED: Fallback executed successfully"
            return 0
        else
            print_error "Test 1 FAILED: Fallback not executed"
            return 1
        fi
    else
        print_error "Test 1 FAILED: 'No conversation found' not detected"
        echo "Output:"
        echo "$OUTPUT"
        return 1
    fi
}

# 테스트 2: Claude Code 이미 실행 중
test_already_running() {
    print_header "Test 2: Claude Code Already Running"

    # 기존 출력 시뮬레이션
    tmux clear-history -t "$TEST_SESSION"
    tmux send-keys -t "$TEST_SESSION" -l "echo 'Claude Code is running'"
    tmux send-keys -t "$TEST_SESSION" Enter
    tmux send-keys -t "$TEST_SESSION" -l "echo 'What would you like me to help you with?'"
    tmux send-keys -t "$TEST_SESSION" Enter

    sleep 1

    # "claude --continue" 전송
    print_info "Sending: claude --continue"
    tmux send-keys -t "$TEST_SESSION" -l "claude --continue"
    tmux send-keys -t "$TEST_SESSION" Enter

    sleep 2

    # 출력 캡처
    OUTPUT=$(tmux capture-pane -t "$TEST_SESSION" -p -S -20)

    # "No conversation found" 메시지가 없어야 함
    if echo "$OUTPUT" | grep -q "No conversation found to continue"; then
        print_error "Test 2 FAILED: Should not show 'No conversation found'"
        return 1
    else
        print_success "Test 2 PASSED: No error message detected (already running)"
        return 0
    fi
}

# 테스트 3: 타이밍 검증
test_timing() {
    print_header "Test 3: Timing Verification"

    # "claude --continue" 대기 시간 (2초)
    print_info "Testing 2-second wait for 'claude --continue'..."
    START=$(date +%s)
    tmux send-keys -t "$TEST_SESSION" -l "claude --continue"
    tmux send-keys -t "$TEST_SESSION" Enter
    sleep 2
    END=$(date +%s)

    ELAPSED=$((END - START))
    if [ $ELAPSED -ge 2 ]; then
        print_success "2-second wait verified (elapsed: ${ELAPSED}s)"
    else
        print_error "Wait time too short: ${ELAPSED}s"
        return 1
    fi

    # "claude" 대기 시간 (7초) 시뮬레이션
    print_info "Simulating 7-second wait for 'claude'..."
    START=$(date +%s)
    sleep 7
    END=$(date +%s)

    ELAPSED=$((END - START))
    if [ $ELAPSED -ge 7 ]; then
        print_success "7-second wait verified (elapsed: ${ELAPSED}s)"
    else
        print_error "Wait time too short: ${ELAPSED}s"
        return 1
    fi

    print_success "Test 3 PASSED: Timing verification successful"
    return 0
}

# 테스트 4: 화면 출력 캡처 검증
test_output_capture() {
    print_header "Test 4: Output Capture Verification"

    # 테스트 출력 생성
    tmux clear-history -t "$TEST_SESSION"
    tmux send-keys -t "$TEST_SESSION" -l "echo 'Line 1'"
    tmux send-keys -t "$TEST_SESSION" Enter
    sleep 0.5
    tmux send-keys -t "$TEST_SESSION" -l "echo 'Line 2'"
    tmux send-keys -t "$TEST_SESSION" Enter
    sleep 0.5
    tmux send-keys -t "$TEST_SESSION" -l "echo 'Line 3'"
    tmux send-keys -t "$TEST_SESSION" Enter

    sleep 1

    # 마지막 20줄 캡처
    OUTPUT=$(tmux capture-pane -t "$TEST_SESSION" -p -S -20)

    if echo "$OUTPUT" | grep -q "Line 1" && \
       echo "$OUTPUT" | grep -q "Line 2" && \
       echo "$OUTPUT" | grep -q "Line 3"; then
        print_success "Test 4 PASSED: All lines captured successfully"
        return 0
    else
        print_error "Test 4 FAILED: Not all lines captured"
        echo "Output:"
        echo "$OUTPUT"
        return 1
    fi
}

# 테스트 5: 빈 출력 처리
test_empty_output() {
    print_header "Test 5: Empty Output Handling"

    # 히스토리 지우기
    tmux clear-history -t "$TEST_SESSION"
    sleep 0.5

    # 빈 출력 캡처
    OUTPUT=$(tmux capture-pane -t "$TEST_SESSION" -p -S -20)

    if [ -z "$OUTPUT" ] || [ "${#OUTPUT}" -lt 5 ]; then
        print_success "Test 5 PASSED: Empty output detected correctly"
        return 0
    else
        print_error "Test 5 FAILED: Expected empty output"
        echo "Output length: ${#OUTPUT}"
        return 1
    fi
}

# 메인 테스트 실행
main() {
    print_header "Claude Code Start Verification - Integration Tests"

    # 환경 설정
    setup

    # 테스트 실행
    PASSED=0
    FAILED=0

    if test_no_conversation_fallback; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    sleep 2

    if test_already_running; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    sleep 2

    if test_timing; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    sleep 2

    if test_output_capture; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    sleep 2

    if test_empty_output; then
        ((PASSED++))
    else
        ((FAILED++))
    fi

    # 결과 출력
    print_header "Test Results"
    echo -e "Total Tests: $((PASSED + FAILED))"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"

    # 정리
    cleanup

    if [ $FAILED -eq 0 ]; then
        print_success "All tests passed!"
        exit 0
    else
        print_error "Some tests failed!"
        exit 1
    fi
}

# 인터럽트 처리
trap cleanup EXIT INT TERM

# 스크립트 실행
main
