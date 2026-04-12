---
'lint-staged': minor
---

_Lint-staged_ now runs `git update-index --again` after running tasks, instead of `git add <originally staged files>`. This should improve compatibility when using non-default indexes, for example when committing with a pathspec `git commit -m "message" .` instead of adding files to the index.
