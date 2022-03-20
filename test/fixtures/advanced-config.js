module.exports = {
  '*.css': (filenames) => `echo ${filenames.join(' ')}`,
  '*.js': (filenames) => filenames.map((filename) => `echo ${filename}`),
}
