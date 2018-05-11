"use-strict"

const { addDefault } = require("@babel/helper-module-imports")
const JSON5 = require("json5")

const visited = Symbol("visited")

const IMPORT_BETTER_DEFAULT = {
  id: Symbol("betterImportId"),
  source: "babel-plugin-better-import/universalImport",
  nameHint: "betterImport"
}

const IMPORT_PATH_DEFAULT = {
  id: Symbol("pathId"),
  source: "path",
  nameHint: "path"
}

function getImportArgPath(path) {
  return path.parentPath.get("arguments")[0]
}

function trimChunkNameBaseDir(baseDir) {
  return baseDir.replace(/^[./]+|(\.js$)/g, "")
}

function prepareChunkNamePath(path) {
  return path.replace(/\//g, "-")
}

function getImport(path, { id, source, nameHint }) {
  if (!path.hub.file[id]) {
    path.hub.file[id] = addDefault(path, source, { nameHint })
  }

  return path.hub.file[id]
}

function createTrimmedChunkName(types, importArgNode) {
  if (importArgNode.quasis) {
    let quasis = importArgNode.quasis.slice(0)
    const baseDir = trimChunkNameBaseDir(quasis[0].value.cooked)
    quasis[0] = Object.assign({}, quasis[0], {
      value: { raw: baseDir, cooked: baseDir }
    })

    quasis = quasis.map(function mapper(quasi, i) {
      return i > 0 ? prepareQuasi(quasi) : quasi
    })

    return Object.assign({}, importArgNode, {
      quasis
    })
  }

  const moduleName = trimChunkNameBaseDir(importArgNode.value)
  return types.stringLiteral(moduleName)
}

function prepareQuasi(quasi) {
  const newPath = prepareChunkNamePath(quasi.value.cooked)

  return Object.assign({}, quasi, {
    value: { raw: newPath, cooked: newPath }
  })
}

function getMagicCommentChunkName(importArgNode) {
  const { quasis, expressions } = importArgNode
  if (!quasis) {
    return trimChunkNameBaseDir(importArgNode.value)
  }

  const baseDir = quasis[0].value.cooked
  const hasExpressions = expressions.length > 0
  const chunkName = baseDir + (hasExpressions ? "[request]" : "")

  return trimChunkNameBaseDir(chunkName)
}

function getComponentId(types, importArgNode) {
  const { quasis, expressions } = importArgNode
  if (!quasis) {
    return importArgNode.value
  }

  return quasis.reduce((str, quasi, i) => {
    const value = quasi.value.cooked
    const id = expressions[i] && expressions[i].name
    return str + (id ? `${value}\${${id}}` : value)
  }, "")
}

function existingMagicCommentChunkName(importArgNode) {
  const { leadingComments } = importArgNode

  if (leadingComments) {
    const data = leadingComments
      .map(function process(comment, index) {
        if (comment.value.indexOf("webpackChunkName") !== -1) {
          let parsed
          try {
            parsed = JSON5.parse(`{${comment.value}}`)
          } catch (error) {
            return null
          }

          const value = parsed && parsed.webpackChunkName
          if (value) {
            // Cleanup comment from old chunk name
            delete parsed.webpackChunkName
            comment.value = JSON5.stringify(parsed).slice(1, -1)

            // Remove empty comments
            if (comment.value === "") {
              leadingComments.splice(index, 1)
            }

            return value
          }
        }

        return null
      })
      .filter(Boolean)

    // Last entry wins
    return data.pop()
  }

  return null
}

function idOption(types, importArgNode) {
  const id = getComponentId(types, importArgNode)
  return types.objectProperty(types.identifier("id"), types.stringLiteral(id))
}

function fileOption(types, path) {
  return types.objectProperty(
    types.identifier("file"),
    types.stringLiteral(path.hub.file.opts.filename)
  )
}

function loadOption(types, loadTemplate, path, importArgNode) {
  const argPath = getImportArgPath(path)
  const generatedChunkName = getMagicCommentChunkName(importArgNode)
  const existingChunkName = types.existingChunkName
  const chunkName = existingChunkName || generatedChunkName

  argPath.addComment("leading", ` webpackChunkName: '${chunkName}' `)

  const load = loadTemplate({
    IMPORT: argPath.parent
  }).expression

  return types.objectProperty(types.identifier("load"), load)
}

function pathOption(types, pathTemplate, path, importArgNode) {
  const pathResult = pathTemplate({
    PATH: getImport(path, IMPORT_PATH_DEFAULT),
    MODULE: importArgNode
  }).expression

  return types.objectProperty(types.identifier("path"), pathResult)
}

function resolveOption(types, resolveTemplate, importArgNode) {
  const resolve = resolveTemplate({
    MODULE: importArgNode
  }).expression

  return types.objectProperty(types.identifier("resolve"), resolve)
}

function chunkNameOption(types, chunkNameTemplate, importArgNode) {
  const existingChunkName = types.existingChunkName
  const generatedChunk = createTrimmedChunkName(types, importArgNode)
  const trimmedChunkName = existingChunkName ?
    types.stringLiteral(existingChunkName) :
    generatedChunk

  const chunkName = chunkNameTemplate({
    MODULE: trimmedChunkName
  }).expression

  return types.objectProperty(types.identifier("chunkName"), chunkName)
}

function checkForNestedChunkName(node) {
  const generatedChunkName = getMagicCommentChunkName(node)
  const isNested =
    generatedChunkName.indexOf("[request]") === -1 &&
    generatedChunkName.indexOf("/") > -1
  return isNested && prepareChunkNamePath(generatedChunkName)
}

module.exports = function betterImportPlugin({ types, template }) {
  const chunkNameTemplate = template("() => MODULE")
  const pathTemplate = template("() => PATH.join(__dirname, MODULE)")
  const resolveTemplate = template("() => require.resolveWeak(MODULE)")
  const loadTemplate = template("() => IMPORT")

  return {
    name: "better-import",
    visitor: {
      Import(path) {
        if (path[visited]) {
          return
        }
        path[visited] = true

        const importArgNode = getImportArgPath(path).node
        types.existingChunkName = existingMagicCommentChunkName(importArgNode)

        // no existing chunkname, no problem - we will reuse that for fixing nested chunk names
        if (!types.existingChunkName) {
          types.existingChunkName = checkForNestedChunkName(importArgNode)
        }
        const universalImport = getImport(path, IMPORT_BETTER_DEFAULT)

        // if being used in an await statement, return load() promise
        if (
          // await transformed already
          path.parentPath.parentPath.isYieldExpression() ||
          // await not transformed already
          types.isAwaitExpression(path.parentPath.parentPath.node)
        ) {
          const func = types.callExpression(universalImport, [
            loadOption(types, loadTemplate, path, importArgNode).value,
            types.booleanLiteral(false)
          ])

          path.parentPath.replaceWith(func)
          return
        }

        const opts = [
          idOption(types, importArgNode),
          fileOption(types, path),
          loadOption(types, loadTemplate, path, importArgNode),
          pathOption(types, pathTemplate, path, importArgNode),
          resolveOption(types, resolveTemplate, importArgNode),
          chunkNameOption(types, chunkNameTemplate, importArgNode)
        ]

        const options = types.objectExpression(opts)

        const func = types.callExpression(universalImport, [ options ])
        delete types.existingChunkName
        path.parentPath.replaceWith(func)
      }
    }
  }
}
