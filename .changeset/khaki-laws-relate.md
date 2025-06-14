---
'lint-staged': patch
---

When using `--diff-filter` with the `D` option to include deleted staged files, _lint-staged_ no longer tries to stage the deleted files, unless they're no longer deleted. Previously this caused an error from `git add` like `fatal: pathspec 'deleted-file' did not match any files`.
