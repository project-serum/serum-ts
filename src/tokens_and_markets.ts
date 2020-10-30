import { PublicKey } from '@solana/web3.js';
import Markets from "./markets.json";
import TokenMints from "./token-mints.json";

export function getLayoutVersion(programId: PublicKey) {
  if (
    programId.equals(
      new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
    ) ||
    programId.equals(
      new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
    )
  ) {
    return 1;
  }
  return 2;
}

export const TOKEN_MINTS: Array<{ address: PublicKey; name: string }> = TokenMints.map(mint => {
  return {
    address: new PublicKey(mint.address),
    name: mint.name
  }
})

export const MARKETS: Array<{
  address: PublicKey;
  name: string;
  programId: PublicKey;
  deprecated: boolean;
}> = Markets.map(market => {
  return {
    address: new PublicKey(market.address),
    name: market.name,
    programId: new PublicKey(market.programId),
    deprecated: market.deprecated,
  }
})
