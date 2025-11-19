# PRD: 원격 Claude Code 제어 시스템 (Slack 통합)

## 1. 개요 (Introduction/Overview)

본 시스템은 개발자가 Slack을 통해 원격에서 Claude Code를 제어하고 모니터링할 수 있도록 하는 통합 플랫폼입니다. 사용자는 사무실 외부(집, 카페, 이동 중 등)에서도 여러 프로젝트의 개발 작업을 지시하고 결과를 확인할 수 있으며, 대화형 인터페이스를 통해 워크플로우를 제어합니다.

### 문제 정의
개발자가 원격 환경에서 작업할 때, 로컬 개발 머신에서 실행 중인 Claude Code에 직접 접근하기 어렵습니다. 여러 프로젝트를 동시에 관리하는 경우, 각 프로젝트의 작업 상태를 추적하고 제어하는 것이 복잡합니다.

### 목표
Slack이라는 익숙한 협업 도구를 통해 Claude Code를 원격으로 제어함으로써, 개발자의 생산성을 향상시키고 어디서든 개발 작업을 관리할 수 있도록 합니다.

## 2. 목표 (Goals)

1. **원격 접근성**: 개발자가 위치에 관계없이 Slack을 통해 Claude Code를 제어할 수 있어야 합니다.
2. **멀티 프로젝트 관리**: 여러 프로젝트를 독립적으로 관리하며, 각 프로젝트별 상태를 분리하여 추적합니다.
3. **대화형 워크플로우**: 작업 결과를 확인하고 다음 단계를 승인하거나 수정할 수 있는 인터랙티브한 경험을 제공합니다.
4. **사용 편의성**: 미리 정의된 프롬프트 스니펫을 통해 반복적인 작업을 쉽게 실행할 수 있어야 합니다.
5. **안정성**: 프로젝트별 순차 큐 처리와 tmux 세션 격리를 통해 작업 충돌을 방지하고 안정적인 실행을 보장합니다.

## 3. 사용자 스토리 (User Stories)

### US-1: 원격 프롬프트 실행
- **As a** 개발자
- **I want to** Slack에서 미리 정의된 프롬프트 스니펫을 실행하여
- **So that** 사무실 밖에서도 빌드, 테스트, 배포 등의 작업을 수행할 수 있습니다.

### US-2: 작업 결과 확인 및 승인
- **As a** 개발자
- **I want to** Claude Code의 작업 결과를 Slack에서 확인하고 'y'로 다음 단계를 승인하여
- **So that** 각 단계를 검토하고 제어하면서 안전하게 작업을 진행할 수 있습니다.

### US-3: 멀티 프로젝트 관리
- **As a** 여러 프로젝트를 담당하는 개발자
- **I want to** 각 프로젝트별 Slack 채널에서 독립적으로 작업을 관리하여
- **So that** 프로젝트 간 상태가 섞이지 않고 명확하게 관리할 수 있습니다.

### US-4: 임시 프롬프트 실행
- **As a** 개발자
- **I want to** 미리 정의된 스니펫 외에도 즉석 프롬프트를 실행하여
- **So that** 예상치 못한 상황에 유연하게 대응할 수 있습니다.

### US-5: 작업 상태 모니터링
- **As a** 개발자
- **I want to** 현재 실행 중인 작업의 상태를 실시간으로 확인하여
- **So that** 작업 진행 상황을 파악하고 필요시 개입할 수 있습니다.

### US-6: 프롬프트 스니펫 관리
- **As a** 개발자
- **I want to** 자주 사용하는 프롬프트를 스니펫으로 저장하고 관리하여
- **So that** 반복적인 명령을 빠르게 실행할 수 있습니다.

## 4. 기능 요구사항 (Functional Requirements)

### FR-1: Slack Bot 통합
1.1. 시스템은 Slack Workspace에 Bot으로 설치되어야 합니다.
1.2. Bot은 메시지 이벤트를 실시간으로 수신해야 합니다.
1.3. Bot은 Slack의 Interactive Components(버튼, 드롭다운 등)를 지원해야 합니다.
1.4. Bot은 Socket Mode를 사용하여 로컬 개발 머신에서 실행됩니다.

