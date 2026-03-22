---
'lint-staged': patch
---

Remove manual handling for `git stash --keep-index` resurrecting deleted files, because the issue was fixed in Git `2.23.0` and _lint-staged_ requires at least Git `2.32.0`.
