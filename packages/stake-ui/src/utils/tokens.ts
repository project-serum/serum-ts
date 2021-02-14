import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { networks } from '../store/config';

export function fromDisplay(amount: number, decimals: number): BN {
  return new BN(amount * 10 ** decimals);
}

export function toDisplay(amount: BN | number, decimals: number): string {
  if (amount instanceof BN) {
    amount = amount.toNumber();
  }
  return (amount / 10 ** decimals).toString();
}

export function toDisplayLabel(mint: PublicKey): string {
  let whitelistedMint = Object.keys(networks.mainnet.mints)
    .filter(label => networks.mainnet.mints[label].equals(mint))
    .pop();
  if (whitelistedMint) {
    return whitelistedMint.toUpperCase();
  }
  return mint.toString();
}
