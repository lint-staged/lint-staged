---
'lint-staged': minor
---

As a new feature, **all tracked files that were modified by tasks are now staged** and added to the commit. Previously _lint-staged_ simply run `git add` for all originally staged files regardless if they were modified or not, but now `git add` is ran for tracked files that are different from before running the tasks. Note that this does not include possible new, untracked files that were created by tasks, because Git doesn't know about them.
