---
'lint-staged': minor
---

Remove [lilconfig](https://github.com/antonk52/lilconfig) to reduce reliance on third-party dependencies. It was used to find possible config files outside of those tracked in Git, including from the parent directories. This behavior has been moved directly into _lint-staged_ and should work about the same.
