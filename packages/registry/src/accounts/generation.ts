import { struct, Layout } from 'buffer-layout';
import { Basket } from '@project-serum/pool';
import { bool, publicKey, u64 as borshU64 } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import BN from 'bn.js';

export interface Generation {
  initialized: boolean;
  entity: PublicKey;
  generation: BN;
  lastActivePrices: PoolPrices;
}

export interface PoolPrices {
  basket: Basket;
  megaBasket: Basket;
}

export const POOL_PRICES_LAYOUT: Layout<PoolPrices> = struct([
  Basket.replicate('basket'),
  Basket.replicate('megaBasket'),
]);

const GENERATION_LAYOUT: Layout<Generation> = struct([
  bool('initialized'),
  publicKey('entity'),
  borshU64('generation'),
  POOL_PRICES_LAYOUT.replicate('lastActivePrices'),
]);

export function decode(data: Buffer): Generation {
  return GENERATION_LAYOUT.decode(data);
}

export function encode(g: Generation): Buffer {
  const buffer = Buffer.alloc(1000); // TODO: use a tighter buffer.
  const len = GENERATION_LAYOUT.encode(g, buffer);
  return buffer.slice(0, len);
}

export function defaultPoolPrices(): PoolPrices {
  return {
    basket: {
      quantities: [new BN(0)],
    },
    megaBasket: {
      quantities: [new BN(0), new BN(0)],
    },
  };
}

export function defaultGeneration(): Generation {
  return {
    initialized: false,
    entity: new PublicKey(Buffer.alloc(32)),
    generation: new u64(0),
    lastActivePrices: {
      basket: {
        quantities: [new u64(0)],
      },
      megaBasket: {
        quantities: [new u64(0), new u64(0)],
      },
    },
  };
}

export const SIZE: number = encode(defaultGeneration()).length;
