#!/bin/sh

node_modules/.bin/staged-files '*.@(css|scss|less|styl)' -- node_modules/.bin/stylelint
