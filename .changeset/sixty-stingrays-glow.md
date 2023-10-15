---
'lint-staged': patch
---

Previously it was possible for a function task to mutate the list of staged files passed to the function, and accidentally affect the generation of other tasks. This is now fixed by passing a copy of the original file list instead.
