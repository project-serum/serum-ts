import { Connection, PublicKey } from '@solana/web3.js';
import { MintInfo } from '@solana/spl-token';
import { TokenAccount } from './types';

const mintCache = new Map<string, Promise<MintInfo>>();
const pendingAccountCalls = new Map<string, Promise<TokenAccount>>();
const accountsCache = new Map<string, TokenAccount>();
export const cache = {};

// export const cache = {
//   getAccount: async (connection: Connection, pubKey: string | PublicKey) => {
//     let id: PublicKey;
//     if (typeof pubKey === "string") {
//       id = new PublicKey(pubKey);
//     } else {
//       id = pubKey;
//     }
//
//     const address = id.toBase58();
//
//     let account = accountsCache.get(address);
//     if (account) {
//       return account;
//     }
//
//     let query = pendingAccountCalls.get(address);
//     if (query) {
//       return query;
//     }
//
//     query = getAccountInfo(connection, id).then((data) => {
//       pendingAccountCalls.delete(address);
//       accountsCache.set(address, data);
//       return data;
//     }) as Promise<TokenAccount>;
//     pendingAccountCalls.set(address, query as any);
//
//     return query;
//   },
//   getMint: async (connection: Connection, pubKey: string | PublicKey) => {
//     let id: PublicKey;
//     if (typeof pubKey === "string") {
//       id = new PublicKey(pubKey);
//     } else {
//       id = pubKey;
//     }
//
//     let mint = mintCache.get(id.toBase58());
//     if (mint) {
//       return mint;
//     }
//
//     let query = getMintInfo(connection, id);
//
//     mintCache.set(id.toBase58(), query as any);
//
//     return query;
//   },
// };
