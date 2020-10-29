# serum-ts

[![Discord Chat](https://img.shields.io/discord/739225212658122886?color=blueviolet)](https://discord.com/channels/739225212658122886)
[![License](https://img.shields.io/github/license/project-serum/serum-dex?color=blue)](https://opensource.org/licenses/Apache-2.0)

## Contributing

### Installing

To get started first install the required build tools:

```
npm install -g lerna
npm install -g yarn
```

Then bootstrap the workspace:

```
yarn
```

### Building

To build the workspace:

```
yarn build
```

In each package, the built javascript and typescript definitions will be in `dist/`. For direct browser testing of a client built from source, simply include the rollup artifact directly in your script tag, e.g., `<script src=/dist/index.umd.js></script>`.

### Testing

To run all tests:

```
yarn test
```

### Linting

To lint:

```
yarn lint
```

To apply lint fixes:

```
yarn lint:fix
```

### Publishing new npm package versions

This is a multi-package repo; packages are managed by `lerna`.

First, bump the version number in all `package.json`:

```sh
git checkout -b mybranch
lerna version  # bumps package numbers and creates a commit
```

Get the PR approved and merge it. Then pull the newly-updated master
and push packages from it to npm:

```sh
git checkout master && git pull
lerna publish from-package
```

### Creating a new package

To create a new package, copy folder in `packages/template`, change the name in `package.json` and you're good to go.
