---
'lint-staged': patch
---

Ignore stdin of spawned commands so that they don't get stuck waiting. Until now, _lint-staged_ has used the default settings to spawn linter commands. This means the `stdin` of the spawned commands has accepted input, and essentially gotten stuck waiting. Now the `stdin` is ignored and commands will no longer get stuck. If you relied on this behavior, please open a new issue and describe how; the behavior has not been intended.
