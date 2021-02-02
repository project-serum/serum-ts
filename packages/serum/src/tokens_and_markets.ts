import { PublicKey } from '@solana/web3.js';
import Markets from './markets.json';
import TokenMints from './token-mints.json';

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
  } else if (
    programId.equals(
      new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    )
  ) {
    return 2;
  } else {
    return 3;
  }
}

export const TOKEN_MINTS: Array<{
  address: PublicKey;
  name: string;
}> = TokenMints.map((mint) => {
  return {
    address: new PublicKey(mint.address),
    name: mint.name,
  };
});

export const MARKETS: Array<{
  address: PublicKey;
  name: string;
  programId: PublicKey;
  deprecated: boolean;
}> = Markets.map((market) => {
  return {
    address: new PublicKey(market.address),
    name: market.name,
    programId: new PublicKey(market.programId),
    deprecated: market.deprecated,
  };
});
