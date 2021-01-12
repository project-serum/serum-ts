import { struct, u8, Layout } from 'buffer-layout';
import { publicKey, option } from '@project-serum/borsh';
import { PublicKey } from '@solana/web3.js';

export class Whitelist {
  constructor(
    readonly safe: PublicKey,
    readonly entries: Array<WhitelistEntry>,
  ) {}

  static ITEM_START(): number {
    return 33;
  }

  static LEN(): number {
    return 50;
  }

  static ITEM_SIZE(): number {
    return 65;
  }

  static SIZE(): number {
    return Whitelist.ITEM_START() + Whitelist.LEN() * Whitelist.ITEM_SIZE();
  }
}

export interface WhitelistEntry {
  programId: PublicKey;
  instance: PublicKey | null;
  nonce: number;
}

export const WHITELIST_ENTRY_LAYOUT: Layout<WhitelistEntry> = struct([
  publicKey('programId'),
  option(publicKey(), 'instance'),
  u8('nonce'),
]);

export function decode(data: Buffer): Whitelist {
  if (data.length !== SIZE) {
    throw new Error(`invalid buffer len: ${data.length}`);
  }
  const entries = [];
  const safe = new PublicKey(data.slice(0, Whitelist.ITEM_START()));

  for (
    let k = Whitelist.ITEM_START();
    k < Whitelist.SIZE();
    k += Whitelist.ITEM_SIZE()
  ) {
    const programId = new PublicKey(data.slice(k, k + 32));
    const instance = new PublicKey(data.slice(k + 32, k + 64));
    const nonce = data[k + 64];
    entries.push({
      programId,
      instance,
      nonce,
    });
  }

  return new Whitelist(safe, entries);
}

export const SIZE = Whitelist.SIZE();
