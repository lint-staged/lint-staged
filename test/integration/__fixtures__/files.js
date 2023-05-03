export const prettyJS = `module.exports = {
  foo: "bar",
};
`

export const prettyJSWithChanges = `module.exports = {
  foo: "bar",
  bar: "baz",
};
`

export const uglyJS = `module.exports = {
    'foo': 'bar'
}
`
export const uglyJSWithChanges = `module.exports = {
    'foo': 'bar',
    'bar': 'baz'
}
`

export const invalidJS = `const obj = {
    'foo': 'bar'
`
