#!/bin/sh

node_modules/.bin/staged-files '**/*.@(js|jsx)' -- node_modules/.bin/eslint
