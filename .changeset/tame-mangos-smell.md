---
'lint-staged': minor
---

_lint-staged_ now stages changes to **all tracked files modified by tasks**, including files that weren’t originally staged or didn’t match the configured globs. This can happen when your task has side-effects, or it's a function that ignores the staged files like `() => "prettier --write ."`.

If you have unstaged changes in a file and the task also edits that file, your unstaged changes will be staged too. Use `--hide-unstaged` to hide your changes while tasks run.
