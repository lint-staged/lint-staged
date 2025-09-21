---
'lint-staged': minor
---

Added a new option `--fail-on-changes` to make _lint-staged_ exit with code 1 when tasks modify any files, making the `precommit` hook fail. This is similar to the `git diff --exit-code` option. Using this flag also implies the `--no-revert` flag which means any changes made my tasks will be left in the working tree after failing, so that they can be manually staged and the commit tried again.
