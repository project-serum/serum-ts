import React, {
  ReactNode,
  PropsWithChildren,
  useContext,
  useState,
  useEffect,
} from 'react';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry';
import { networks } from '../store/config';

const TokenListContext = React.createContext<TokenListContextValues>({
  tokenMap: new Map(),
});

type TokenListContextValues = {
  tokenMap: Map<string, TokenInfo>;
};

export function useTokenInfos(): Map<string, TokenInfo> {
  const { tokenMap } = useContext<TokenListContextValues>(TokenListContext);
  return tokenMap;
}

export function TokenRegistryProvider(props: PropsWithChildren<ReactNode>) {
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  useEffect(() => {
    new TokenListProvider().resolve().then(tokens => {
      const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList();
      setTokenMap(
        tokenList.reduce((map, item) => {
          map.set(item.address, item);
          return map;
        }, new Map()),
      );
    });
  }, [setTokenMap]);

  return (
    <TokenListContext.Provider value={{ tokenMap }}>
      {props.children}
    </TokenListContext.Provider>
  );
}

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