### FR-2: 채널 설정 및 프로젝트 매핑
2.1. 시스템은 Slack 채널과 프로젝트 디렉토리를 매핑하는 설정 프로세스를 제공해야 합니다.
2.2. 채널 설정은 `/setup` 명령어를 통해 대화형으로 진행됩니다:
    - 프로젝트 경로 입력 (필수)
    - 프로젝트 이름 입력 (선택적, 기본값은 디렉토리 이름)
    - tmux 세션 이름 자동 생성 (규칙: `claude-{channel-id}`)
2.3. 같은 루트 디렉토리를 여러 채널이 공유할 수 없지만, 하위 경로는 허용됩니다:
    - 허용: `/project/frontend`와 `/project/backend`를 각각 다른 채널에 매핑
    - 금지: `/project`를 두 개 이상의 채널에 매핑
2.4. 채널 매핑 정보는 중앙 설정 파일(`~/.remote-claude/config.json`)에 저장됩니다.
2.5. 관리자는 채널 매핑을 수정(`/setup`)하거나 삭제(`/unsetup`)할 수 있어야 합니다.
2.6. 설정되지 않은 채널에서 명령을 실행하면, 설정을 먼저 진행하도록 안내 메시지를 표시합니다.

### FR-3: 프롬프트 스니펫 관리 및 실행
3.1. 프롬프트 스니펫은 Claude Code에게 전달할 자연어 명령 문자열입니다.
    - 예시: "Build the project and run all tests"
    - 예시: "Fix all linting errors in the codebase"
    - 예시: "Refactor the authentication module to use JWT tokens"
3.2. 스니펫은 중앙 저장소(`~/.remote-claude/snippets.json`)에 키-값 쌍으로 저장됩니다:
```json
{
  "build-test": "Build the project and run all unit tests. Report the test coverage.",
  "fix-lint": "Fix all linting errors in the codebase following our ESLint configuration.",
  "deploy-staging": "Deploy the current branch to the staging environment and verify the deployment."
}
```
3.3. 모든 프로젝트에서 동일한 스니펫 저장소를 공유합니다.
3.4. 사용자는 Slack에서 다음 명령어로 스니펫을 관리할 수 있습니다:
    - `/snippet list`: 사용 가능한 모든 스니펫 목록 표시
    - `/snippet add [name] [prompt]`: 새로운 스니펫 추가
    - `/snippet edit [name] [new-prompt]`: 기존 스니펫 수정
    - `/snippet delete [name]`: 스니펫 삭제
    - `/snippet show [name]`: 특정 스니펫의 전체 내용 확인
3.5. 스니펫 이름은 kebab-case 형식을 권장합니다 (예: `build-test`, `fix-lint`).
3.6. 사용자는 `/run [snippet-name]`으로 스니펫을 실행할 수 있습니다.
3.7. 스니펫에 정의되지 않은 즉석 프롬프트는 `/ask [your prompt here]`로 실행할 수 있습니다.

### FR-4: tmux 세션 관리
4.1. 각 Slack 채널(프로젝트)은 독립적인 tmux 세션을 가집니다.
4.2. tmux 세션 이름 규칙: `claude-{channel-id}` (예: `claude-C12345678`)
4.3. 채널 설정(`/setup`) 시, 시스템은 다음을 수행합니다:
    - tmux 세션이 존재하는지 확인: `tmux has-session -t {session-name}`
    - 없으면 새 세션 생성: `tmux new-session -d -s {session-name} -c {project-path}`
    - 세션 내에서 Claude Code 실행: `tmux send-keys -t {session-name} "claude --continue" Enter`
4.4. 기존 세션이 있으면, 새로 생성하지 않고 재사용합니다.
4.5. tmux 세션은 프로젝트 디렉토리를 working directory로 가집니다.
4.6. 시스템은 tmux 세션의 상태를 주기적으로 확인하고, 크래시된 경우 자동으로 재시작합니다.

### FR-5: Claude Code 통합
5.1. 시스템은 tmux를 통해 Claude Code와 통신합니다.
5.2. 프롬프트 전송: `tmux send-keys -t {session-name} "{prompt}" Enter`
5.3. 출력 캡처: `tmux capture-pane -t {session-name} -p -S -{line-count}`
5.4. Claude Code 실행 명령어: `claude --continue` (계속 작업할 때 --continue 옵션 사용)
5.5. 명령 실행 전, 시스템은 출력 시작 마커를 기록하여 새로운 출력만 캡처합니다.
5.6. 시스템은 주기적으로(예: 5초마다) 출력을 폴링하여 작업 완료 여부를 확인합니다.
5.7. 작업 완료 감지: 특정 패턴(예: 프롬프트 다시 표시, 특정 완료 메시지) 또는 출력 변화 없음.

