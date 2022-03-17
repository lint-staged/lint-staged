const getMainRendererOptions = ({ debug, quiet }, env) => {
  if (quiet) return { renderer: 'silent' }
  // Better support for dumb terminals: https://en.wikipedia.org/wiki/Computer_terminal#Dumb_terminals
  const isDumbTerminal = env.TERM === 'dumb'
  if (debug || isDumbTerminal || env.NODE_ENV === 'test') return { renderer: 'verbose' }
  return { renderer: 'update', rendererOptions: { dateFormat: false } }
}

const getFallbackRenderer = ({ renderer }, { FORCE_COLOR }) => {
  if (renderer === 'silent') {
    return 'silent'
  }

  // If colors are being forced, then also force non-fallback rendering
  if (Number(FORCE_COLOR) > 0) {
    return renderer
  }

  return 'verbose'
}

export const getRenderer = (options, env = process.env) => {
  const mainRendererOptions = getMainRendererOptions(options, env)
  return {
    ...mainRendererOptions,
    nonTTYRenderer: getFallbackRenderer(mainRendererOptions, env),
  }
}
