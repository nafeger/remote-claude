# Tasks: Interactive Selection Mapping

## Overview

Implement numeric input mapping for Claude Code's interactive selection UI to enable Slack users to select options using numbers (1, 2, 3) instead of arrow keys.

**Based on:** Ultrathink analysis - Option A (Numeric Input Mapping)

**Problem:** Claude Code displays arrow-key-based selection UIs (e.g., "❯ 1. Yes / 2. Yes, allow all / 3. No") that cannot be controlled from Slack's text-only interface.

**Solution:** Parse selection UI, map numeric input (1-3) to arrow key sequences, and automatically send the appropriate keys to tmux.

## Current State Assessment

**Existing Infrastructure:**
- tmux-based Claude Code execution via `tmux send-keys`
- `sendKeys()` and `sendEnter()` already implemented in executor.ts
- `detectInteractivePrompt()` exists but only detects [y/n] patterns
- Type system in place (src/types/index.ts)

**Existing Patterns:**
- Interactive response handling for y/n inputs (orchestrator.ts:292-335)
- Output polling with stability detection (manager.ts:353-404)
- ANSI code removal and output parsing (parser.ts)

**Gaps:**
- No special key (Up/Down/Left/Right/Tab) sending capability
- No selection UI pattern detection
- No option parsing or position tracking
- No numeric input handling

## Relevant Files

- `src/tmux/executor.ts` - Low-level tmux command execution. Will add special key sending functions.
- `src/tmux/executor.test.ts` - Unit tests for executor functions.
- `src/tmux/parser.ts` - Output parsing and pattern detection. Will add selection UI detection and parsing.
- `src/tmux/parser.test.ts` - Unit tests for parser functions.
- `src/tmux/manager.ts` - High-level tmux operations manager. Will add numeric selection sending.
- `src/tmux/manager.test.ts` - Unit tests for manager methods.
- `src/types/index.ts` - Type definitions. Will add selection prompt types.
- `src/queue/orchestrator.ts` - Job orchestration and Slack integration. Will add selection handling logic.
- `src/queue/orchestrator.test.ts` - Unit tests for orchestrator methods.
- `src/index.ts` - Main application and message handlers. Will add numeric input detection.

### Notes

#### Testing Requirements

**Unit Testing:**
- Unit tests should be placed alongside code files (e.g., `executor.ts` and `executor.test.ts`).
- Use Jest as the testing framework (`npx jest [optional/path]`).
- Each test suite must include minimum 3 test cases:
  - **Happy Path:** Normal usage scenarios
  - **Boundary Conditions:** Edge cases (empty inputs, nulls, limits)
  - **Exception Cases:** Invalid inputs and error conditions
- Tests must be independent with no side effects.

**System Testing:**
- Test 2 realistic user scenarios with real data (no hardcoded/dummy values).
- Verify complete workflows from Slack message → tmux selection → Claude Code response.
- Validate integration of all components end-to-end.

## Tasks

- [ ] 1.0 Implement tmux special key sending capabilities
- [ ] 2.0 Implement selection UI detection and parsing logic
- [ ] 3.0 Implement numeric selection sending logic
- [ ] 4.0 Integrate orchestrator and message handling
- [ ] 5.0 System testing and validation
