module.exports = function(config, makeThennable) {
  if (makeThennable === false) return config

  const load = config.load
  config.then = function(cb) {
    return load().then((res) => {
      return cb && cb(res)
    })
  }
  config.catch = function(cb) {
    return load().catch((e) => {
      return cb && cb(e)
    })
  }
  return config
}

let isSet = false

function setHasPlugin() {
  if (isSet) return
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
