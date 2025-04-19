---
'lint-staged': minor
---

A new flag `--add-all` has been introduced. By default when tasks modify staged files, _lint-staged_ only includes files which were originally staged when starting the commit. With this flags, all modifications are staged, including new modifications and those that were originally unstaged. This is equivalent to running `git add .` after all tasks.
