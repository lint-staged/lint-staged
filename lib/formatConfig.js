const formatConfig = (config) => {
  if (typeof config === 'function') {
    return { '*': config }
  }

  return config
}

module.exports = formatConfig
