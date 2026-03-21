---
'lint-staged': minor
---

Add new option `--hide-all` for hiding all unstaged changes and untracked files, before running tasks. This makes it easier to run tools like [Knip](https://knip.dev) which check for unused code. Untracked files are included in the backup stash and restored automatically after running.