### FR-6: 결과 보고
6.1. 작업 완료 시, 시스템은 결과를 Slack 채널에 포스팅해야 합니다.
6.2. 결과 메시지는 다음을 포함해야 합니다:
    - 실행된 프롬프트 또는 스니펫 이름
    - 실행 상태 (완료/에러/진행 중)
    - 출력 요약
6.3. 긴 출력(100줄 이상) 처리:
    - 처음 100줄과 마지막 50줄만 Slack 메시지에 표시
    - 중간 생략 부분은 "... (중간 N줄 생략) ..." 메시지로 표시
    - 전체 출력은 스레드에 첨부하거나 로컬 파일로 저장하고 경로 안내
6.4. 에러 발생 시, 에러 메시지를 명확하게 표시하고 관련 로그 라인을 포함합니다.
6.5. 결과 메시지는 시각적으로 구분 가능해야 합니다:
    - ✅ 성공: 초록색 또는 success 이모지
    - ❌ 실패: 빨간색 또는 error 이모지
    - ⏳ 진행 중: 파란색 또는 hourglass 이모지

### FR-7: 대화형 워크플로우
7.1. 작업 완료 후, 시스템은 다음 액션을 제안하는 인터랙티브 메시지를 표시합니다.
7.2. 사용자는 다음 방식으로 응답할 수 있습니다:
    - 'y', 'yes', 'Y', 'YES': 계속 작업 진행 (Claude가 제안한 다음 단계 실행)
    - 'n', 'no', 'N', 'NO': 작업 중단
    - 새로운 프롬프트 입력: 워크플로우 변경 또는 새로운 지시
7.3. 시스템은 사용자 응답을 대기하는 동안 세션 상태를 유지합니다.
7.4. 타임아웃 설정: 사용자 응답이 없을 경우, 30분 후 자동으로 세션을 종료하거나 알림을 보냅니다.
7.5. 타임아웃은 글로벌 설정으로 관리하며, 프로젝트별 오버라이드는 지원하지 않습니다.
7.6. 대화형 워크플로우 중에도 새로운 명령(`/run`, `/ask`)은 큐에 추가됩니다.

### FR-8: 순차 큐 처리
8.1. 각 프로젝트(채널)별로 독립적인 작업 큐를 유지합니다.
8.2. 동일 프로젝트에 여러 명령이 들어오면, 큐에 추가하고 순차적으로 처리합니다.
8.3. 작업 큐 상태를 사용자에게 실시간으로 알립니다 (예: "현재 1개 작업 실행 중, 2개 대기 중").
8.4. 큐에 작업이 추가되면, 예상 대기 시간을 표시합니다 (선택적).
8.5. 초기 버전에서는 사용자 구분 없이 채널의 모든 사용자가 동등하게 작업을 실행할 수 있습니다.
8.6. 작업 취소는 현재 실행 중인 작업만 가능합니다 (`/cancel`).

### FR-9: 명령어 지원
9.1. `/setup`: 채널-프로젝트 매핑 설정 (대화형)
9.2. `/unsetup`: 채널-프로젝트 매핑 삭제
9.3. `/snippet list`: 사용 가능한 스니펫 목록
9.4. `/snippet add [name] [prompt]`: 스니펫 추가
9.5. `/snippet edit [name] [prompt]`: 스니펫 수정
9.6. `/snippet delete [name]`: 스니펫 삭제
9.7. `/snippet show [name]`: 스니펫 내용 확인
9.8. `/run [snippet-name]`: 스니펫 실행
9.9. `/ask [prompt]`: 즉석 프롬프트 실행
9.10. `/status`: 현재 실행 중인 작업 및 큐 상태 표시
9.11. `/cancel`: 현재 실행 중인 작업 취소
9.12. `/help`: 사용 가능한 명령어 및 사용법 표시

