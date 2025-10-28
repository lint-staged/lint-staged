---
'lint-staged': minor
---

Use a shared `AbortController` to kill tasks on failure/`SIGINT`, instead of passing default signals to tasks.
