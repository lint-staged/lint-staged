---
'lint-staged': patch
---

Fix _lint-staged_ behavior when implicitly committing files without using `git add` by either:

- `git commit -am "my commit message"` where `-a` (`--all`) means to automatically stage all tracked modified and deleted files
- `git commit -m "my commit message ."` where `.` is an example of a [_pathspec_](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt-pathspec) where matching files will be staged