### FR-10: 로컬 개발 머신 통합
10.1. 시스템은 로컬 개발 머신에서 백그라운드 서비스로 실행됩니다.
10.2. 시스템은 머신 재부팅 시 자동으로 시작될 수 있습니다 (선택적, systemd 또는 PM2 사용).
10.3. 시스템은 로컬 파일 시스템 및 개발 환경(Node.js, Python, tmux 등)에 접근할 수 있어야 합니다.
10.4. 시스템 시작 시, 기존에 실행 중이던 tmux 세션을 확인하고 상태를 복원합니다.
10.5. 시스템은 작업 상태를 파일(`~/.remote-claude/state.json`)에 주기적으로 저장하여, 시스템 재시작 시 복구할 수 있습니다.

## 5. 비기능 요구사항 (Non-Functional Requirements)

### NFR-1: 성능
1.1. 명령 수신 후 1초 이내에 확인 메시지를 Slack에 전송해야 합니다.
1.2. 작업 완료 후 5초 이내에 결과를 Slack에 보고해야 합니다.
1.3. tmux 출력 폴링 간격은 5초로 설정하여 적절한 응답성을 유지합니다.

### NFR-2: 안정성
2.1. 시스템은 Claude Code 실행 실패 시 크래시되지 않고 에러를 보고합니다.
2.2. 네트워크 단절 시 재연결을 시도하고, 큐에 있는 작업을 보존합니다.
2.3. tmux 세션이 예기치 않게 종료되면, 시스템은 이를 감지하고 자동으로 재시작합니다.
2.4. 시스템 재시작 시, 진행 중이던 작업 상태를 복구하고 사용자에게 알립니다.

### NFR-3: 보안
3.1. Slack 인증을 사용하여 워크스페이스 멤버만 접근 가능해야 합니다.
3.2. Bot 토큰 및 API 키는 안전하게 저장됩니다 (환경 변수 또는 암호화된 설정 파일).
3.3. 시스템은 민감한 정보(패스워드, API 키 등)를 Slack에 노출하지 않습니다.
3.4. 프로젝트 경로는 로컬 파일 시스템 내로 제한하며, 외부 경로 접근을 차단합니다.

### NFR-4: 사용성
4.1. 초급 개발자도 15분 내에 기본 사용법을 익힐 수 있어야 합니다.
4.2. 에러 메시지는 명확하고 실행 가능한 해결 방법을 포함합니다.
4.3. 대화형 설정 프로세스는 단계별로 명확한 안내를 제공합니다.

### NFR-5: 유지보수성
5.1. 코드는 모듈화되어 각 컴포넌트(Slack Bot, tmux Manager, Queue Manager 등)를 독립적으로 테스트하고 수정할 수 있어야 합니다.
5.2. 로그는 디버깅이 용이하도록 상세하게 기록됩니다.
5.3. 설정 파일은 JSON 형식으로 가독성과 편집 용이성을 보장합니다.

## 6. 목표가 아닌 것 (Non-Goals / Out of Scope)

1. **다중 머신 지원**: MVP에서는 한 대의 로컬 머신만 지원합니다. 여러 머신에서 Claude Code를 실행하는 것은 향후 고려사항입니다.
2. **고급 보안 기능**: 2FA, 역할 기반 접근 제어(RBAC), 프로젝트별 권한 관리는 향후 버전에서 구현합니다.
3. **병렬 실행**: MVP에서는 프로젝트별 순차 처리만 지원합니다. 동시 실행은 향후 고려사항입니다.
4. **실시간 진행 상황**: 장시간 작업의 실시간 진행률 업데이트는 향후 버전에서 구현합니다. (현재는 주기적 폴링)
5. **웹 대시보드**: Slack 외 별도의 웹 UI는 제공하지 않습니다.
6. **스니펫 편집 UI**: 스니펫은 Slack 명령어 또는 파일 시스템에서 직접 편집하며, 별도의 편집 UI는 제공하지 않습니다.
7. **Git 자동 커밋**: Claude Code가 파일을 수정해도 자동으로 커밋하지 않습니다. 사용자가 수동으로 처리합니다.
8. **자동 에러 재시도**: 작업 실패 시 자동으로 재시도하지 않습니다. 사용자가 명시적으로 재실행해야 합니다.

## 7. 설계 고려사항 (Design Considerations)

