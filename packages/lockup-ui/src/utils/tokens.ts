import BN from 'bn.js';

const SRM_DECIMALS = 6;

export function displaySrm(amount: BN): string {
  return toDisplay(amount, SRM_DECIMALS);
}

export function fromDisplaySrm(amount: number): BN {
  return fromDisplay(amount, SRM_DECIMALS);
}

export function displayMsrm(amount: BN): string {
  return amount.toString();
}

export function fromDisplayMsrm(amount: number): BN {
  return new BN(amount);
}

// TODO: do these conversions in a safer way.
export function toDisplay(amount: BN | number, decimals: number): string {
  if (amount instanceof BN) {
    amount = amount.toNumber();
  }
  return (amount / 10 ** decimals).toString();
}

export function fromDisplay(amount: number, decimals: number): BN {
  return new BN(amount * 10 ** decimals);
}
