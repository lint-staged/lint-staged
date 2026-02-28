---
'lint-staged': major
---

The dependency `yaml` is now marked as optional and probably won't be installed by default. If you're using a YAML configuration file you should install the package separately:

```shell
npm install --development yaml
```

If you're using `.lintstagedrc` as the config file name (without a file extension), it will be treated as a YAML file. If the content is JSON, consider renaming it to `.lintstagedrc.json` to avoid needing to install `yaml`.
