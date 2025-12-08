# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Process

1.  **Receive Initial Prompt:** The user provides a brief description or request for a new feature or functionality.
2.  **Ask Clarifying Questions:** Before writing the PRD, the AI *must* ask clarifying questions to gather sufficient detail. The goal is to understand the "what" and "why" of the feature, not necessarily the "how" (which the developer will figure out). Make sure to provide options in letter/number lists so I can respond easily with my selections. **Use the AskUserQuestion tool** to present clarifying questions through Claude Code's interactive interface for efficient user input and decision-making.
3.  **Generate PRD:** Based on the initial prompt and the user's answers to the clarifying questions, generate a PRD using the structure outlined below.
4.  **Save PRD:** Save the generated document as `[n]-prd-[feature-name].md` inside the `/tasks` directory. (Where `n` is a zero-padded 4-digit sequence starting from 0001, e.g., `0001-prd-user-authentication.md`, `0002-prd-dashboard.md`, etc.)

## Clarifying Questions (Examples)

The AI should adapt its questions based on the prompt, but here are some common areas to explore:

*   **Problem/Goal:** "What problem does this feature solve for the user?" or "What is the main goal we want to achieve with this feature?"
*   **Target User:** "Who is the primary user of this feature?"
*   **Core Functionality:** "Can you describe the key actions a user should be able to perform with this feature?"
*   **User Stories:** "Could you provide a few user stories? (e.g., As a [type of user], I want to [perform an action] so that [benefit].)"
*   **Acceptance Criteria:** "How will we know when this feature is successfully implemented? What are the key success criteria?"
*   **Scope/Boundaries:** "Are there any specific things this feature *should not* do (non-goals)?"
*   **Data Requirements:** "What kind of data does this feature need to display or manipulate?"
*   **Design/UI:** "Are there any existing design mockups or UI guidelines to follow?" or "Can you describe the desired look and feel?"
*   **Edge Cases:** "Are there any potential edge cases or error conditions we should consider?"

## PRD Structure

The generated PRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2.  **Goals:** List the specific, measurable objectives for this feature.
3.  **User Stories:** Detail the user narratives describing feature usage and benefits.
4.  **Functional Requirements:** List the specific functionalities the feature must have. Use clear, concise language (e.g., "The system must allow users to upload a profile picture."). Number these requirements.
5.  **Non-Goals (Out of Scope):** Clearly state what this feature will *not* include to manage scope.
6.  **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
7.  **Technical Considerations (Optional):** Mention any known technical constraints, dependencies, or suggestions (e.g., "Should integrate with the existing Auth module").
8.  **Testing Requirements:** Define comprehensive testing expectations for the feature:
    *   **Unit Testing:** All implemented classes and functions must include unit tests using the programming language's native testing framework (e.g., Jest for JavaScript, pytest for Python, JUnit for Java). Each unit test suite must include a minimum of 3 test cases covering:
        *   **Happy Path:** Verify that the most common, expected scenarios work correctly as intended.
        *   **Boundary Conditions:** Test edge cases including minimum values, maximum values, empty inputs, null values, and other boundary scenarios.
        *   **Exception Cases:** Validate proper handling of invalid inputs, error conditions, and exceptional circumstances.
        *   **Side Effects:** Ensure test independence (tests do not affect each other) and that code does not impact global state or external systems unexpectedly.
    *   **System Testing:** Based on the user stories defined in this PRD, create and execute end-to-end system tests that:
        *   Test at least 2 realistic user scenarios representing normal feature usage.
        *   Use real data for validation (no hardcoded values or dummy data).
        *   Verify the complete user workflow from start to finish.
9.  **Success Metrics:** How will the success of this feature be measured? (e.g., "Increase user engagement by 10%", "Reduce support tickets related to X").
10. **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the PRD is a **junior developer**. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the feature's purpose and core logic.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/tasks/`
*   **Filename:** `[n]-prd-[feature-name].md`

## Language Policy

**IMPORTANT:** All PRD content must be written in Korean (한글) to ensure accessibility for the target audience of junior developers.

### Language Requirements:

1. **PRD Content Language:**
   - All section headings, descriptions, requirements, and narratives must be written in Korean
   - User stories, functional requirements, and all descriptive text must use Korean
   - Code examples and comments within the PRD must include Korean explanations

2. **Technical Terms:**
   - Common technical terms and abbreviations used in Korean development context may remain in English (e.g., API, HTTP, REST, JSON, URL, framework names, library names)
   - Programming language keywords and syntax remain in their original form
   - When in doubt, use the term as it would naturally appear in Korean technical documentation

3. **User Communication:**
   - All summaries and reports to the user must be in Korean
   - When reporting to users, include information about any markdown files that were created, modified, or deleted during the process

### Example:
- ✅ Correct: "사용자는 프로필 사진을 업로드할 수 있어야 합니다. (API endpoint: `/upload`)"
- ❌ Incorrect: "User must be able to upload profile picture."

## Final instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the PRD
4. **Context Preservation:** If context becomes abbreviated during communication (e.g., when reporting in English), reload this document and any referenced files using the Read tool before continuing work to ensure full context is maintained and no information is lost