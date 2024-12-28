---
'lint-staged': minor
---

Added more help messages around the automatic `git stash` that _lint-staged_ creates as a backup (by default). The console output also displays the short git _hash_ of the stash so that it's easier to recover lost files in case some fatal errors are encountered, or the process is killed before completing.

For example:

```
% npx lint-staged
✔ Backed up original state in git stash (20addf8)
✔ Running tasks for staged files...
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
```

where the backup can be seen with `git show 20addf8`, or `git stash list`:

```
% git stash list
stash@{0}: lint-staged automatic backup (20addf8)
```
