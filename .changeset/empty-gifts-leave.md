---
'lint-staged': minor
---

Using the `--no-stash` flag no longer discards all unstaged changes to partially staged files, which resulted in inadvertent data loss. This fix is available with a new flag `--no-hide-partially-staged` that is automatically enabled when `--no-stash` is used.
