---
'lint-staged': patch
---

Partially staged changes are hidden in a uniquely-named patch file to avoid multiple invocations of _lint-staged_ overwriting it. This makes it safer to run _lint-staged_ in multiple worktrees at the same time.