### 아키텍처 개요
```
[Slack] <-> [Slack Bot Service] <-> [Orchestrator] <-> [tmux Manager] <-> [tmux Session]
                                          |                                      |
                                    [Job Queue]                          [Claude Code CLI]
                                          |
                                    [State Manager]
                                          |
                                   [Config Store]
                                          |
                                  [Snippet Store]
```

### 주요 컴포넌트
1. **Slack Bot Service**: Slack Events API 및 Web API 처리, Socket Mode 사용
2. **Orchestrator**: 명령 라우팅, 작업 큐 관리, 채널-프로젝트 매핑 관리
3. **tmux Manager**: tmux 세션 생성/관리, 명령 전송, 출력 캡처
4. **Job Queue**: 프로젝트별 작업 큐 (메모리 기반 FIFO)
5. **State Manager**: 세션 상태, 대화 컨텍스트, 작업 진행 상태 관리
6. **Config Store**: 채널-프로젝트 매핑 정보 저장 (`~/.remote-claude/config.json`)
7. **Snippet Store**: 프롬프트 스니펫 저장 (`~/.remote-claude/snippets.json`)

### 디렉토리 구조
```
~/.remote-claude/
├── config.json          # 채널-프로젝트 매핑
├── snippets.json        # 프롬프트 스니펫
├── state.json           # 세션 상태 (복구용)
├── logs/
│   ├── system.log       # 시스템 로그
│   ├── slack.log        # Slack 통신 로그
│   └── tmux.log         # tmux 관련 로그
└── outputs/             # 긴 출력 저장 (선택적)
    └── {channel-id}/
        └── {timestamp}.txt
```

### UI/UX 고려사항
- **Slack Block Kit 활용**: 버튼, 드롭다운 등으로 인터랙티브한 경험 제공
- **메시지 스레드**: 긴 출력이나 상세 로그는 스레드로 정리하여 채널을 깔끔하게 유지
- **이모지 활용**: 상태를 시각적으로 표현 (✅ 성공, ❌ 실패, ⏳ 진행 중, 📝 스니펫, 🔧 설정)
- **코드 블록**: 로그 및 출력은 코드 블록으로 포맷팅
- **대화형 설정**: 단계별 프롬프트로 사용자 친화적인 설정 경험 제공

### 프롬프트 스니펫 저장 예시
```json
{
  "snippets": {
    "build-test": "Build the project using npm and run all unit tests. Report the test coverage and any failures.",
    "fix-lint": "Fix all linting errors in the codebase following our ESLint configuration. Show a summary of changes.",
    "refactor-auth": "Refactor the authentication module to use JWT tokens instead of session-based auth. Update all related files.",
    "deploy-staging": "Deploy the current branch to the staging environment. Verify the deployment and run smoke tests.",
    "update-deps": "Update all npm dependencies to their latest compatible versions. Check for breaking changes and update the code accordingly."
  }
}
```

### 채널 설정 저장 예시
```json
{
  "channels": {
    "C12345678": {
      "project_path": "/Users/dev/projects/my-app",
      "project_name": "my-app",
      "tmux_session": "claude-C12345678",
      "created_at": "2025-01-15T10:30:00Z",
      "last_used": "2025-01-15T14:22:00Z"
    },
    "C87654321": {
      "project_path": "/Users/dev/projects/monorepo/frontend",
      "project_name": "monorepo-frontend",
      "tmux_session": "claude-C87654321",
      "created_at": "2025-01-16T09:15:00Z",
      "last_used": "2025-01-16T11:45:00Z"
    }
  }
}
```

## 8. 기술 고려사항 (Technical Considerations)

### 기술 스택 제안
- **언어**: Node.js (TypeScript) 또는 Python
- **Slack SDK**: `@slack/bolt` (Node.js) 또는 `slack-bolt` (Python)
- **프로세스 관리**: PM2 (Node.js) 또는 systemd
- **데이터 저장**: JSON 파일 (설정, 스니펫, 상태)
- **큐 관리**: 메모리 기반 큐 (배열 또는 큐 라이브러리)
- **tmux 통신**: `child_process.exec` 또는 `subprocess` (Python)

### tmux 통합 방식

