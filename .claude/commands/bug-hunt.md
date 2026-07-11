---
description: Run the bug-hunter subagent over the current diff (or a specific area) to find logic bugs, dead code, and unused files before committing.
---

Launch the `bug-hunter` subagent (foreground) to review the current changes for bugs and cruft, per its instructions. If the user passed arguments ($ARGUMENTS), pass them along as the specific area/file to focus on; otherwise let it review `git diff`/`git status` as-is. Relay its findings back to the user as a concise report, split into Bugs and Cleanup — don't apply fixes unless the user asks.
