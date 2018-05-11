<a href="https://gitter.im/Reactlandia/Lobby" target="_blank">
  <img alt="Reactlandia Chat" src="https://s3-us-west-1.amazonaws.com/cdn.reactlandia.com/reactlandia-chat.png">
</a>

# babel-plugin-universal-import

<p align="center">
  <a href="https://www.npmjs.com/package/babel-plugin-universal-import">
    <img src="https://img.shields.io/npm/v/babel-plugin-universal-import.svg" alt="Version" />
  </a>

  <a href="https://travis-ci.org/faceyspacey/babel-plugin-universal-import">
    <img src="https://travis-ci.org/faceyspacey/babel-plugin-universal-import.svg?branch=master" alt="Build Status" />
  </a>

  <a href="https://lima.codeclimate.com/github/faceyspacey/babel-plugin-universal-import/coverage">
    <img src="https://lima.codeclimate.com/github/faceyspacey/babel-plugin-universal-import/badges/coverage.svg" alt="Coverage Status"/>
  </a>

  <a href="https://greenkeeper.io">
    <img src="https://badges.greenkeeper.io/faceyspacey/babel-plugin-universal-import.svg" alt="Green Keeper" />
  </a>

  <a href="https://lima.codeclimate.com/github/faceyspacey/babel-plugin-universal-import">
    <img src="https://lima.codeclimate.com/github/faceyspacey/babel-plugin-universal-import/badges/gpa.svg" alt="GPA" />
  </a>

  <a href="https://www.npmjs.com/package/babel-plugin-universal-import">
    <img src="https://img.shields.io/npm/dt/babel-plugin-universal-import.svg" alt="Downloads" />
  </a>

  <a href="https://www.npmjs.com/package/babel-plugin-universal-import">
    <img src="https://img.shields.io/npm/l/babel-plugin-universal-import.svg" alt="License" />
  </a>
</p>


<p align="center">
  <img src="https://s3-us-west-1.amazonaws.com/cdn.reactlandia.com/universal-component-banner.png" />
</p>

## Installation
```
yarn add babel-plugin-universal-import
```
*.babelrc:*
```js
{
  "plugins": ["universal-import"]
}
```


## What it does
Taking from the [test snapshots](./__tests__/__snapshots__/index.js.snap), it does this:

```js
import universal from 'react-universal-component'
const UniversalComponent = universal(import('./Foo.js'))

<UniversalComponent />

      ↓ ↓ ↓ ↓ ↓ ↓

import universal from 'react-universal-component'
import universalImport from 'babel-plugin-universal-import/universalImport.js'
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
import universalImport from 'babel-plugin-universal-import/universalImport.js'
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

Otherwise, what it's doing is providing all the different types of requires/paths/imports/etc needed by tools like [react-universal-component](https://github.com/faceyspacey/react-universal-component) to universally render your component.

The targeted **use-case** for all this is dynamic imports where you can pass a `page` prop to the resulting component, thereby allowing you to create one `<UniversalComponent page={page} />` for a large number of your components. This is a major upgrade to the previous way of having to make a hash of a million async components in a wrapping component. You no longer have to think about *Universal Components* as anything different than your other components that use simple HoCs.

## Typescript and non-Babel environments

If you can't use babel, you can either copy what this plugin does above, or you can do a shorter version where you just put the important configuration key/vals on the 2nd options argument to `universal`:

```js
import universal from 'react-universal-component'

const load = props => import( /* webpackChunkName: '[request]' */ `./${props.page}`)

const UniversalComponent = universal(load, {
  chunkName: props => props.page,
  resolve: props => require.resolveWeak(`./${props.page}`)
});
```
> notice `chunkName` and `resolve` as standard options on the 2nd options argument.


## Tests

Reviewing a package's tests are a great way to get familiar with it. It's direct insight into the capabilities of the given package (if the tests are thorough). What's even better is a screenshot of the tests neatly organized and grouped (you know the whole "a picture says a thousand words" thing).
