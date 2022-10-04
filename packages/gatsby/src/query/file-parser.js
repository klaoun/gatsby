/* eslint-disable no-unused-expressions */
// @flow
const fs = require(`fs-extra`)
const crypto = require(`crypto`)
const _ = require(`lodash`)
const slugify = require(`slugify`)

// Traverse is a es6 module...
import traverse from "@babel/traverse"
import * as t from "@babel/types"
const {
  getGraphQLTag,
  StringInterpolationNotAllowedError,
  EmptyGraphQLTagError,
  GraphQLSyntaxError,
  ExportIsNotAsyncError,
  isWithinConfigExport,
} = require(`babel-plugin-remove-graphql-queries`)

const report = require(`gatsby-cli/lib/reporter`)

import type { DocumentNode } from "graphql"
import { babelParseToAst } from "../utils/babel-parse-to-ast"
import { codeFrameColumns } from "@babel/code-frame"
import { getPathToLayoutComponent } from "gatsby-core-utils"

const apiRunnerNode = require(`../utils/api-runner-node`)
const { actions } = require(`../redux/actions`)
const { store } = require(`../redux`)
import { locInGraphQlToLocInFile } from "./error-parser"
/**
 * Add autogenerated query name if it wasn't defined by user.
 */
const generateQueryName = ({ def, hash, file, queryType }) => {
  if (!def.name || !def.name.value) {
    const slugified = slugify(file, {
      replacement: ` `,
      lower: false,
    })
    def.name = {
      value: `${_.camelCase(`${queryType}-${slugified}-${hash}`)}`,
      kind: `Name`,
    }
  }
  return def
}

// taken from `babel-plugin-remove-graphql-queries`, in the future import from
// there
function followVariableDeclarations(binding) {
  const node = binding?.path?.node
  if (
    node?.type === `VariableDeclarator` &&
    node?.id.type === `Identifier` &&
    node?.init?.type === `Identifier`
  ) {
    return followVariableDeclarations(
      binding.path.scope.getBinding(node.init.name)
    )
  }
  return binding
}

function referencesGatsby(path, callee, calleeName) {
  // This works for es6 imports
  if (callee.referencesImport(`gatsby`, ``)) {
    return true
  } else {
    // This finds where userStaticQuery was declared and then checks
    // if it is a "require" and "gatsby" is the argument.
    const declaration = path.scope.getBinding(calleeName)
    if (
      declaration &&
      declaration.path.node.init?.callee.name === `require` &&
      declaration.path.node.init.arguments[0].value === `gatsby`
    ) {
      return true
    } else {
      return false
    }
  }
}

function isUseStaticQuery(path) {
  const callee = path.node.callee
  if (callee.type === `MemberExpression`) {
    const property = callee.property
    if (property.name === `useStaticQuery`) {
      return referencesGatsby(
        path,
        path.get(`callee`).get(`object`),
        path.node?.callee.object.name
      )
    }
    return false
  }
  if (callee.name === `useStaticQuery`) {
    return referencesGatsby(path, path.get(`callee`), path.node?.callee.name)
  }
  return false
}

const warnForUnknownQueryVariable = (varName, file, usageFunction) =>
  report.warn(
    `\nWe were unable to find the declaration of variable "${varName}", which you passed as the "query" prop into the ${usageFunction} declaration in "${file}".

Perhaps the variable name has a typo?

Also note that we are currently unable to use queries defined in files other than the file where the ${usageFunction} is defined. If you're attempting to import the query, please move it into "${file}". If being able to import queries from another file is an important capability for you, we invite your help fixing it.\n`
  )

async function parseToAst(filePath, fileStr, { parentSpan, addError } = {}) {
  let ast

  // Since gatsby-plugin-mdx v4, we are using the resourceQuery feature of webpack's loaders to inject a content file into a page component.
  const cleanFilePath = getPathToLayoutComponent(filePath)

  // Preprocess and attempt to parse source; return an AST if we can, log an
  // error if we can't.
  const transpiled = await apiRunnerNode(`preprocessSource`, {
    filename: cleanFilePath,
    contents: fileStr,
    parentSpan,
  })

  if (transpiled && transpiled.length) {
    for (const item of transpiled) {
      try {
        const tmp = babelParseToAst(item, cleanFilePath)
        ast = tmp
        break
      } catch (error) {
        // We emit the actual error below if every transpiled variant fails to parse
      }
    }
    if (ast === undefined) {
      addError({
        id: `85912`,
        filePath: cleanFilePath,
        context: {
          filePath,
        },
      })
      store.dispatch(
        actions.queryExtractionGraphQLError({
          componentPath: cleanFilePath,
        })
      )

      return null
    }
  } else {
    try {
      ast = babelParseToAst(fileStr, cleanFilePath)
    } catch (error) {
      store.dispatch(
        actions.queryExtractionBabelError({
          componentPath: cleanFilePath,
          error,
        })
      )

      addError({
        id: `85911`,
        filePath: cleanFilePath,
        context: {
          filePath: cleanFilePath,
        },
      })

      return null
    }
  }

  return ast
}

