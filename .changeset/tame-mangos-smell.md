---
'lint-staged': minor
---

As a new feature, **all tracked files that were modified by tasks are now staged** and added to the commit. Previously _lint-staged_ simply ran `git add` for all originally staged files that were matched by the configured globs regardless if they were modified or not, but now `git add` is run for all tracked files that are different from before running the tasks. Pre-existing unstaged edits in files modified by tasks may also be staged. Use `--hide-unstaged` to hide those edits while tasks run.
