# Repository Instructions

## Code Style

- Never add comments to source code.
- Do not add inline comments, block comments, documentation comments, or TODO comments.
- Keep source files as pure code and express intent through clear naming and structure.

## Commits and Pull Requests

- Never mention AI tools or agents in commits, pull requests, issues, or comments. This includes footers such as "Generated with Claude Code" and robot emoji signatures.
- Never add AI tools or agents as co-authors or collaborators. Do not use `Co-Authored-By` trailers for Claude, Codex, Copilot, or any other agent.
- Commits and pull requests are authored only by the human contributors.

## Android Work

- Android work follows the order and rules in `docs/ANDROID-PARITY.md`. Read it before picking up any issue labelled `platform: android`.
- Build only what iOS already does. Anything beyond parity needs its own issue.

## Frontend Structure

- Organize frontend code by product feature.
- Keep each feature's components, hooks, state, validation, and tests together.
- Do not create repository-wide folders grouped only by technical type, such as global `components`, `hooks`, or `utils` folders.