#### 1. 세션 생성
```bash
# 세션 존재 확인
tmux has-session -t claude-C12345678 2>/dev/null

# 없으면 생성
tmux new-session -d -s claude-C12345678 -c /path/to/project

# Claude Code 시작
tmux send-keys -t claude-C12345678 "claude --continue" Enter
```

#### 2. 프롬프트 전송
```bash
# 프롬프트 전송
tmux send-keys -t claude-C12345678 "Build the project and run tests" Enter
```

#### 3. 출력 캡처
```bash
# 최근 200줄 캡처 (긴 출력 고려)
tmux capture-pane -t claude-C12345678 -p -S -200

# 또는 전체 스크롤백 캡처
tmux capture-pane -t claude-C12345678 -p -S -
```

#### 4. 고급 제어 (선택적)
```bash
# 특정 윈도우/팬 제어 (필요 시)
tmux send-keys -t claude-C12345678:0.0 "command" Enter

# 출력 모니터링 (새로운 출력만)
# 마지막 캡처 라인 수를 저장하고, 그 이후만 가져오기
```

### 통합 방식
1. **Slack App 설정**:
   - Socket Mode 활성화 (방화벽 이슈 없이 로컬에서 실행)
   - 필요한 권한: `chat:write`, `commands`, `channels:read`, `channels:history`, `im:read`, `im:write`

2. **Claude Code 통합**:
   - tmux를 통해 Claude Code CLI와 통신
   - 프로젝트 디렉토리를 tmux 세션의 working directory로 설정
   - 환경 변수로 API 키 전달 (tmux 세션 환경 설정)

3. **상태 관리**:
   - 채널 ID → 프로젝트 경로 매핑 (config.json)
   - 채널 ID → tmux 세션 이름 매핑
   - 세션 ID → 대화 상태 매핑 (메모리)
   - 작업 큐: 배열 기반 FIFO (프로젝트별)

### 에러 처리 전략
- **네트워크 에러**: 지수 백오프로 재시도 (최대 3회)
- **tmux 세션 크래시**: 자동 재시작 시도, 사용자에게 알림
- **Claude Code 실행 실패**: 에러 메시지 파싱하여 사용자에게 명확히 전달
- **타임아웃**: 30분 사용자 무응답 시 세션 종료 알림
- **큐 오버플로우**: 큐 크기 제한 (예: 10개) 및 경고 메시지
- **경로 검증**: 설정 시 경로 존재 여부 확인, 중복 매핑 방지

### 로깅 전략
- **로그 레벨**: DEBUG, INFO, WARN, ERROR
- **로그 위치**: `~/.remote-claude/logs/`
- **로그 로테이션**: 일일 로그 파일, 최대 7일 보관
- **민감 정보 마스킹**: API 키, 토큰 등은 로그에서 마스킹
- **구조화된 로그**: JSON 형식으로 파싱 및 분석 용이하게 작성

## 9. 성공 지표 (Success Metrics)

1. **사용자 채택률**: 팀의 80% 이상이 첫 주 내에 시스템을 사용
2. **명령 성공률**: 95% 이상의 명령이 성공적으로 실행
3. **응답 시간**: 평균 명령 수신 후 확인까지 1초 이내
4. **에러율**: 시스템 에러로 인한 실패가 전체 실행의 5% 미만
5. **사용자 만족도**: 사용자 설문에서 4/5점 이상의 만족도
6. **스니펫 재사용률**: 생성된 스니펫의 70% 이상이 2회 이상 재사용됨

## 10. 해결된 질문 (Resolved Questions)

### 1. 프롬프트 스니펫 저장 위치
**답변**: 중앙 설정 디렉토리(`~/.remote-claude/snippets.json`)에 저장하며, 모든 프로젝트에서 공유합니다. 사용자는 Slack 명령어(`/snippet add/edit/delete`)로 추가, 수정, 삭제할 수 있습니다.

### 2. 타임아웃 설정
**답변**: 글로벌 타임아웃(30분)으로 충분합니다. 프로젝트별 오버라이드는 지원하지 않습니다.

### 3. 다중 사용자 권한
**답변**: 초기 버전에서는 사용자 구분 없이, 같은 프로젝트 채널의 모든 사용자가 동등한 권한을 가집니다. 향후 버전에서 역할 기반 권한을 고려할 수 있습니다.

