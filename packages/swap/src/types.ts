import { AccountInfo, Commitment, PublicKey } from '@solana/web3.js';

import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';

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
