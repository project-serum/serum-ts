import { PublicKey } from '@solana/web3.js';
import Markets from './markets.json';
import Tokens from '@openbook-dex/tokens/src/mainnet-beta.json';

export const PROGRAM_LAYOUT_VERSIONS = {
  '4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn': 1,
  BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg: 1,
  EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o: 2,
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: 3,
};

export function getLayoutVersion(programId: PublicKey) {
  return PROGRAM_LAYOUT_VERSIONS[programId.toString()] || 3;
}

export const TOKEN_MINTS: Array<{
  address: PublicKey;
  name: string;
}> = Tokens.map((token) => {
  return {
    address: new PublicKey(token.mintAddress),
    name: token.tokenSymbol,
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
