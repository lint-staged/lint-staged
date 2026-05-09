---
'lint-staged': patch
---

Another fix for making sure _lint-staged_ adds task modifications correctly to the commit in the following cases:

- after editing `<file>` it is staged with `git add <file>`, and then committed with `git commit`
- after editing `<file>` it is committed with `git commit --all` without explicit `git add`
- after editing `<file>` it is committed with `git commit <pathspec>` without explicit `git add`

There's new test cases which actually setup the Git `pre_commit` hook to run _lint-staged_ and verify them. These issues started in **v17.0.0** when trying to improve support for committig without having explicitly staged files.
