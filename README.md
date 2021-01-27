<div align="center">
  <img height="170" src="http://github.com/project-serum/awesome-serum/blob/master/logo-serum.png?raw=true" />

  <h1>serum-ts</h1>

  <p>
    <strong>Project Serum Monorepo</strong>
  </p>

  <p>
    <a href="https://travis-ci.com/project-serum/serum-ts"><img alt="Build Status" src="https://travis-ci.com/project-serum/serum-ts.svg?branch=master" /></a>
    <a href="https://discord.com/channels/739225212658122886"><img alt="Discord Chat" src="https://img.shields.io/discord/739225212658122886?color=blueviolet" /></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img alt="License" src="https://img.shields.io/github/license/project-serum/serum-dex?color=blue" /></a>
  </p>

  <h4>
    <a href="https://projectserum.com/">Website</a>
    <span> | </span>
    <a href="https://serum-academy.com/en/">Academy</a>
    <span> | </span>
    <a href="https://github.com/project-serum/awesome-serum">Awesome</a>
    <span> | </span>
    <a href="https://dex.projectserum.com/#/">DEX</a>
    <span> | </span>
    <a href="https://github.com/project-serum/serum-dex">Rust</a>
  </h4>
</div>

## Packages

| Package                                             | Version                                                                                                                   | Description                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`@project-serum/borsh`](/packages/borsh)           | [![npm](https://img.shields.io/npm/v/@project-serum/borsh.svg)](https://www.npmjs.com/package/@project-serum/borsh)           | Borsh serialization primitives |
| [`@project-serum/common`](/packages/common)           | [![npm](https://img.shields.io/npm/v/@project-serum/common.svg)](https://www.npmjs.com/package/@project-serum/common)           | Common utilities |
| [`@project-serum/serum`](/packages/serum)                 | [![npm](https://img.shields.io/npm/v/@project-serum/serum.svg)](https://www.npmjs.com/package/@project-serum/serum)                 | Library for interacting with the Serum DEX |
| [`@project-serum/pool`](/packages/pool)             | [![npm](https://img.shields.io/npm/v/@project-serum/pool.svg)](https://www.npmjs.com/package/@project-serum/pool)             | Client for interacting with Pools |
| [`@project-serum/swap`](/packages/swap)                 | [![npm](https://img.shields.io/npm/v/@project-serum/swap.svg)](https://www.npmjs.com/package/@project-serum/swap)                 | Client for interacting with the Swap Program |
| [`@project-serum/tokens`](/packages/tokens)                 | [![npm](https://img.shields.io/npm/v/@project-serum/tokens.svg)](https://www.npmjs.com/package/@project-serum/tokens)                 | Solana token addresses |

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
