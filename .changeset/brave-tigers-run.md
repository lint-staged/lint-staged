---
'lint-staged': minor
---

Add `--all` CLI option to run lint-staged on all git-tracked files instead of only staged files. This is useful for CI pipelines, one-time codebase reformatting, and validating that all files meet coding standards. The flag conflicts with `--diff` and `--diff-filter`, and automatically implies `--no-stash`.
