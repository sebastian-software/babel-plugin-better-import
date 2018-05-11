/* eslint-disable filenames/match-exported */
"use-strict"

const { addDefault } = require("@babel/helper-module-imports")

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

function getImportArgPath(p) {
  return p.parentPath.get("arguments")[0]
}

function trimChunkNameBaseDir(baseDir) {
  return baseDir.replace(/^[./]+|(\.js$)/g, "")
}

function prepareChunkNamePath(path) {
  return path.replace(/\//g, "-")
}

function getImport(p, { id, source, nameHint }) {
  if (!p.hub.file[id]) {
    p.hub.file[id] = addDefault(p, source, { nameHint })
  }

  return p.hub.file[id]
}

function createTrimmedChunkName(t, importArgNode) {
  if (importArgNode.quasis) {
    let quasis = importArgNode.quasis.slice(0)
    const baseDir = trimChunkNameBaseDir(quasis[0].value.cooked)
    quasis[0] = Object.assign({}, quasis[0], {
      value: { raw: baseDir, cooked: baseDir }
    })

    quasis = quasis.map((quasi, i) => (i > 0 ? prepareQuasi(quasi) : quasi))

    return Object.assign({}, importArgNode, {
      quasis
    })
  }

  const moduleName = trimChunkNameBaseDir(importArgNode.value)
  return t.stringLiteral(moduleName)
}

function prepareQuasi(quasi) {
  const newPath = prepareChunkNamePath(quasi.value.cooked)

  return Object.assign({}, quasi, {
    value: { raw: newPath, cooked: newPath }
  })
}

function getMagicCommentChunkName(importArgNode) {
  const { quasis, expressions } = importArgNode
  if (!quasis) return trimChunkNameBaseDir(importArgNode.value)

  const baseDir = quasis[0].value.cooked
  const hasExpressions = expressions.length > 0
  const chunkName = baseDir + (hasExpressions ? "[request]" : "")
  return trimChunkNameBaseDir(chunkName)
}

function getComponentId(t, importArgNode) {
  const { quasis, expressions } = importArgNode
  if (!quasis) return importArgNode.value

  return quasis.reduce((str, quasi, i) => {
    const q = quasi.value.cooked
    const id = expressions[i] && expressions[i].name
    str += id ? `${q}\${${id}}` : q
    return str
  }, "")
}

function existingMagicCommentChunkName(importArgNode) {
  const { leadingComments } = importArgNode
  if (
    leadingComments &&
    leadingComments.length &&
    leadingComments[0].value.indexOf("webpackChunkName") !== -1
  ) {
    try {
      return leadingComments[0].value
        .split("webpackChunkName:")[1]
        .replace(/["']/g, "")
        .trim()
    } catch (e) {
      return null
    }
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
  const existingChunkName = t.existingChunkName
  const chunkName = existingChunkName || generatedChunkName
  const trimmedChunkName = existingChunkName ?
    t.stringLiteral(generatedChunkName) :
    createTrimmedChunkName(t, importArgNode)

  delete argPath.node.leadingComments
  argPath.addComment("leading", ` webpackChunkName: '${chunkName}' `)

  const load = loadTemplate({
    IMPORT: argPath.parent
  }).expression

  return t.objectProperty(t.identifier("load"), load)
}

function pathOption(types, pathTemplate, path, importArgNode) {
  const path = pathTemplate({
    PATH: getImport(path, IMPORT_PATH_DEFAULT),
    MODULE: importArgNode
  }).expression

  return types.objectProperty(types.identifier("path"), path)
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
        if (path[visited]) return
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
          loadOption(types, loadTemplate, path, importArgNode), // only when not on a babel-server
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
