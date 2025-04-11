---
'lint-staged': patch
---

Improve listing of staged files so that _lint-staged_ doesn't crash when encountering an uninitialized submodule. This should result in less errors like:

```
✖ Failed to get staged files!
```
