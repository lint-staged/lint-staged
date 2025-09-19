import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      experimentalAstAwareRemapping: true,
      include: ['lib/**/*.js'],
      provider: 'v8',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
      watermarks: {
        branches: [90, 100],
        functions: [90, 100],
        lines: [90, 100],
        statements: [90, 100],
      },
    },
    projects: [
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.(test|spec).js'],
          testTimeout: 20_000, // Windows in GitHub Actions...
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.(test|spec).js'],
          testTimeout: 20_000, // Windows in GitHub Actions...
        },
      },
      {
        test: {
          name: 'types',
          include: ['test/types/index.(test|spec).ts'],
          testTimeout: 5_000,
          typecheck: {
            enabled: true,
            include: ['test/types/index.(test|spec).ts'],
          },
        },
      },
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.(test|spec).js'],
          testTimeout: 5_000,
        },
      },
    ],
  },
})
