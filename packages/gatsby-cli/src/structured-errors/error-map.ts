import { stripIndent, stripIndents } from "common-tags"
import {
  IOptionalGraphQLInfoContext,
  Level,
  Type,
  ErrorCategory,
} from "./types"

const optionalGraphQLInfo = (context: IOptionalGraphQLInfoContext): string =>
  `${context.codeFrame ? `\n\n${context.codeFrame}` : ``}${
    context.filePath ? `\n\nFile path: ${context.filePath}` : ``
  }${context.urlPath ? `\nUrl path: ${context.urlPath}` : ``}${
    context.plugin ? `\nPlugin: ${context.plugin}` : ``
  }`

const getSharedNodeManifestWarning = (inputManifest: {
  manifestId: string
  node: { id: string }
  pluginName: string
}): string =>
  `Plugin ${inputManifest.pluginName} called unstable_createNodeManifest() for node id "${inputManifest.node.id}" with a manifest id of "${inputManifest.manifestId}"`

const errors: Record<string, IErrorMapEntry> = {
  "": {
    text: (context): string => {
      const sourceMessage =
        context && context.sourceMessage
          ? context.sourceMessage
          : `There was an unhandled error and we could not retrieve more information. Please run the command with the --verbose flag again.`
      return sourceMessage
    },
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
    type: Type.UNKNOWN,
  },
  "95312": {
    text: (context): string =>
      `"${context.undefinedGlobal}" is not available during server-side rendering. Enable "DEV_SSR" to debug this during "gatsby develop".`,
    level: Level.ERROR,
    docsUrl: `https://gatsby.dev/debug-html`,
    category: ErrorCategory.USER,
    type: Type.HTML_COMPILATION,
  },
  "95313": {
    text: (context): string =>
      `Building static HTML failed${
        context.errorPath ? ` for path "${context.errorPath}"` : ``
      }`,
    level: Level.ERROR,
    docsUrl: `https://gatsby.dev/debug-html`,
    category: ErrorCategory.UNKNOWN,
    type: Type.HTML_COMPILATION,
  },
  "95314": {
    text: (context): string => context.errorMessage,
    level: Level.ERROR,
    docsUrl: `https://gatsby.dev/debug-html`,
    type: Type.HTML_COMPILATION,
    category: ErrorCategory.UNKNOWN,
  },
  "95315": {
    text: (context): string =>
      `Error in getServerData in ${context.pagePath} / "${context.potentialPagePath}".`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.ENGINE_EXECUTION,
  },
  "98001": {
    text: (): string =>
      `Built Rendering Engines failed validation.\n\nPlease open an issue with a reproduction at https://gatsby.dev/new-issue for more help.`,
    type: Type.ENGINE_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
  },
  "98011": {
    text: (context): string =>
      `Rendering Engines attempted to use unsupported "${
        context.package
      }" package${
        context.importedBy ? ` (imported by "${context.importedBy}")` : ``
      }${context.advisory ? `\n\n${context.advisory}` : ``}`,
    type: Type.ENGINE_COMPILATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "98123": {
    text: (context): string =>
      `${context.stageLabel} failed\n\n${
        context.sourceMessage ?? context.message
      }`,
    type: (context): `${Type}` =>
      `WEBPACK.${
        context.stage.toUpperCase() as
          | `DEVELOP`
          | `DEVELOP-HTML`
          | `BUILD-JAVASCRIPT`
          | `BUILD-HTML`
      }`,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
  },
  "98124": {
    text: (context): string => {
      let message = `${context.stageLabel} failed\n\n${context.sourceMessage}\n\nIf you're trying to use a package make sure that '${context.packageName}' is installed. If you're trying to use a local file make sure that the path is correct.`

      if (context.deprecationReason) {
        message += `\n\n${context.deprecationReason}`
      }

      return message
    },
    type: (context): `${Type}` =>
      `WEBPACK.${
        context.stage.toUpperCase() as
          | `DEVELOP`
          | `DEVELOP-HTML`
          | `BUILD-JAVASCRIPT`
          | `BUILD-HTML`
      }`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85901": {
    text: (context): string =>
      stripIndent(`
        There was an error in your GraphQL query:\n\n${
          context.sourceMessage
        }${optionalGraphQLInfo(context)}`),
    type: Type.GRAPHQL_UNKNOWN,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85908": {
    text: (context): string => {
      const closestFragment = context.closestFragment
        ? `\n\nDid you mean to use ` + `"${context.closestFragment}"?`
        : ``

      return `There was an error in your GraphQL query:\n\nThe fragment "${context.fragmentName}" does not exist.\n\n${context.codeFrame}${closestFragment}`
    },
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85910": {
    text: (context): string =>
      stripIndents(`
        Multiple "root" queries found: "${context.name}" and "${context.otherName}".
        Only the first ("${context.otherName}") will be registered.

        Instead of:

        ${context.beforeCodeFrame}

        Do:

        ${context.afterCodeFrame}

        This can happen when you use two page/static queries in one file. Please combine those into one query.
        If you're defining multiple components (each with a static query) in one file, you'll need to move each component to its own file.
      `),
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    docsUrl: `https://www.gatsbyjs.com/docs/how-to/querying-data/`,
    category: ErrorCategory.USER,
  },
  "85911": {
    text: (context): string =>
      stripIndent(`
        There was a problem parsing "${context.filePath}"; any GraphQL
        fragments or queries in this file were not processed.

        This may indicate a syntax error in the code, or it may be a file type
        that Gatsby does not know how to parse.
      `),
    type: Type.GRAPHQL_EXTRACTION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85912": {
    text: (context): string =>
      `Failed to parse preprocessed file ${context.filePath}`,
    type: Type.GRAPHQL_EXTRACTION,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
  },
  "85913": {
    text: (context): string =>
      `There was a problem reading the file: ${context.filePath}`,
    type: Type.GRAPHQL_EXTRACTION,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
  },
  // default parsing error
  "85915": {
    text: (context): string =>
      `There was a problem parsing the GraphQL query in file: ${context.filePath}`,
    type: Type.GRAPHQL_EXTRACTION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85916": {
    text: (context): string =>
      `String interpolation is not allowed in graphql tag:\n\n${context.codeFrame}`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85917": {
    text: (context): string =>
      `Unexpected empty graphql tag${
        context.codeFrame ? `\n\n${context.codeFrame}` : ``
      }`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85918": {
    text: (context): string =>
      stripIndent(`
        GraphQL syntax error in query:\n\n${context.sourceMessage}${
        context.codeFrame ? `\n\n${context.codeFrame}` : ``
      }`),
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  // Duplicate fragment
  "85919": {
    text: (context): string =>
      stripIndent(`
      Found two different GraphQL fragments with identical name "${context.fragmentName}". Fragment names must be unique

      File: ${context.leftFragment.filePath}
      ${context.leftFragment.codeFrame}

      File: ${context.rightFragment.filePath}
      ${context.rightFragment.codeFrame}
    `),
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  // Undefined variables in Queries
  "85920": {
    text: (context): string => {
      const staticQueryMessage = stripIndents(`Suggestion 1:

      If you're not using a page query but useStaticQuery you see this error because it doesn't support variables. To learn more about the limitations: https://gatsby.dev/use-static-query`)

      const generalMessage = stripIndents(`Suggestion 2:

      You might have a typo in the variable name "${context.variableName}" or you didn't provide the variable via context to this page query. Learn how to add data to context: https://gatsby.dev/graphql-variables-how-to`)

      return stripIndent(`
        There was an error in your GraphQL query:\n\n${
          context.sourceMessage
        }${optionalGraphQLInfo(
        context
      )}\n\n${staticQueryMessage}\n\n${generalMessage}`)
    },
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85921": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${context.sourceMessage}\n\nIf you're e.g. filtering for specific nodes make sure that you choose the correct field (that has the same type "${context.inputType}") or adjust the context variable to the type "${context.expectedType}".`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85922": {
    text: (context): string =>
      `There was an error in your GraphQL query:

      ${context.sourceMessage}

      This can happen if you e.g. accidentally added { } to the field "${context.fieldName}". If you didn't expect "${context.fieldName}" to be of type "${context.fieldType}" make sure that your input source and/or plugin is correct.
      However, if you expect "${context.fieldName}" to exist, the field might be accessible in another subfield. Please try your query in GraphiQL.

      It is recommended to explicitly type your GraphQL schema if you want to use optional fields.`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    docsUrl: `https://gatsby.dev/creating-type-definitions`,
  },
  "85923": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${context.sourceMessage}\n\nIf you don't expect "${context.field}" to exist on the type "${context.type}" it is most likely a typo. However, if you expect "${context.field}" to exist there are a couple of solutions to common problems:\n\n- If you added a new data source and/or changed something inside gatsby-node/gatsby-config, please try a restart of your development server.\n- You want to optionally use your field "${context.field}" and right now it is not used anywhere.\n\nIt is recommended to explicitly type your GraphQL schema if you want to use optional fields.`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    docsUrl: `https://gatsby.dev/creating-type-definitions`,
  },
  "85924": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${
        context.sourceMessage
      }\n\nThis can happen when you or a plugin/theme explicitly defined the GraphQL schema for this GraphQL object type via the schema customization API and "${
        context.value
      }" doesn't match the (scalar) type of "${
        context.type
      }".${optionalGraphQLInfo(context)}`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85925": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${
        context.sourceMessage
      }\n\nThe field "${
        context.field
      }" was explicitly defined as non-nullable via the schema customization API (by yourself or a plugin/theme). This means that this field is not optional and you have to define a value. If this is not your desired behavior and you defined the schema yourself, go to "createTypes" in gatsby-node.${optionalGraphQLInfo(
        context
      )}`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    docsUrl: `https://gatsby.dev/creating-type-definitions`,
  },
  "85926": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${context.sourceMessage}\n\nThis can happen when you use graphql\`{ ...yourQuery }\` instead of graphql(\`{ ...yourQuery }\`) inside gatsby-node\n\nYou can't use the template literal function you're used to (from page queries) and rather have to call graphql() as a normal function.`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85927": {
    text: (context): string =>
      `There was an error in your GraphQL query:\n\n${context.sourceMessage}\n\nSee if "${context.variable}" has a typo or ${context.operation} doesn't actually require this variable.`,
    type: Type.GRAPHQL_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "85928": {
    text: (): string =>
      `An error occurred during parallel query running.\nGo here for troubleshooting tips: https://gatsby.dev/pqr-feedback`,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
    type: Type.GRAPHQL_QUERY_RUNNING,
  },
  "85929": {
    text: (context): string =>
      `The "${context.exportName}" export must be async when using it with graphql:\n\n${context.codeFrame}`,
    type: Type.GRAPHQL_EXTRACTION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  // Config errors
  "10122": {
    text: (context): string =>
      `The site's gatsby-config failed validation:\n\n${context.sourceMessage}`,
    type: Type.API_CONFIG_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10123": {
    text: (context): string =>
      `We encountered an error while trying to load your site's ${context.configName}. Please fix the error and try again.`,
    type: Type.API_CONFIG_LOADING,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10124": {
    text: (context): string =>
      `It looks like you were trying to add the config file? Please rename "${
        context.nearMatch
      }" to "${context.configName}.${context.isTSX ? `ts` : `js`}"`,
    type: Type.API_CONFIG_LOADING,
    // TODO: Make this a warning? Needs to be also changed where this error is called + tests
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10125": {
    text: (context): string =>
      `Your ${context.configName} file is in the wrong place. You've placed it in the src/ directory. It must instead be at the root of your site next to your package.json file.`,
    type: Type.API_CONFIG_LOADING,
    // TODO: Make this a warning? Needs to be also changed where this error is called + tests
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10126": {
    text: (context): string =>
      `${context.path}/${context.configName} cannot export a function.` +
      `\n\nA ${context.configName} exported as a function can only be used as a theme and not run directly.` +
      `\nIf you are trying to run a theme directly, use the theme in an example site or starter instead and run that site to test.` +
      `\nIf you are in the root gatsby-config for your site, change the export to be an object and not a function as functions` +
      `\nare not supported in the root gatsby-config.`,
    type: Type.API_CONFIG_LOADING,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10127": {
    text: (context): string =>
      `Your "${context.configName}.ts" file failed to compile to "${context.configName}.js". Please run "gatsby clean" and try again.\n\nIf the issue persists, please open an issue with a reproduction at https://gatsby.dev/new-issue for more help."`,
    type: Type.API_TYPESCRIPT_COMPILATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10128": {
    text: (context): string =>
      `It looks like you were trying to add the gatsby-node file? Please rename "${
        context.nearMatch
      }" to "${context.configName}.${context.isTSX ? `ts` : `js`}"`,
    type: Type.API_CONFIG_LOADING,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "10226": {
    text: (context): string =>
      [
        `Couldn't find the "${context.themeName}" plugin declared in "${context.configFilePath}".`,
        context.pathToLocalTheme &&
          `Tried looking for a local plugin in ${context.pathToLocalTheme}.`,
        `Tried looking for an installed package in the following paths:\n${context.nodeResolutionPaths
          .map(potentialLocationPath => ` - ${potentialLocationPath}`)
          .join(`\n`)}`,
      ]
        .filter(Boolean)
        .join(`\n\n`),
    type: Type.API_CONFIG_LOADING,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  // Plugin errors
  "11321": {
    text: (context): string =>
      `"${context.pluginName}" threw an error while running the ${
        context.api
      } lifecycle:\n\n${
        context.sourceMessage ?? context.message
      }${optionalGraphQLInfo(context)}`,
    type: Type.API_NODE_EXECUTION,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
  },
  "11322": {
    text: (context): string =>
      `${
        context.pluginName
      } created a page and didn't pass the path to the component.\n\nThe page object passed to createPage:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    type: Type.API_NODE_VALIDATION,
    category: ErrorCategory.USER,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11323": {
    text: (context): string =>
      `${
        context.pluginName
      } must set the page path when creating a page.\n\nThe page object passed to createPage:\n${JSON.stringify(
        context.pageObject,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11324": {
    text: (context): string =>
      `Error while creating your page:\n\n${context.message}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11325": {
    text: (context): string =>
      `${
        context.pluginName
      } created a page with a component that doesn't exist.\n\nThe path to the missing component is "${
        context.componentPath
      }"\n\nThe page object passed to createPage:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11326": {
    text: (context): string =>
      `${
        context.pluginName
      } must set the absolute path to the page component when creating a page.\n\nThe (relative) path you used for the component is "${
        context.componentPath
      }"\n\nYou can convert a relative path to an absolute path by requiring the path module and calling path.resolve() e.g.\n\nconst path = require("path")\npath.resolve("${
        context.componentPath
      }")\n\nThe page object passed to createPage:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11327": {
    text: (context): string =>
      `An empty file "${context.componentPath}" was found during page creation. Please remove it or make it a valid component.`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  "11328": {
    text: (context): string =>
      `${context.pluginName} created a page without a valid default export.\n\nThe path to the page is "${context.componentPath}". If your page is a named export, please use "export default" instead.`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createPage`,
  },
  // invalid or deprecated APIs
  "11329": {
    text: (context): string =>
      [
        stripIndent(`
          Your plugins must export known APIs from their gatsby-${context.exportType}.

          See https://www.gatsbyjs.com/docs/reference/config-files/gatsby-${context.exportType}/ for the list of Gatsby ${context.exportType} APIs.
        `),
      ]
        .concat([``].concat(context.errors))
        .concat(
          context.fixes.length > 0
            ? [
                ``,
                `Some of the following may help fix the error(s):`,
                ``,
                ...context.fixes.map(fix => `- ${fix}`),
              ]
            : []
        )
        .join(`\n`),
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  // "X" is not defined in Gatsby's node APIs
  "11330": {
    text: (context): string =>
      `"${context.pluginName}" threw an error while running the ${
        context.api
      } lifecycle:\n\n${context.sourceMessage ?? context.message}\n\n${
        context.codeFrame
      }\n\nMake sure that you don't have a typo somewhere and use valid arguments in ${
        context.api
      } lifecycle.\nLearn more about ${
        context.api
      } here: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/#${
        context.api
      }`,
    type: Type.API_NODE_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  // Invalid plugin options
  "11331": {
    text: (context): string =>
      [
        stripIndent(`
          Invalid plugin options for "${context.pluginName}"${
          context.configDir ? `, configured by ${context.configDir}` : ``
        }:
        `),
      ]
        .concat([``])
        .concat(
          context.validationErrors.map(error => `- ${error.message}`).join(`\n`)
        )
        .join(`\n`),
    type: Type.API_NODE_VALIDATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
  },
  "11332": {
    text: (): string =>
      `Failed to compile Gatsby Functions. See the error below for more details.\nNote: The src/api folder is a reserved folder for Gatsby Functions and can't be used for any other files.`,
    type: Type.FUNCTIONS_COMPILATION,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/functions/`,
  },
  // slices
  "11333": {
    text: (context): string =>
      `${
        context.pluginName
      } created a slice and didn't pass the path to the component.\n\nThe slice object passed to createSlice:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11334": {
    text: (context): string =>
      `${
        context.pluginName
      } must set the slice id when creating a slice.\n\nThe slice object passed to createSlice:\n${JSON.stringify(
        context.sliceObject,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11335": {
    text: (context): string =>
      `${
        context.pluginName
      } must set the absolute path to the slice component when creating a slice.\n\nThe (relative) path you used for the component is "${
        context.componentPath
      }"\n\nYou can convert a relative path to an absolute path by requiring the path module and calling path.resolve() e.g.\n\nconst path = require("path")\npath.resolve("${
        context.componentPath
      }")\n\nThe object passed to createSlice:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11336": {
    text: (context): string =>
      `${
        context.pluginName
      } created a slice with a component that doesn't exist.\n\nThe path to the missing component is "${
        context.componentPath
      }"\n\nThe slice object passed to createSlice:\n${JSON.stringify(
        context.input,
        null,
        4
      )}`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11337": {
    text: (context): string =>
      `An empty file "${context.componentPath}" was found during slice creation. Please remove it or make it a valid component.`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11338": {
    text: (context): string =>
      `${context.pluginName} created a slice component without a valid default export.\n\nThe path to the component is "${context.componentPath}". If your component is a named export, please use "export default" instead.`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11339": {
    text: (context): string =>
      [
        `Building static HTML failed for slice "${context.sliceName}".`,
        `Slice metadata: ${JSON.stringify(context?.sliceData || {}, null, 2)}`,
        `Slice props: ${JSON.stringify(context?.sliceProps || {}, null, 2)}`,
      ]
        .filter(Boolean)
        .join(`\n\n`),
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.HTML_COMPILATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  "11340": {
    text: (context): string =>
      [
        `Building static HTML failed for slice "${context.sliceName}".`,
        `"${context.undefinedGlobal}" is not available during server-side rendering. Enable "DEV_SSR" to debug this during "gatsby develop".`,
      ]
        .filter(Boolean)
        .join(`\n\n`),
    level: Level.ERROR,
    category: ErrorCategory.USER,
    type: Type.HTML_COMPILATION,
    docsUrl: `https://gatsbyjs.com/docs/reference/config-files/actions#createSlice`,
  },
  // node object didn't pass validation
  "11467": {
    text: (context): string =>
      [
        `The new node didn't pass validation: ${context.validationErrorMessage}`,
        `Failing node:`,
        JSON.stringify(context.node, null, 4),
        `Note: there might be more nodes that failed validation. Output is limited to one node per type of validation failure to limit terminal spam.`,
        context.codeFrame,
      ]
        .filter(Boolean)
        .join(`\n\n`),
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
    type: Type.API_NODE_VALIDATION,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/config-files/actions#createNode`,
  },
  // local SSL certificate errors
  "11521": {
    text: (): string =>
      `for custom ssl --https, --cert-file, and --key-file must be used together`,
    level: Level.ERROR,
    docsUrl: `https://www.gatsbyjs.com/docs/local-https#custom-key-and-certificate-files`,
    category: ErrorCategory.USER,
    type: Type.CLI_VALIDATION,
  },
  "11522": {
    text: (): string => `Failed to generate dev SSL certificate`,
    level: Level.ERROR,
    category: ErrorCategory.THIRD_PARTY,
    docsUrl: `https://www.gatsbyjs.com/docs/local-https#setup`,
    type: Type.CLI_VALIDATION,
  },
  // cli new command errors
  "11610": {
    text: (context): string =>
      `It looks like you gave wrong argument orders. Try running instead "gatsby new ${context.starter} ${context.rootPath}"`,
    level: Level.ERROR,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/gatsby-cli#new`,
    category: ErrorCategory.USER,
    type: Type.CLI_VALIDATION,
  },
  "11611": {
    text: (context): string =>
      `It looks like you passed a URL to your project name. Try running instead "gatsby new new-gatsby-project ${context.rootPath}"`,
    level: Level.ERROR,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/gatsby-cli#new`,
    category: ErrorCategory.USER,
    type: Type.CLI_VALIDATION,
  },
  "11612": {
    text: (context): string =>
      `Could not create a project in "${context.path}" because it's not a valid path`,
    level: Level.ERROR,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/gatsby-cli#new`,
    category: ErrorCategory.USER,
    type: Type.CLI_VALIDATION,
  },
  "11613": {
    text: (context): string =>
      `Directory ${context.rootPath} is already an npm project`,
    level: Level.ERROR,
    category: ErrorCategory.USER,
    docsUrl: `https://www.gatsbyjs.com/docs/reference/gatsby-cli#new`,
    type: Type.CLI_VALIDATION,
  },
  "11614": {
    text: (context): string =>
      stripIndent(`
        The path "${context.path}" errored during SSR.
        Edit its component ${context.filePath}${
        context.line ? `:${context.line}:${context.column}` : ``
      } to resolve the error.`),
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.HTML_GENERATION_DEV_SSR,
  },
  "11615": {
    text: (context): string =>
      stripIndent(`
        There was an error while trying to load dev-404-page:
        ${context.sourceMessage}`),
    level: Level.ERROR,
    category: ErrorCategory.SYSTEM,
    type: Type.HTML_GENERATION_DEV_SSR,
  },
  "11616": {
    text: (context): string =>
      stripIndent(`
        There was an error while trying to create the client-only shell for displaying SSR errors:
        ${context.sourceMessage}`),
    level: Level.ERROR,
    category: ErrorCategory.SYSTEM,
    type: Type.HTML_GENERATION_DEV_SSR,
  },
  // Watchdog
  "11701": {
    text: (context): string =>
      `Terminating the process (due to GATSBY_WATCHDOG_STUCK_STATUS_TIMEOUT):\n\nGatsby is in "${
        context.status
      }" state without any updates for ${(
        context.stuckStatusWatchdogTimeoutDelay / 1000
      ).toFixed(
        3
      )} seconds. Activities preventing Gatsby from transitioning to idle state:\n\n${
        context.stuckStatusDiagnosticMessage
      }${context.additionalOutput}`,
    level: Level.ERROR,
    category: ErrorCategory.UNKNOWN,
    type: Type.UNKNOWN,
    docsUrl: `https://support.gatsbyjs.com/hc/en-us/articles/360056811354`,
  },
  // Node Manifest warnings
  "11801": {
    text: ({ inputManifest }): string => `${getSharedNodeManifestWarning(
      inputManifest
    )} but Gatsby couldn't find a page for this node.
      If you want a manifest to be created for this node (for previews or other purposes), ensure that a page was created (and that a ownerNodeId is added to createPage() if you're not using the Filesystem Route API). See https://www.gatsbyjs.com/docs/conceptual/content-sync for more info.\n`,
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  "11802": {
    text: ({ inputManifest, pagePath }): string =>
      `${getSharedNodeManifestWarning(
        inputManifest
      )} but Gatsby didn't find an ownerNodeId for the page at ${pagePath}\nUsing the first page that was found with the node manifest id set in pageContext.id in createPage().\nThis may result in an inaccurate node manifest (for previews or other purposes). See https://www.gatsbyjs.com/docs/conceptual/content-sync for more info.`,
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  "11805": {
    text: ({ inputManifest, pagePath }): string =>
      `${getSharedNodeManifestWarning(
        inputManifest
      )} but Gatsby didn't find an ownerNodeId for the page at ${pagePath}\nUsing the first page that was found with the node manifest id set in pageContext.slug in createPage().\nThis may result in an inaccurate node manifest (for previews or other purposes). See https://www.gatsbyjs.com/docs/conceptual/content-sync for more info.`,
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  "11803": {
    text: ({ inputManifest, pagePath }): string =>
      `${getSharedNodeManifestWarning(
        inputManifest
      )} but Gatsby didn't find an ownerNodeId for the page at ${pagePath}\nUsing the first page where this node is queried.\nThis may result in an inaccurate node manifest (for previews or other purposes). See https://www.gatsbyjs.com/docs/conceptual/content-sync for more info.`,
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  "11804": {
    text: ({ pluginName, nodeId }): string =>
      `Plugin ${pluginName} called unstable_createNodeManifest for a node which doesn't exist with an id of ${nodeId}`,
    level: Level.WARNING,
    category: ErrorCategory.USER,
    type: Type.API_NODE_VALIDATION,
  },
  // Parcel Compilation Errors
  "11901": {
    text: (context): string =>
      stripIndent(`
    Failed to compile Gatsby files ${
      context.origin ? `(${context.origin})` : ``
    }:
    
    ${context.generalMessage}. ${context.specificMessage ?? ``}
    ${
      context.hints
        ? context.hints.map(
            h => `
    Hints:
    - ${h}\n`
          )
        : ``
    }
    ${context.filePath ? `File path: ${context.filePath}` : ``}`),
    level: Level.ERROR,
    type: Type.API_TYPESCRIPT_COMPILATION,
    category: ErrorCategory.USER,
  },
  "11902": {
    text: (context): string =>
      `We encountered an error while trying to compile your site's ${context.configName}. Check the current limitations (https://gatsby.dev/ts-limitations), fix the error, and try again.`,
    level: Level.ERROR,
    type: Type.API_TYPESCRIPT_COMPILATION,
    category: ErrorCategory.USER,
  },
  "11903": {
    text: (context): string =>
      `There was an unhandled error during compilation for ${context.siteRoot}. Please run the command with the --verbose flag again.\n${context.sourceMessage}`,
    level: Level.ERROR,
    type: Type.API_TYPESCRIPT_COMPILATION,
    category: ErrorCategory.USER,
  },
  "11904": {
    text: (context): string =>
      `Expected compiled files not found after compilation for ${
        context.siteRoot
      } after ${context.retries} retries.\nFile expected to be valid: ${
        context.compiledFileLocation
      }${
        context.sourceFileLocation
          ? `\nCompiled from: ${context.sourceFileLocation}`
          : ``
      }\n\nPlease run "gatsby clean" and try again. If the issue persists, please open an issue with a reproduction at https://gatsby.dev/new-issue for more help.`,
    level: Level.ERROR,
    type: Type.API_TYPESCRIPT_COMPILATION,
    category: ErrorCategory.SYSTEM,
  },
  "12100": {
    text: (
      context
    ): string => `There was an error while trying to generate TS types from your GraphQL queries:
    
    ${context.sourceMessage}`,
    level: Level.ERROR,
    type: Type.API_TYPESCRIPT_TYPEGEN,
    category: ErrorCategory.USER,
    docsUrl: `https://gatsby.dev/graphql-typegen`,
  },
  // Gatsby Adapters
  "12200": {
    text: (): string =>
      `[Adapters] Tried to create routes for webpack assets but failed. If the issue persists, please open an issue with a reproduction at https://gatsby.dev/bug-report for more help.`,
    level: Level.ERROR,
    type: Type.ADAPTER,
    category: ErrorCategory.SYSTEM,
  },
  // Partial hydration
  "80000": {
    text: (context): string =>
      stripIndents(`Building partial HTML failed${
        context?.path ? ` for path "${context.path}"` : ``
      }

      This can happen if interactive elements like "useEffect", "useState", "createContext" or event handlers are used in a component without declaring the "use client" directive at the top of the file.
      
      Consider adding "use client" to the top of your file if your component is interactive, otherwise refactor your component so it can be statically rendered with React Server Components (RSC).
    `),
    level: Level.ERROR,
    type: Type.RSC_COMPILATION,
    docsUrl: `https://gatsby.dev/partial-hydration-error`,
    category: ErrorCategory.USER,
  },
  "80001": {
    text: (): string =>
      stripIndents(
        `
        Failed to restore previous client module manifest.
        
        This can happen if the manifest is corrupted or is not compatible with the current version of Gatsby.

        Please run "gatsby clean" and try again. If the issue persists, please open an issue with a reproduction at https://gatsby.dev/new-issue for more help.
        `
      ),
    level: Level.ERROR,
    type: Type.RSC_COMPILATION,
    docsUrl: `https://gatsby.dev/partial-hydration-error`,
    category: ErrorCategory.THIRD_PARTY,
  },
}

export type ErrorId = string | keyof typeof errors

export const errorMap: Record<ErrorId, IErrorMapEntry> = errors

export const defaultError = errorMap[``]

export interface IErrorMapEntry {
  text: (context) => string
  // Public facing API (e.g. used by setErrorMap) doesn't rely on enum but gives an union with string interpolation
  level: `${Level}`
  type: `${Type}` | ((context) => `${Type}`)
  category: `${ErrorCategory}`
  docsUrl?: string
}

// Make level and type optional for plugins
export interface IErrorMapEntryPublicApi
  extends Omit<IErrorMapEntry, "level" | "type"> {
  level?: `${Level}`
  type?: `${Type}` | ((context) => `${Type}`)
}
