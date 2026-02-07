---
'lint-staged': minor
---

Run external processes with [`tinyexec`](https://github.com/tinylibs/tinyexec) instead of [`nano-spawn`](https://github.com/sindresorhus/nano-spawn). `nano-spawn` replaced [`execa`](https://github.com/sindresorhus/execa) in _lint-staged_ version 16 to limit the amount of npm dependencies required, but caused some unknown issues related to spawning tasks. Let's hope `tinyexec` improves the situation.
