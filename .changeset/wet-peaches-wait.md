---
'lint-staged': patch
---

Return the caret semver range (`^`) to direct dependencies so that future patch and minor versions are allowed. This enables projects to better maintain and deduplicate their own transitive dependencies while not requiring direct updates to _lint-staged_. This was changed in [16.2.0](https://github.com/lint-staged/lint-staged/releases/tag/v16.2.0) after the vulnerability issues with `chalk` and `debug`, which were also removed in the same version.

Given the recent vulnerabilities in the _npm_ ecosystem, it's best to be very careful when updating dependencies.
