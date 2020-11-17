import { Connection, PublicKey } from '@solana/web3.js';
import { ProgramAccount } from './';
import { AccountInfo as TokenAccount } from '@solana/spl-token';
import { TokenInstructions } from '@project-serum/serum';
import * as bs58 from 'bs58';
import * as BufferLayout from 'buffer-layout';

export async function getOwnedTokenAccounts(
  connection: Connection,
  publicKey: PublicKey,
): Promise<ProgramAccount<TokenAccount>[]> {
  let filters = getOwnedAccountsFilters(publicKey);
  // @ts-ignore
  let resp = await connection._rpcRequest('getProgramAccounts', [
    TokenInstructions.TOKEN_PROGRAM_ID.toBase58(),
    {
      commitment: connection.commitment,
      filters,
    },
  ]);
  if (resp.error) {
    throw new Error(
      'failed to get token accounts owned by ' +
        publicKey.toBase58() +
        ': ' +
        resp.error.message,
    );
  }
  return (
    resp.result
      // @ts-ignore
      .map(({ pubkey, account: { data } }) => {
        data = bs58.decode(data);
        return {
          publicKey: new PublicKey(pubkey),
          account: parseTokenAccountData(data),
        };
      })
  );
}

// todo: remove
export const ACCOUNT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(32, 'mint'),
  BufferLayout.blob(32, 'owner'),
  BufferLayout.nu64('amount'),
  BufferLayout.blob(93),
]);
export const MINT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(44),
  BufferLayout.u8('decimals'),
  BufferLayout.blob(37),
]);

export function parseTokenAccountData(data: any) {
  // @ts-ignore
  let { mint, owner, amount } = ACCOUNT_LAYOUT.decode(data);
  return {
    mint: new PublicKey(mint),
    owner: new PublicKey(owner),
    amount,
  };
}

// @ts-ignore
export function parseMintData(data) {
  // @ts-ignore
  let { decimals } = MINT_LAYOUT.decode(data);
  return { decimals };
}

// @ts-ignore
export function getOwnedAccountsFilters(publicKey: PublicKey) {
  return [
    {
      memcmp: {
        // @ts-ignore
        offset: ACCOUNT_LAYOUT.offsetOf('owner'),
        bytes: publicKey.toBase58(),
      },
    },
    {
      dataSize: ACCOUNT_LAYOUT.span,
    },
  ];
}
