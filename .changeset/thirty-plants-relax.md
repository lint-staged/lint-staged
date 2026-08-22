---
'lint-staged': minor
---

Added a new flag `--all` to make _lint-staged_ include all files tracked by Git, instead of only staged.

By default _lint-staged_ only runs tasks on files that include staged changes (hence the name). Use this flag to include all files tracked in Git version control (standard exclusions apply). Using this flag implies the `--no-stash` flag, disabling the automatic backup, and the `--allow-empty` flag so that _lint-staged_ doesn't fail when there are no changes after running. This makes it easier to run `npx lint-staged --all` on a clean state, for example in CI.
