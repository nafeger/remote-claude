# Rule: Generating a Task List from a PRD

## Goal

To guide an AI assistant in creating a detailed, step-by-step task list in Markdown format based on an existing Product Requirements Document (PRD). The task list should guide a developer through implementation.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/tasks/`
- **Filename:** `tasks-[prd-file-name].md` (e.g., `tasks-0001-prd-user-profile-editing.md`)

## Process

1.  **Receive PRD Reference:** The user points the AI to a specific PRD file
2.  **Analyze PRD:** The AI reads and analyzes the functional requirements, user stories, and other sections of the specified PRD.
3.  **Assess Current State:** Review the existing codebase to understand existing infrastructre, architectural patterns and conventions. Also, identify any existing components or features that already exist and could be relevant to the PRD requirements. Then, identify existing related files, components, and utilities that can be leveraged or need modification.
4.  **Phase 1: Generate Parent Tasks:** Based on the PRD analysis and current state assessment, create the file and generate the main, high-level tasks required to implement the feature. Use your judgement on how many high-level tasks to use. It's likely to be about five tasks. Present these tasks to the user in the specified format (without sub-tasks yet). Inform the user: "I have generated the high-level tasks based on the PRD. Ready to generate the sub-tasks? Respond with 'Go' to proceed."
5.  **Wait for Confirmation:** Pause and wait for the user to respond with "Go". **Use the AskUserQuestion tool** if additional clarifications or decisions are needed from the user during this workflow.
6.  **Phase 2: Generate Sub-Tasks:** Once the user confirms, **reload the PRD file** using the Read tool to ensure full context is maintained. Then break down each parent task into smaller, actionable sub-tasks necessary to complete the parent task. Ensure sub-tasks logically follow from the parent task, cover the implementation details implied by the PRD, and consider existing codebase patterns where relevant without being constrained by them. **For each implementation task, generate corresponding testing sub-tasks:**
    *   **Unit Testing Sub-Tasks:** For every implementation sub-task that creates classes, functions, or modules, create a corresponding unit testing sub-task that includes writing minimum 3 test cases (happy path, boundary conditions, exception cases).
    *   **System Testing Sub-Tasks:** Based on the user stories in the PRD, create system testing sub-tasks that validate complete user workflows with real data (minimum 2 user scenarios).
7.  **Identify Relevant Files:** Based on the tasks and PRD, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
8.  **Generate Final Output:** Combine the parent tasks, sub-tasks, relevant files, and notes into the final Markdown structure.
9.  **Save Task List:** Save the generated document in the `/tasks/` directory with the filename `tasks-[prd-file-name].md`, where `[prd-file-name]` matches the base name of the input PRD file (e.g., if the input was `0001-prd-user-profile-editing.md`, the output is `tasks-0001-prd-user-profile-editing.md`).

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- `path/to/potential/file1.ts` - Brief description of why this file is relevant (e.g., Contains the main component for this feature).
- `path/to/file1.test.ts` - Unit tests for `file1.ts`.
- `path/to/another/file.tsx` - Brief description (e.g., API route handler for data submission).
- `path/to/another/file.test.tsx` - Unit tests for `another/file.tsx`.
- `lib/utils/helpers.ts` - Brief description (e.g., Utility functions needed for calculations).
- `lib/utils/helpers.test.ts` - Unit tests for `helpers.ts`.

### Notes

#### Testing Requirements

**Unit Testing:**
- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- All implementations must use the programming language's native testing framework (e.g., Jest for JavaScript/TypeScript, pytest for Python, JUnit for Java, RSpec for Ruby).
- Each unit test suite must include a minimum of 3 test cases covering:
  - **Happy Path:** Test the most common, expected usage scenarios to verify correct behavior.
  - **Boundary Conditions:** Test edge cases including minimum values, maximum values, empty inputs, null values, and limit conditions.
  - **Exception Cases:** Test invalid inputs, error conditions, and exceptional circumstances to ensure proper error handling.
  - **Side Effects:** Ensure tests are independent (no interference between tests) and do not impact global state or external systems.
- Use `npx jest [optional/path/to/test/file]` to run Jest tests. Running without a path executes all tests found by the Jest configuration. Adjust the command based on the project's testing framework.

**System Testing:**
- Create system tests based on the user stories defined in the PRD.
- Test at least 2 realistic user scenarios representing normal feature usage.
- **Must use real data for validation** - no hardcoded values or dummy data allowed.
- Verify complete user workflows from start to finish.
- System tests should validate the integration of all components and the feature's end-to-end functionality.

## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 [Sub-task description 1.1]
  - [ ] 1.2 [Sub-task description 1.2]
- [ ] 2.0 Parent Task Title
  - [ ] 2.1 [Sub-task description 2.1]
- [ ] 3.0 Parent Task Title (may not require sub-tasks if purely structural or configuration)
```

## Language Policy

**IMPORTANT:** All task list content must be written in Korean (한글) to ensure clarity and accessibility for junior developers implementing the features.

### Language Requirements:

1. **Task Content Language:**
   - All parent task titles and descriptions must be written in Korean
   - All sub-task descriptions must be written in Korean
   - File descriptions in the "Relevant Files" section must be written in Korean
   - All content in the "Notes" section must be written in Korean

2. **Technical Terms:**
   - Common technical terms and abbreviations used in Korean development context may remain in English (e.g., API, HTTP, component names, function names, file extensions)
   - File paths and code identifiers remain in their original form
   - Framework and library names remain in English
   - When in doubt, use the term as it would naturally appear in Korean technical documentation

3. **User Communication:**
   - All progress reports and summaries to the user must be in Korean
   - When reporting to users, include information about any markdown files that were created, modified, or deleted during the task generation process

### Example:
- ✅ Correct: "- [ ] 1.1 사용자 인증 API endpoint 구현 (`/api/auth/login`)"
- ❌ Incorrect: "- [ ] 1.1 Implement user authentication API endpoint"

## Interaction Model

The process explicitly requires a pause after generating parent tasks to get user confirmation ("Go") before proceeding to generate the detailed sub-tasks. This ensures the high-level plan aligns with user expectations before diving into details.

**Context Preservation:** If context becomes abbreviated during communication (e.g., when reporting in English), reload the PRD file and the task list file using the Read tool before continuing work to ensure full context is maintained and no information is lost.

## Target Audience

Assume the primary reader of the task list is a **junior developer** who will implement the feature with awareness of the existing codebase context.
