import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
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
          testTimeout: 10_000,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['test/integration/**/*.(test|spec).js'],
          testTimeout: 10_000,
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
