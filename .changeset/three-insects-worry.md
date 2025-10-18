---
'lint-staged': patch
---

Fix unhandled promise rejection when spawning tasks (_instead of the tasks themselves failing_). Previously when a task failed to spawn, _lint-staged_ also failed and the backup stash might not have been automatically restored.
