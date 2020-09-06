import { PublicKey } from '@solana/web3.js';
import { getLayoutVersion } from './tokens_and_markets';

export function supportsSrmFeeDiscounts(programId: PublicKey) {
  return getLayoutVersion(programId) > 1;
}

export function getFeeRates(feeTier: number): { taker: number; maker: number } {
  if (feeTier === 1) {
    // SRM2
    return { taker: 0.002, maker: -0.0003 };
  } else if (feeTier === 2) {
    // SRM3
    return { taker: 0.0018, maker: -0.0003 };
  } else if (feeTier === 3) {
    // SRM4
    return { taker: 0.0016, maker: -0.0003 };
  } else if (feeTier === 4) {
    // SRM5
    return { taker: 0.0014, maker: -0.0003 };
  } else if (feeTier === 5) {
    // SRM6
    return { taker: 0.0012, maker: -0.0003 };
  } else if (feeTier === 6) {
    // MSRM
    return { taker: 0.001, maker: -0.0005 };
  }
  // Base
  return { taker: 0.0022, maker: -0.0003 };
}

export function getFeeTier(msrmBalance: number, srmBalance: number): number {
  if (msrmBalance >= 1) {
    return 6;
  } else if (srmBalance >= 1_000_000) {
    return 5;
  } else if (srmBalance >= 100_000) {
    return 4;
  } else if (srmBalance >= 10_000) {
    return 3;
  } else if (srmBalance >= 1_000) {
    return 2;
  } else if (srmBalance >= 100) {
    return 1;
  } else {
    return 0;
  }
}
