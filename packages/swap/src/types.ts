import { AccountInfo, Commitment, PublicKey } from '@solana/web3.js';

import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';

export interface TokenAccount {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

export interface PoolInfo {
  pubkeys: {
    // swap program id
    program: PublicKey;
    // pool account public key
    account: PublicKey;
    // constituent asset's holding account public keys
    holdingAccounts: PublicKey[];
    // constituent asset's mint public keys
    holdingMints: PublicKey[];
    // mint of pool token
    mint: PublicKey;
    // account to which fees are paid
    feeAccount?: PublicKey;
  };
  version: number;
  raw: any;
}

export interface LiquidityComponent {
  amount: number;
  account?: TokenAccount;
  mintAddress: string;
}

export interface PoolConfig {
  curveType: 0 | 1;
  tradeFeeNumerator: number;
  tradeFeeDenominator: number;
  ownerTradeFeeNumerator: number;
  ownerTradeFeeDenominator: number;
  ownerWithdrawFeeNumerator: number;
  ownerWithdrawFeeDenominator: number;
}

export interface PoolOptions {
  skipPreflight?: boolean;
  commitment?: Commitment;
}
