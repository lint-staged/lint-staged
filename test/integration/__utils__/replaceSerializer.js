export const replaceSerializer = (from, to) => ({
  test: (val) => typeof val === 'string' && from.test(val),
  print: (val) => val.replace(from, to),
})
