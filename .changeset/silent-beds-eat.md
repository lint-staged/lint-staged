---
'lint-staged': patch
---

The behavior of the automatic backup stash has been improved when running _lint-staged_ in multiple worktrees in parallel. You should still avoid running multiple instances of _lint-staged_ in parallel in the same tree, because some of the Git operations are locking and might lead to data loss.
