# Babel Plugin Better Import<br/>[![Sponsored by][sponsor-img]][sponsor] [![Version][npm-version-img]][npm] [![Downloads][npm-downloads-img]][npm] [![Build Status Unix][travis-img]][travis] [![Build Status Windows][appveyor-img]][appveyor] [![Dependencies][deps-img]][deps]

[sponsor-img]: https://img.shields.io/badge/Sponsored%20by-Sebastian%20Software-692446.svg
[sponsor]: https://www.sebastian-software.de
[deps]: https://david-dm.org/sebastian-software/babel-plugin-better-import
[deps-img]: https://david-dm.org/sebastian-software/babel-plugin-better-import.svg
[npm]: https://www.npmjs.com/package/babel-plugin-better-import
[npm-downloads-img]: https://img.shields.io/npm/dm/babel-plugin-better-import.svg
[npm-version-img]: https://img.shields.io/npm/v/babel-plugin-better-import.svg
[travis-img]: https://img.shields.io/travis/sebastian-software/babel-plugin-better-import/master.svg?branch=master&label=unix%20build
[appveyor-img]: https://img.shields.io/appveyor/ci/swernerx/babel-plugin-better-import/master.svg?label=windows%20build
[travis]: https://travis-ci.org/sebastian-software/babel-plugin-better-import
[appveyor]: https://ci.appveyor.com/project/swernerx/babel-plugin-better-import/branch/master

Makes `import()` widely useable. Automagically. Part of the Edge Platform.


## Installation

```
npm install babel-plugin-better-import
```

*.babelrc:*

```js
{
  "plugins": ["better-import"]
}
```


## What it does

Here you can see what the plugin does - as tested by our test suite:

```js
import universal from 'react-universal-component'
const UniversalComponent = universal(import('./Foo.js'))

<UniversalComponent />

      ↓ ↓ ↓ ↓ ↓ ↓

import universal from 'react-universal-component'
import universalImport from 'babel-plugin-better-import/universalImport.js'
import path from 'path'

const UniversalComponent = universal(universalImport({
  chunkName: () => 'Foo',
  path: () => path.join(__dirname, './Foo.js'),
  resolve: () => require.resolveWeak('./Foo.js'),
  load: () => import( /* webpackChunkName: 'Foo' */ './Foo.js')
}))

<UniversalComponent />
```

And if you're using dynamic imports:

```js
import universal from 'react-universal-component'
const UniversalComponent = universal(props => import(`./${props.page}`))

<UniversalComponent page='Foo' />

      ↓ ↓ ↓ ↓ ↓ ↓

import universal from 'react-universal-component'
import universalImport from 'babel-plugin-better-import/universalImport.js'
import path from 'path'

const UniversalComponent = universal(props => universalImport({
  chunkName: props => props.page,
  path: props => path.join(__dirname, `./${props.page}`),
  resolve: props => require.resolveWeak(`./${props.page}`),
  load: props => import( /* webpackChunkName: '[request]' */ `./${props.page}`)
}));

<UniversalComponent page='Foo' />
```

It names all your chunks using *magic comments* 🔮 behind the scenes and is derived from the imported file. This works with both static and dynamic import paths, as you can see above.

Otherwise, what it's doing is providing all the different types of requires/paths/imports/etc needed by tools like [react-universal-component](https://github.com/sebastian-software/react-universal-component) to universally render your component.

The targeted **use-case** for all this is dynamic imports where you can pass a `page` prop to the resulting component, thereby allowing you to create one `<UniversalComponent page={page} />` for a large number of your components. This is a major upgrade to the previous way of having to make a hash of a million async components in a wrapping component. You no longer have to think about *Universal Components* as anything different than your other components that use simple HoCs.

## License

[MIT](license)

## Copyright

<img src="https://cdn.rawgit.com/sebastian-software/sebastian-software-brand/3d93746f/sebastiansoftware-en.svg" alt="Sebastian Software GmbH Logo" width="250" height="200"/>

Copyright 2018<br/>[Sebastian Software GmbH](http://www.sebastian-software.de)
Copyright 2017-2018<br/>[James Gillmore](mailto:james@faceyspacey.com)
