---
'lint-staged': minor
---

Added a new flag `--all` to make _lint-staged_ include all files tracked by Git, instead of only staged. Internally the `git ls-files` command is used, so running _lint-staged_ in a sub-directory of the repository will only include files inside that directory.
