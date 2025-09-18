---
'lint-staged': minor
---

Added a new option `--hide-unstaged` so that _lint-staged_ will hide all unstaged changes to tracked files before running tasks. The changes will be applied back after running the tasks. Note that the combination of flags `--hide-unstaged --no-hide-partially-staged` isn't meaningful and behaves the same as just `--hide-unstaged`.

Thanks to [@ItsNickBarry](https://github.com/ItsNickBarry) for the idea and initial implementation in [#1552](https://github.com/lint-staged/lint-staged/pull/1552).