const panicOnGlobalTag = file =>
  report.panicOnBuild(
    `Using the global \`graphql\` tag for Gatsby's queries isn't supported as of v3.\n` +
      `Import it instead like:  import { graphql } from 'gatsby' in file:\n` +
      file
  )

type GraphQLDocumentInFile = {
  filePath: string,
  doc: DocumentNode,
  templateLoc: string,
  text: string,
  hash: string,
  isHook: boolean,
  isStaticQuery: boolean,
}

// Adapted from gatsby/src/utils/babel/babel-plugin-remove-api
function findApiExport(ast, api) {
  let hasExport = false
  const apiToFind = api ?? ``

  traverse(ast, {
    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration

      if (t.isExportNamedDeclaration(path.node) && !hasExport) {
        hasExport = path.node.specifiers.some(
          specifier =>
            t.isExportSpecifier(specifier) &&
            t.isIdentifier(specifier.exported) &&
            specifier.exported.name === apiToFind
        )
      }

      let apiToCheck
      if (t.isFunctionDeclaration(declaration) && declaration.id) {
        apiToCheck = declaration.id.name
      }

      if (
        t.isVariableDeclaration(declaration) &&
        t.isIdentifier(declaration.declarations[0].id)
      ) {
        apiToCheck = declaration.declarations[0].id.name
      }

      if (apiToCheck && apiToCheck === apiToFind) {
        hasExport = true
      }
    },
  })

  return hasExport
}

