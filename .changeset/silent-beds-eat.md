---
'lint-staged': patch
---

The automatic backup stash works better with concurrent invocations of _lint-staged_, for example in multiple worktrees. The dropping of the stash after running is still problematic, as Git only supports referencing a stash by its index (e.g. `git stash drop stash@{0}`).
