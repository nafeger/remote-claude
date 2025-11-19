# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation
- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the user for permission and they say "yes" or "y". **Use the AskUserQuestion tool** to present options and gather user decisions efficiently through Claude Code's interactive interface.
- **Test Implementation and Execution Policy:**
  - **Unit Test Requirements:**
    - All implemented classes and functions must have corresponding unit tests using the programming language's native testing framework (e.g., Jest for JavaScript, pytest for Python, JUnit for Java).
    - Each unit test suite must include a minimum of 3 test cases covering:
      - **Happy Path:** Verify the most common, expected scenarios work correctly.
      - **Boundary Conditions:** Test edge cases including minimum values, maximum values, empty inputs, null values.
      - **Exception Cases:** Validate proper handling of invalid inputs and error conditions.
      - **Side Effects:** Ensure test independence and no impact on global state or external systems.
    - Unit tests must be written during implementation, not as an afterthought.
  - **System Test Requirements:**
    - Based on the PRD user stories, create end-to-end system tests that validate complete workflows.
    - Test at least 2 realistic user scenarios representing normal feature usage.
    - **Must use real data for validation** - no hardcoded values or dummy data allowed.
    - System tests verify the integration of all components from start to finish.
  - **Test Execution Policy:**
    - **NEVER skip tests**: All tests must be executed completely, even if they take time
    - **Timeout setting**: Set test timeout to 10 minutes (600000ms) to allow sufficient execution time
    - **Wait for completion**: Always wait for full test suite to complete before proceeding
    - **No shortcuts**: Do not use grep, tail, or other methods to skip test execution
- **Completion protocol:**
  1. When you finish a **sub‑task**, immediately mark it as completed by changing `[ ]` to `[x]`.
  2. If **all** subtasks underneath a parent task are now `[x]`, follow this sequence:
    - **First**: Run the full test suite (`pytest`, `npm test`, `bin/rails test`, etc.) with 10-minute timeout
    - **Only if all tests pass**: Stage changes (`git add .`)
    - **Clean up**: Remove any temporary files and temporary code before committing
    - **Commit**: Use a descriptive commit message that:
      - Uses conventional commit format with Korean descriptions (`feat:`, `fix:`, `refactor:`, etc.)
      - Summarizes what was accomplished in the parent task in Korean
      - Lists key changes and additions in Korean
      - References the task number and PRD context
      - Must be clear enough for junior developers to understand
      - **Formats the message as a single-line command using `-m` flags**, e.g.:

        ```
        git commit -m "feat: 결제 검증 로직 추가" -m "- 카드 타입 및 만료일 검증 구현" -m "- 엣지 케이스 유닛 테스트 추가" -m "PRD T123 관련"
        ```
  3. Once all the subtasks are marked completed and changes have been committed, mark the **parent task** as completed.
- Stop after each sub‑task and wait for the user's go‑ahead.

## Task List Maintenance

1. **Update the task list as you work:**
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## Discord Notification Requirements

**MANDATORY**: Send Discord webhook notifications in the following situations:

1. **When a task is completed:**
   - Include project name/path, task number, and summary of what was accomplished
   - Mention test results and commit hash

2. **When a task fails or requires compromise:**
   - Explain the failure reason clearly
   - Propose alternatives (skip, hardcode, simplify, or reduce scope)
   - Wait for user feedback before proceeding

3. **When suggesting a better approach:**
   - Explain why the alternative approach is recommended
   - Provide clear reasoning and benefits
   - Wait for user approval before changing course

### Discord Webhook Configuration

- **Webhook URL:** `https://discord.com/api/webhooks/1427182963317276743/LA5OmHXKnGgsRlKOFujd2dfIlpD8vUgoefQRev-jCjd-sWseBJrLVgpAiWaUIk0BsD4b`
- **Character Limit:** 1000 characters maximum - summarize appropriately
- **Message Language:** ALL Discord messages MUST be written in Korean (한글)
- **Message Format:** Always include:
  - Project name or path identifier
  - Current task number and description
  - Status or action required
  - Relevant details (commit hash, test results, error summary, etc.)

### Example Discord Message Format

```json
{
  "content": "**[FIRE]** Task 5.0 완료 ✅\n\n**작업:** 증자/감자 현황 API 구현\n**경로:** /Users/idongho/proj/fire\n**테스트:** 84개 통과, 149 assertions\n**커밋:** 12699a1\n\n모든 서브태스크 완료. 다음 지시 대기 중입니다."
}
```

## Language Policy

**IMPORTANT:** All code comments, documentation, and user communications must be written in Korean (한글) to maintain consistency and accessibility for the development team.

### Language Requirements:

1. **Code Comments:**
   - All comments in implementation code must be written in Korean
   - Function and class documentation must use Korean
   - Inline explanations and TODO comments must be in Korean

2. **User Communications:**
   - All progress reports and summaries to the user must be in Korean
   - Status updates and completion notifications must be in Korean
   - When reporting to users, **always include information about any markdown files that were created, modified, or deleted** during the implementation

3. **Commit Messages:**
   - Use conventional commit format with Korean descriptions
   - Keep the commit type prefix in English (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
   - Write the commit description and body in Korean for clarity and accessibility to junior developers
   - Commit messages must be clear and descriptive enough for junior developers to understand what was changed and why
   - Use the multi-line format with `-m` flags for structured commit messages
   - Example format: `git commit -m "feat: 기능 설명" -m "- 세부 내용 1" -m "- 세부 내용 2"`

4. **Discord Notifications:**
   - As specified in the Discord Notification Requirements section, all Discord messages must be in Korean
   - This extends to all user-facing communications

5. **Technical Terms:**
   - Common technical terms and abbreviations used in Korean development context may remain in English (e.g., API, HTTP, JSON, function names, variable names)
   - Programming language keywords and syntax remain in their original form
   - When in doubt, use the term as it would naturally appear in Korean technical documentation

### Examples:

**Code Comments:**
```javascript
// ✅ Correct:
// 사용자 인증 토큰을 검증합니다
function validateToken(token) { ... }

// ❌ Incorrect:
// Validates user authentication token
function validateToken(token) { ... }
```

**User Report:**
```
✅ Correct:
"Task 1.1 완료: 사용자 프로필 API 구현이 완료되었습니다.
수정된 파일: api/profile.js, api/profile.test.js
생성된 문서: docs/api-profile.md"

❌ Incorrect:
"Task 1.1 completed: User profile API implementation finished."
```

**Commit Messages:**
```bash
✅ Correct:
git commit -m "feat: 사용자 프로필 수정 기능 구현" \
           -m "- 프로필 이미지 업로드 기능 추가" \
           -m "- 닉네임 변경 검증 로직 구현" \
           -m "관련 태스크: T123"

❌ Incorrect:
git commit -m "feat: implement user profile edit feature" \
           -m "- Add profile image upload" \
           -m "- Implement nickname validation"
```

## AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which sub‑task is next.
6. After implementing a sub‑task, update the file and then pause for user approval.
7. **ALWAYS send Discord notifications** as specified in the Discord Notification Requirements section above.
8. **Follow the Language Policy** as specified in the Language Policy section above:
   - Write all code comments and documentation in Korean
   - Provide all user reports and summaries in Korean
   - Include markdown file change information when reporting to users
   - Use conventional commit format with Korean descriptions for git commits
9. **Context Preservation:** If context becomes abbreviated during communication (e.g., when reporting in English), reload the task list file, the PRD file, and any other referenced documents using the Read tool before continuing work to ensure full context is maintained and no information is lost.