### 4. 실패 복구
**답변**: 작업 상태를 파일(`~/.remote-claude/state.json`)에 저장하여, 시스템 재시작 시 복구하거나 사용자에게 알림을 보냅니다.

### 5. 스니펫 버전 관리
**답변**: 필요 없습니다. 스니펫은 실시간으로 최신 버전을 사용합니다. 실행 중인 작업은 영향을 받지 않습니다.

### 6. 알림 전략
**답변**: 해당 채널의 모든 관계자에게 알림을 보냅니다. 채널 전체에 메시지를 포스팅하며, 별도의 DM은 보내지 않습니다.

### 7. Claude 실행 명령어
**답변**: `claude --continue` (계속 작업할 때 --continue 옵션 사용)

### 8. 긴 출력 처리
**답변**: 처음 100줄과 마지막 50줄만 Slack에 표시하고, 중간은 생략 메시지로 처리합니다. 전체 출력은 스레드 또는 로컬 파일로 제공합니다.

### 9. 경로 공유
**답변**: 같은 루트 디렉토리는 여러 채널이 공유할 수 없지만, 하위 경로는 허용됩니다. 예: `/project/frontend`와 `/project/backend`는 각각 다른 채널에 매핑 가능.

## 11. 구현 우선순위 (Implementation Priority)

### Phase 1: Core Infrastructure (1-2주)
- FR-1: Slack Bot 통합 (Socket Mode)
- FR-2: 채널 설정 프로세스 (기본 구현)
- FR-4: tmux 세션 관리
- FR-5: Claude Code 통합 (기본 프롬프트 전송 및 출력 캡처)
- FR-6: 결과 보고 (기본 메시지)

### Phase 2: Snippet & Interactive (1주)
- FR-3: 프롬프트 스니펫 관리 (CRUD)
- FR-7: 대화형 워크플로우 (y/n 응답)
- FR-9: 핵심 명령어 (/setup, /run, /ask, /help)

### Phase 3: Queue & Management (1주)
- FR-8: 순차 큐 처리
- FR-9: 추가 명령어 (/status, /cancel, /snippet 전체)
- 프로젝트별 독립적인 상태 관리

### Phase 4: Polish & Stability (1주)
- FR-10: 로컬 머신 통합 개선 (자동 시작, 상태 복구)
- NFR-2: 안정성 개선 (재연결, tmux 크래시 복구)
- NFR-5: 로깅 및 디버깅 개선
- 긴 출력 처리 완성
- 경로 중복 검증

## 12. 부록: 사용 예시

### 시나리오 1: 채널 설정
```
사용자: /setup

Bot: 🔧 채널 설정을 시작합니다.
이 채널을 프로젝트와 연결하려면 다음 정보를 입력해주세요.

프로젝트 디렉토리 경로를 입력하세요:
(예: /Users/dev/projects/my-app)

사용자: /Users/dev/projects/my-app

Bot: ✅ 경로를 확인했습니다: /Users/dev/projects/my-app

프로젝트 이름을 입력하세요 (선택사항, 엔터 시 'my-app' 사용):

사용자: [엔터]

Bot: ⏳ 설정 중입니다...
- tmux 세션 생성 중: claude-C12345678
- Claude Code 시작 중...

✅ 설정 완료!
- 프로젝트: my-app
- 경로: /Users/dev/projects/my-app
- tmux 세션: claude-C12345678

이제 `/run [snippet-name]` 또는 `/ask [prompt]`로 작업을 시작하세요.
사용 가능한 스니펫: `/snippet list`
```

### 시나리오 2: 프롬프트 스니펫 실행
```
사용자: /run build-test

Bot: ⏳ "build-test" 스니펫을 실행합니다...
프롬프트: "Build the project and run all unit tests. Report the test coverage."

[30초 후]

Bot: ✅ 작업 완료!

**출력 요약:**
```
✓ npm install completed
✓ Build successful (2.3MB)
✓ 145 tests passed
✓ Coverage: 87% statements, 82% branches

Test Summary:
- Total: 145
- Passed: 145
- Failed: 0
- Duration: 23s
```

전체 출력 보기 (스레드)

다음 단계를 진행하시겠습니까?
[계속] [중단]

사용자: [계속] 클릭

Bot: ⏳ 다음 작업을 진행합니다...
```

