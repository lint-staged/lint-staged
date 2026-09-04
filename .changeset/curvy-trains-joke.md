---
'lint-staged': minor
---

_Lint-staged_ now refuses to run when files were staged with `--intent-to-add`, because Git stash doesn't support them. Previously this was an unhandled error.
