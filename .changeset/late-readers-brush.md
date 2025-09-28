---
'lint-staged': patch
---

The backup stash will not be dropped when using `--fail-on-changes` and there are errors. When reverting to original state is disabled (via `--no-revert` or `--fail-on-changes`), hidden (partially) unstaged changes are still restored automatically so that it's easier to resolve the situation manually.

Additionally, the example for using the backup stash manually now uses the correct backup hash, if available:

```shell
% npx lint-staged --fail-on-changes
✔ Backed up original state in git stash (c18d55a3)
✔ Running tasks for staged files...
✖ Tasks modified files and --fail-on-changes was used!
↓ Cleaning up temporary files...

✖ lint-staged failed because `--fail-on-changes` was used.

Any lost modifications can be restored from a git stash:

  > git stash list --format="%h %s"
  c18d55a3 On main: lint-staged automatic backup
  > git apply --index c18d55a3
```
