---
'lint-staged': patch
---

In the previous version the native `git rev-parse --show-toplevel` command was taken into use for resolving the current git repo root. This version switched the `--show-toplevel` flag with `--show-cdup`, because on Git installed via MSYS2 the former was returning absolute paths that do not work with Node.js `child_process`. The new flag returns a path relative to the working directory, avoiding the issue.

The GitHub Actions workflow has been updated to install Git via MSYS2, to ensure better future compatibility; using the default Git binary in the GitHub Actions runner was working correctly even with MSYS2.
