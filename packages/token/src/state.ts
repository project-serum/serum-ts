import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { bool, Layout, option, publicKey, u64 } from '@project-serum/borsh';
import { struct, u8 } from 'buffer-layout';

export interface Mint {
  mintAuthority: PublicKey | null;
  supply: BN;
  decimals: number;
  initialized: boolean;
  freezeAuthority: PublicKey | null;
}

export interface TokenAccount {
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
  delegate: PublicKey | null;
  state: number;
  native: BN | null;
  delegatedAmount: BN;
  closeAuthority: PublicKey | null;
}

export const Mint: Layout<Mint> = struct([
  option(publicKey(), 'mintAuthority'),
  u64('supply'),
  u8('decimals'),
  bool('initialized'),
  option(publicKey(), 'freezeAuthority'),
]);

export const TokenAccount: Layout<TokenAccount> = struct([
  publicKey('mint'),
  publicKey('owner'),
  u64('amount'),
  option(publicKey(), 'delegate'),
  u8('state'),
  option(u64(), 'delegatedAmount'),
  option(publicKey(), 'closeAuthority'),
]);

export function decodeMintAccountData(data: Buffer): Mint {
  return Mint.decode(data);
}

export function decodeTokenAccountData(data: Buffer): TokenAccount {
  return TokenAccount.decode(data);
}