### 시나리오 3: 즉석 프롬프트 실행
```
사용자: /ask Fix all linting errors and show me a summary

Bot: ⏳ 프롬프트를 실행합니다...
"Fix all linting errors and show me a summary"

[45초 후]

Bot: ✅ 작업 완료!

**출력 요약:**
```
Fixed 34 linting errors across 12 files:
- Missing semicolons: 15
- Unused variables: 8
- Indentation issues: 7
- Other: 4

Files modified:
- src/components/Header.tsx
- src/utils/api.ts
- src/pages/Home.tsx
... (9 more files)

All linting errors have been resolved.
```

상세 내용 보기 (스레드)
```

### 시나리오 4: 스니펫 관리
```
사용자: /snippet add deploy-prod "Deploy the current branch to production. Run all pre-deployment checks and smoke tests after deployment."

Bot: ✅ 스니펫 추가 완료!
- 이름: deploy-prod
- 프롬프트: "Deploy the current branch to production. Run all pre-deployment checks and smoke tests after deployment."

`/run deploy-prod`로 실행할 수 있습니다.

---

사용자: /snippet list

Bot: 📝 사용 가능한 스니펫 (5개):
1. `build-test` - Build and run tests
2. `fix-lint` - Fix linting errors
3. `refactor-auth` - Refactor authentication
4. `deploy-staging` - Deploy to staging
5. `deploy-prod` - Deploy to production

상세 내용: `/snippet show [name]`
```

### 시나리오 5: 큐 상태 확인
```
사용자: /status

Bot: 📊 프로젝트: my-app
- 경로: /Users/dev/projects/my-app
- tmux 세션: claude-C12345678 (실행 중 ✅)

현재 작업 상태:
⏳ 실행 중: "build-test" (1분 전 시작)
📋 대기 중:
  1. "deploy-staging" (30초 전 추가)
  2. "Fix navigation bug" (10초 전 추가)

예상 대기 시간: 약 2-3분
```

### 시나리오 6: 긴 출력 처리
```
사용자: /run analyze-codebase

Bot: ⏳ "analyze-codebase" 스니펫을 실행합니다...

[2분 후]

Bot: ✅ 작업 완료!

**출력 요약 (처음 100줄):**
```
Analyzing codebase structure...
Total files: 342
Total lines of code: 45,231

Directory structure:
├── src/
│   ├── components/ (89 files)
│   ├── pages/ (23 files)
│   ├── utils/ (15 files)
...
(100줄)
```

... (중간 2,145줄 생략) ...

**출력 요약 (마지막 50줄):**
```
...
Recommendations:
1. Refactor utils/api.ts to reduce complexity
2. Add unit tests for payment module (coverage: 45%)
3. Update dependencies: react, typescript, eslint

Analysis complete. Total execution time: 118s
```

📎 전체 출력: ~/.remote-claude/outputs/C12345678/20250115-143022.txt
스레드에서 전체 보기
```

## 13. 추가 고려사항

### tmux 세션 모니터링
- 시스템은 1분마다 모든 활성 tmux 세션의 상태를 확인합니다.
- 세션이 예기치 않게 종료되면, 자동으로 재시작을 시도하고 채널에 알림을 보냅니다.
- 연속 3회 재시작 실패 시, 사용자에게 수동 개입을 요청합니다.

### 경로 검증
- 채널 설정 시, 경로가 존재하는지 확인합니다.
- 이미 다른 채널에 매핑된 경로 또는 그 상위 경로인지 확인합니다.
- 허용: `/project/frontend`와 `/project/backend`
- 금지: `/project`가 이미 매핑된 경우, `/project` 또는 `/project/backend` 추가 매핑

### 출력 파싱 최적화
- tmux capture-pane의 출력에서 ANSI 색상 코드를 제거합니다.
- 불필요한 제어 문자를 필터링합니다.
- Slack 메시지 크기 제한(4000자)을 고려하여 출력을 적절히 자릅니다.

### 프롬프트 이어가기 (--continue)
- 첫 실행 시: `claude --continue`로 대화형 세션 시작
- 이후 프롬프트는 같은 세션에서 계속 진행되어 컨텍스트가 유지됩니다.
- 사용자가 명시적으로 `/cancel` 하거나 타임아웃되면 세션 종료를 고려할 수 있습니다.
