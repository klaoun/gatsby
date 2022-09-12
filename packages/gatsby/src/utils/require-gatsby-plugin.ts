const pluginModuleCache = new Map<string, any>()

export function setGatsbyPluginCache(
  plugin: { name: string; resolve: string },
  module: string,
  moduleObject: any
): void {
  const key = `${plugin.name}/${module}`
  pluginModuleCache.set(key, moduleObject)
}

export function requireGatsbyPlugin(
  plugin: {
    name: string
    resolve: string
    resolvedCompiledGatsbyNode?: string
  },
  module: string
): any {
  const key = `${plugin.name}/${module}`

  const pluginModule = require(module === `gatsby-node` &&
    plugin.resolvedCompiledGatsbyNode
    ? plugin.resolvedCompiledGatsbyNode
    : `${plugin.resolve}/${module}`)
  return pluginModule
}