async function findGraphQLTags(
  file,
  ast,
  { parentSpan, addError } = {}
): Promise<Array<GraphQLDocumentInFile>> {
  const documents = []
  if (!ast) {
    return documents
  }

  /**
   * A map of graphql documents to unique locations.
   *
   * A graphql document's unique location is made of:
   *
   *  - the location of the graphql template literal that contains the document, and
   *  - the document's location within the graphql template literal
   *
   * This is used to prevent returning duplicated documents.
   */
  const documentLocations = new WeakMap()

  const extractStaticQuery = (taggedTemplateExpressPath, isHook = false) => {
    const {
      ast: gqlAst,
      text,
      hash,
      isGlobal,
    } = getGraphQLTag(taggedTemplateExpressPath)
    if (!gqlAst) return

    if (isGlobal) {
      panicOnGlobalTag(file)
      return
    }

    gqlAst.definitions.forEach(def => {
      generateQueryName({
        def,
        hash,
        file,
        queryType: `static`,
      })
    })

    let templateLoc

    taggedTemplateExpressPath.traverse({
      TemplateElement(templateElementPath) {
        templateLoc = templateElementPath.node.loc
      },
    })

    const docInFile = {
      filePath: file,
      doc: gqlAst,
      text: text,
      hash: hash,
      isStaticQuery: true,
      isConfigQuery: false,
      isHook,
      templateLoc,
    }

    documentLocations.set(
      docInFile,
      `${taggedTemplateExpressPath.node.start}-${gqlAst.loc.start}`
    )

    documents.push(docInFile)
  }

  if (_CFLAGS_.GATSBY_MAJOR !== `5`) {
    // Look for queries in <StaticQuery /> elements.
    traverse(ast, {
      JSXElement(path) {
        if (path.node.openingElement.name.name !== `StaticQuery`) {
          return
        }

        // astexplorer.com link I (@kyleamathews) used when prototyping this algorithm
        // https://astexplorer.net/#/gist/ab5d71c0f08f287fbb840bf1dd8b85ff/2f188345d8e5a4152fe7c96f0d52dbcc6e9da466
        path.traverse({
          JSXAttribute(jsxPath) {
            if (jsxPath.node.name.name !== `query`) {
              return
            }
            jsxPath.traverse({
              // Assume the query is inline in the component and extract that.
              TaggedTemplateExpression(templatePath) {
                extractStaticQuery(templatePath)
              },
              // Also see if it's a variable that's passed in as a prop
              // and if it is, go find it.
              Identifier(identifierPath) {
                if (identifierPath.node.name !== `graphql`) {
                  const varName = identifierPath.node.name
                  let found = false
                  traverse(ast, {
                    VariableDeclarator(varPath) {
                      if (
                        varPath.node.id.name === varName &&
                        varPath.node.init.type === `TaggedTemplateExpression`
                      ) {
                        varPath.traverse({
                          TaggedTemplateExpression(templatePath) {
                            found = true
                            extractStaticQuery(templatePath)
                          },
                        })
                      }
                    },
                  })
                  if (!found) {
                    warnForUnknownQueryVariable(varName, file, `<StaticQuery>`)
                  }
                }
              },
            })
          },
        })
        return
      },
    })
  }

  // Look for queries in useStaticQuery hooks.
  traverse(ast, {
    CallExpression(hookPath) {
      if (!isUseStaticQuery(hookPath)) return

      const firstArg = hookPath.get(`arguments`)[0]

      // Assume the query is inline in the component and extract that.
      if (firstArg.isTaggedTemplateExpression()) {
        extractStaticQuery(firstArg, true)
        // Also see if it's a variable that's passed in as a prop
        // and if it is, go find it.
      } else if (firstArg.isIdentifier()) {
        if (
          firstArg.node.name !== `graphql` &&
          firstArg.node.name !== `useStaticQuery`
        ) {
          const varName = firstArg.node.name
          let found = false
          traverse(ast, {
            VariableDeclarator(varPath) {
              if (
                varPath.node.id.name === varName &&
                varPath.node.init.type === `TaggedTemplateExpression`
              ) {
                varPath.traverse({
                  TaggedTemplateExpression(templatePath) {
                    found = true
                    extractStaticQuery(templatePath, true)
                  },
                })
              }
            },
          })
          if (!found) {
            warnForUnknownQueryVariable(varName, file, `useStaticQuery`)
          }
        }
      }
    },
  })

  function TaggedTemplateExpression(innerPath) {
    const { ast: gqlAst, isGlobal, hash, text } = getGraphQLTag(innerPath)
    if (!gqlAst) return

    if (isGlobal) {
      panicOnGlobalTag(file)
      return
    }

    const isConfigQuery = isWithinConfigExport(innerPath)

    gqlAst.definitions.forEach(def => {
      generateQueryName({
        def,
        hash,
        file,
        queryType: isConfigQuery ? `config` : `page`,
      })
    })

    let templateLoc
    innerPath.traverse({
      TemplateElement(templateElementPath) {
        templateLoc = templateElementPath.node.loc
      },
    })

    const docInFile = {
      filePath: file,
      doc: gqlAst,
      text: text,
      hash: hash,
      isStaticQuery: false,
      isConfigQuery,
      isHook: false,
      templateLoc,
    }

    documentLocations.set(
      docInFile,
      `${innerPath.node.start}-${gqlAst.loc.start}`
    )

    documents.push(docInFile)
  }

  // When a component has a StaticQuery we scan all of its exports and follow those exported variables
  // to determine if they lead to this static query (via tagged template literal)
  traverse(ast, {
    ExportNamedDeclaration(path, state) {
      // Skipping the edge case of re-exporting (i.e. "export { bar } from 'Bar'")
      // (it is handled elsewhere for queries, see usages of warnForUnknownQueryVariable)
      if (path.node.source) {
        return
      }
      path.traverse({
        TaggedTemplateExpression,
        ExportSpecifier(path) {
          const binding = followVariableDeclarations(
            path.scope.getBinding(path.node.local.name)
          )
          binding?.path?.traverse({ TaggedTemplateExpression })
        },
      })
    },
  })

  // Remove duplicate queries
  const uniqueQueries = _.uniqBy(documents, q => documentLocations.get(q))

  return uniqueQueries
}

const cache = {}

export default class FileParser {
  constructor({ parentSpan } = {}) {
    this.parentSpan = parentSpan
  }

