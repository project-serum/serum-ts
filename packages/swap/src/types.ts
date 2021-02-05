import { AccountInfo, Commitment, PublicKey } from '@solana/web3.js';

import { AccountInfo as TokenAccountInfo, AccountLayout, MintInfo, u64 } from '@solana/spl-token';
import BN from 'bn.js';
import { Layout, struct, blob, u8 } from 'buffer-layout';
import { PROGRAM_ID, LATEST_VERSION } from './constants';

export interface TokenAccount {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

export enum CurveType {
  ConstantProduct = 0,
  ConstantPrice = 1,
  Stable = 2,
  ConstantProductWithOffset = 3,
}

export interface PoolConfig {
  curveType: CurveType;
  fees: {
    tradeFeeNumerator: number;
    tradeFeeDenominator: number;
    ownerTradeFeeNumerator: number;
    ownerTradeFeeDenominator: number;
    ownerWithdrawFeeNumerator: number;
    ownerWithdrawFeeDenominator: number;
    hostFeeNumerator: number;
    hostFeeDenominator: number;
  };

  token_b_offset?: number;
  token_b_price?: number;
}

export interface PoolOptions {
  skipPreflight?: boolean;
  commitment?: Commitment;
}


export function getProgramVersion(programId: PublicKey): number {
  return PROGRAM_ID.equals(programId) ? LATEST_VERSION : 1;
}
export interface Mint {
  mintAuthority: Buffer;
  supply: Buffer;
  decimals: number;
  isInitialized: number;
  freezeAuthority: Buffer | null;
}

export const MINT_LAYOUT: Layout<Mint> = struct([
  blob(4),
  blob(32, 'mintAuthority'),
  blob(8, 'supply'),
  u8('decimals'),
  u8('isInitialized'),
  blob(4, 'freezeAuthorityOption'),
  blob(32, 'freezeAuthority'),
]);

export function parseMintData(data: Buffer): MintInfo {
  const decoded = MINT_LAYOUT.decode(data);
  return {
    mintAuthority: new PublicKey(decoded.mintAuthority),
    supply: new BN(decoded.supply),
    decimals: decoded.decimals,
    isInitialized: decoded.isInitialized === 1,
    freezeAuthority:
      decoded.freezeAuthority && new PublicKey(decoded.freezeAuthority),
  };
}

export function parseTokenAccount(data: Buffer): TokenAccountInfo {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    // eslint-disable-next-line new-cap
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
}
