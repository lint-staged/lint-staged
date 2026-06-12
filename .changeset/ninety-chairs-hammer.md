---
'lint-staged': patch
---

Fix _lint-staged_ discarding the ongoing merge conflict status (`.git/MERGE_HEAD`) when using the `--hide-unstaged` or `--hide-all` options.
