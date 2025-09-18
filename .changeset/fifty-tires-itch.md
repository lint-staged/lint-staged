---
'lint-staged': minor
---

Added a new option `--fail-on-changes` to make _lint-staged_ exit with code 1 when tasks modify any files, making the `precommit` hook fail. This is similar to the `git diff --exit-code` option. When combined with the `--no-revert` flag, this can be used to make the committer manually stage any task modifications, and attempt to commit again.

```shell
# Fail when tasks make changes to tracked files, forcing the committer to stage them manually
npx lint-staged --no-revert --fail-on-changes
```
