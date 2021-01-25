import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

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
  if (mint.equals(SRM)) {
    return 'SRM';
  } else if (mint.equals(MSRM)) {
    return 'MSRM';
  } else {
    return mint.toString();
  }
}

const SRM = new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');
const MSRM = new PublicKey('MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L');
