import pluginTester from "babel-plugin-tester"
import createBabylonOptions from "babylon-options"

import plugin from "../index"

const babelOptions = {
  filename: "currentFile.js",
  parserOpts: createBabylonOptions({
    plugins: [ "dynamicImport" ]
  })
}

/* eslint-disable no-template-curly-in-string */

pluginTester({
  plugin,
  babelOptions,
  snapshot: true,
  tests: {
    "static import": 'import("./Foo")',

    "static import (with relative paths)": 'import("../../Foo")',

    "static import (with file extension)": 'import("./Foo.js")',

    "static import (string template)": "import(`./base`)",

    "static import (string template + relative paths)": "import(`../../base`)",

    "static import (import as function with relative paths + nested folder)":
      "const obj = {component:()=>import(`../components/nestedComponent`)}; ()=> obj.component()",

    "static import (relative paths + nested folder)":
      "import(`../components/nestedComponent`)",

    "dynamic import (string template)": "import(`./base/${page}`)",

    "dynamic import (string template with nested folder)":
      "import(`./base/${page}/nested/folder`)",

    "dynamic import (string template with multiple nested folders)":
      "import(`./base/${page}/nested/{$another}folder`)",

    "dynamic import (string template - dynamic at 1st segment)":
      "import(`./${page}`)",

    "dynamic import (string template + relative paths)":
      "import(`../../base/${page}`)",

    "await import() should receive a thennable without calling .then":
      "async ({ page }) => await import(`../components/${page}`);",

    "existing chunkName": "import(/* webpackChunkName: 'Bar' */\"./Foo\")",

    "existing prefetch": 'import(/* webpackPrefetch: true */"./Foo")',

    "existing prefetch + chunkName":
      "import(/* webpackPrefetch: true, webpackChunkName: 'Bar' */\"./Foo\")"
  }
})
