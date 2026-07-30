---
'lint-staged': patch
---

During an in-progress merge, files that are unchanged from the branch being merged are now skipped. Technically, files are only included if there are staged changes against both `HEAD` and `MERGE_HEAD`.
