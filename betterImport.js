export default function betterImport(config, makeThennable) {
  if (makeThennable === false) {
    return config
  }

  const load = config.load

  config.then = function(callback) {
    return load().then((result) => {
      return callback && callback(result)
    })
  }

  config.catch = function(callback) {
    return load().catch((error) => {
      return callback && callback(error)
    })
  }

  return config
}

let isSet = false

function setHasPlugin() {
  /* global __webpack_require__ */
  if (isSet) {
    return
  }

  let universal
  const isWebpack = typeof __webpack_require__ !== "undefined"

  try {
    if (isWebpack) {
      const weakId = require.resolveWeak("react-universal-component")
      universal = __webpack_require__(weakId)
    } else {
      const pkg = "react-universal-component"
      universal = module.require(pkg)
    }

    if (universal) {
      universal.setHasBabelPlugin()
      isSet = true
    }
  } catch (e) {}
}

setHasPlugin()
