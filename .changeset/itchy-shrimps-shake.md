---
'lint-staged': patch
---

In the previous version the native `git rev-parse --show-toplevel` command was taken into use for resolving the current git repo root. This version drops the `--path-format=absolute` option to support earlier git versions since it's also the default behavior.
