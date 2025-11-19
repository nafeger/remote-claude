# 파일 다운로드 기능 시스템 테스트

이 디렉토리는 파일 다운로드 기능의 end-to-end 시스템 테스트를 포함합니다.

## 테스트 환경 요구사항

### 필수 환경
- Remote Claude 앱이 실행 중이어야 함
- Slack 워크스페이스 및 테스트 채널
- 환경 변수 설정 완료 (`.env` 파일)

### 환경 변수
```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
TEST_CHANNEL_ID=C...  # 테스트용 Slack 채널 ID
```

## 테스트 시나리오

### 시나리오 1: 정상 파일 다운로드 (US-1)
**목적**: 유효한 파일을 Slack으로 다운로드하는 전체 플로우 검증

**사전 준비**:
1. 테스트 프로젝트 디렉토리 생성
2. 5MB 로그 파일 생성 (`logs/test-app.log`)
3. `/setup` 명령으로 채널 설정

**테스트 단계**:
1. Slack에서 `/download logs/test-app.log` 입력
2. 시스템 응답 시간 측정 (3초 이내 목표)
3. Slack 파일 업로드 확인
4. 파일 제목 확인: `{projectName}: logs/test-app.log`
5. 다운로드한 파일 내용 검증 (SHA-256 해시 비교)

**예상 결과**:
- ✅ 파일 다운로드 완료 메시지
- ✅ Slack에 파일 업로드됨
- ✅ 원본과 동일한 파일

### 시나리오 2: 보안 정책 검증 (US-5)
**목적**: 민감한 파일 접근 차단 검증

**사전 준비**:
1. 테스트 프로젝트에 `.env` 파일 생성
2. `/setup` 명령으로 채널 설정

**테스트 단계**:
1. Slack에서 `/download .env` 입력
2. 에러 메시지 확인
3. Slack에 파일 업로드되지 않았는지 확인
4. 로그 파일에서 보안 검증 실패 기록 확인

**예상 결과**:
- ⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다
- ❌ Slack에 파일 업로드 없음
- 📝 로그에 보안 검증 실패 기록

### 시나리오 3: 마크다운 파일 다운로드 (US-2)
**목적**: Claude Code가 생성한 문서 파일 다운로드

**사전 준비**:
1. 테스트 마크다운 파일 생성 (`docs/api.md`)

**테스트 단계**:
1. Slack에서 `/download docs/api.md` 입력
2. 파일 업로드 확인
3. Slack에서 마크다운 렌더링 확인

**예상 결과**:
- ✅ 파일 다운로드 완료
- ✅ Slack에서 마크다운 프리뷰 표시

### 시나리오 4: 설정 파일 다운로드 (US-3)
**목적**: 설정 파일 다운로드 및 코드 하이라이팅

**사전 준비**:
1. 테스트 설정 파일 생성 (`config/database.json`)

**테스트 단계**:
1. Slack에서 `/download config/database.json` 입력
2. 파일 업로드 확인
3. Slack 코드 하이라이팅 확인

**예상 결과**:
- ✅ 파일 다운로드 완료
- ✅ JSON 구문 강조 표시

## 테스트 실행 방법

### 1. 테스트 환경 셋업
```bash
# 테스트 프로젝트 디렉토리 생성
npm run test:system:setup

# 또는 수동으로
node tests/system/setup-test-environment.js
```

### 2. Remote Claude 앱 실행
```bash
npm start
```

### 3. Slack 채널에서 수동 테스트 수행
- 각 시나리오별로 명령어 입력
- 결과 확인 및 기록

### 4. 테스트 결과 검증
```bash
# 파일 해시 검증 유틸리티
node tests/system/verify-file-hash.js <original> <downloaded>
```

## 테스트 체크리스트

### 시나리오 1: 정상 파일 다운로드
- [ ] `/setup` 명령 성공
- [ ] `/download logs/test-app.log` 명령 입력
- [ ] 3초 이내 응답
- [ ] "⏳ 파일을 다운로드하는 중입니다" 메시지 표시
- [ ] "✅ 파일 다운로드 완료" 메시지 표시
- [ ] Slack에 파일 업로드됨
- [ ] 파일 제목: `test-project: logs/test-app.log`
- [ ] 다운로드한 파일 해시 일치

### 시나리오 2: 보안 정책 검증
- [ ] `.env` 파일 생성
- [ ] `/download .env` 명령 입력
- [ ] 1초 이내 에러 응답
- [ ] "⚠️ 보안상 민감한 파일은 다운로드할 수 없습니다" 메시지
- [ ] Slack에 파일 업로드 없음
- [ ] 로그에 보안 검증 실패 기록

### 시나리오 3: 마크다운 파일
- [ ] `docs/api.md` 파일 생성
- [ ] `/download docs/api.md` 명령 입력
- [ ] 파일 업로드 성공
- [ ] Slack 마크다운 프리뷰 표시

### 시나리오 4: 설정 파일
- [ ] `config/database.json` 파일 생성
- [ ] `/download config/database.json` 명령 입력
- [ ] 파일 업로드 성공
- [ ] JSON 구문 강조 표시

## 문제 해결 (Troubleshooting)

### 파일 업로드 실패
- Slack API 토큰 확인
- 채널 권한 확인
- 로그 파일 확인

### 파일 검증 실패
- 파일 크기 확인 (10MB 이하)
- 파일 경로 확인
- 보안 패턴 확인

### 응답 시간 초과
- 파일 크기 확인
- 네트워크 상태 확인
- 로그 레벨 DEBUG로 변경하여 상세 확인
