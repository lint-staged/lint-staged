---
'lint-staged': minor
---

Remove `pidtree` as a dependency. When a task fails, its sub-processes are killed more efficiently via the process group on Unix systems, and the `taskkill` command on Windows.
