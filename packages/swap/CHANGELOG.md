# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5]

### Added

- `CurveType` enum - enables support for custom curves. Currently supported:
  - ConstantProduct = 0
  - ConstantPrice = 1
  - Stable = 2
  - ConstantProductWithOffset = 3
- `token_b_offset` and `token_b_price` in `PoolConfig`
- `withdrawExactOneInstruction` - support for single-side withdrawals
- `depositExactOneInstruction` - support for single-side deposits
- Used ephemeral authority for all transfers

### Changed

- Moved fees fields into a nested property `fees` inside `PoolConfig`
- `initializePool` requires now programId to support multiple contracts
- `makeInitializePoolTransaction` requires now programId to support multiple contracts
- `swapInstruction` added transferAuthority
- `depositInstruction` added transferAuthority
- `withdrawInstruction` added transferAuthority
- `createInitSwapInstruction` uses PoolConfig object instead of individual fields

### Removed
