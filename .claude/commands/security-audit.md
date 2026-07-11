---
description: Run the security-auditor subagent over the current diff (or a specific area) to check for vulnerabilities before committing.
---

Launch the `security-auditor` subagent (foreground) to audit the current changes for security issues, per its instructions. If the user passed arguments ($ARGUMENTS), pass them along as the specific area/file to focus on; otherwise let it review `git diff`/`git status` as-is. Relay its findings back to the user as a concise report — don't apply fixes unless the user asks.
