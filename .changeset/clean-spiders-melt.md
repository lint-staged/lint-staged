---
'lint-staged': minor
---

A new flag `--no-revert` has been introduced for when task modifications should be applied to the index before aborting the commit in case of errors. By default, _lint-staged_ will clear all task modifications and revert to the original state.