  async parseFile(
    file: string,
    addError
  ): Promise<?Array<GraphQLDocumentInFile>> {
    let text
    const cleanFilepath = getPathToLayoutComponent(file)
    try {
      text = await fs.readFile(cleanFilepath, `utf8`)
    } catch (err) {
      addError({
        id: `85913`,
        filePath: file,
        context: {
          filePath: file,
        },
        error: err,
      })

      store.dispatch(
        actions.queryExtractionGraphQLError({
          componentPath: file,
        })
      )
      return null
    }

    // We do a quick check so we can exit early if this is a file we're not interested in.
    // We only process files that either include graphql, or static images
    if (
      !text.includes(`graphql`) &&
      !text.includes(`gatsby-plugin-image`) &&
      !text.includes(`getServerData`) &&
      !text.includes(`config`)
    ) {
      return null
    }

    const hash = crypto
      .createHash(`md5`)
      .update(file)
      .update(text)
      .digest(`hex`)

    try {
      if (!cache[hash]) {
        const ast = await parseToAst(file, text, {
          parentSpan: this.parentSpan,
          addError,
        })
        cache[hash] = {
          astDefinitions: await findGraphQLTags(file, ast, {
            parentSpan: this.parentSpan,
            addError,
          }),
          serverData: findApiExport(ast, `getServerData`),
          config: findApiExport(ast, `config`),
          Head: findApiExport(ast, `Head`),
        }
      }
      const { astDefinitions, serverData, config, Head } = cache[hash]

      // Note: we should dispatch this action even when getServerData is not found
      // (maybe it was set before, so now we need to reset renderMode from SSR to the default one)
      store.dispatch({
        type: `SET_COMPONENT_FEATURES`,
        payload: {
          componentPath: file,
          serverData,
          config,
          Head,
        },
      })

      // If any AST definitions were extracted, report success.
      // This can mean there is none or there was a babel error when
      // we tried to extract the graphql AST.
      if (astDefinitions.length > 0) {
        store.dispatch(
          actions.queryExtractedBabelSuccess({
            componentPath: file,
          })
        )
      }

      return astDefinitions
    } catch (err) {
      // default error
      let structuredError = {
        id: `85915`,
        context: {
          filePath: file,
        },
      }

      if (err instanceof StringInterpolationNotAllowedError) {
        const location = {
          start: err.interpolationStart,
          end: err.interpolationEnd,
        }
        structuredError = {
          id: `85916`,
          location,
          context: {
            codeFrame: codeFrameColumns(text, location, {
              highlightCode: process.env.FORCE_COLOR !== `0`,
            }),
          },
        }
      } else if (err instanceof EmptyGraphQLTagError) {
        const location = err.templateLoc
          ? {
              start: err.templateLoc.start,
              end: err.templateLoc.end,
            }
          : null

        structuredError = {
          id: `85917`,
          location,
          context: {
            codeFrame: location
              ? codeFrameColumns(text, location, {
                  highlightCode: process.env.FORCE_COLOR !== `0`,
                })
              : null,
          },
        }
      } else if (err instanceof GraphQLSyntaxError) {
        const location = {
          start: locInGraphQlToLocInFile(
            err.templateLoc,
            err.originalError.locations[0]
          ),
        }

        structuredError = {
          id: `85918`,
          location,
          context: {
            codeFrame: location
              ? codeFrameColumns(text, location, {
                  highlightCode: process.env.FORCE_COLOR !== `0`,
                  message: err.originalError.message,
                })
              : null,
            sourceMessage: err.originalError.message,
          },
        }
      } else if (err instanceof ExportIsNotAsyncError) {
        const location = {
          start: err.exportStart,
          end: err.exportStart,
        }
        structuredError = {
          id: `85929`,
          location,
          context: {
            exportName: err.exportName,
            codeFrame: codeFrameColumns(text, location, {
              highlightCode: process.env.FORCE_COLOR !== `0`,
            }),
          },
        }
      }

      addError({
        ...structuredError,
        filePath: file,
      })

      store.dispatch(
        actions.queryExtractionGraphQLError({
          componentPath: file,
        })
      )
      return null
    }
  }

  async parseFiles(
    files: Array<string>,
    addError
  ): Promise<Array<GraphQLDocumentInFile>> {
    const documents = []

    return Promise.all(
      files.map(file =>
        this.parseFile(file, addError).then(docs => {
          documents.push(...(docs || []))
        })
      )
    ).then(() => documents)
  }
}
