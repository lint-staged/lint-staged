---
'lint-staged': minor
---

Added a new option `--fail-on-changes` to make _lint-staged_ exit with code 1 when tasks modify any files, making the `precommit` hook fail. This is in line with the `git diff --fail-on-changes` option. When combined with the `--no-revert` flag, this can be used to make the committer manually stage any task modifications, and attempt to commit again.

```shell
# Fail when tasks modify files, forcing the committer to stage them manually
npx lint-staged --no-revert --fail-on-changes
```
