---
'lint-staged': patch
---

Fix issues with Git commands that are successful but also emit warnings to `stderr`, by ignoring the `stderr` output completely when the process exits with code 0. This was the behavior when using `nano-spawn` and `execa`, but when switching to `tinyexec` in 16.3.0 both `stdout` and `stderr` were used as interleaved output.
