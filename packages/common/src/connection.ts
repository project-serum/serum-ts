import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import * as superstruct from 'superstruct';
import assert from 'assert';

export async function getMultipleSolanaAccounts(
  connection: Connection,
  publicKeys: PublicKey[],
): Promise<Array<{ publicKey: PublicKey; account: AccountInfo<Buffer> }>> {
  const args = [publicKeys.map(k => k.toBase58()), { commitment: 'recent' }];
  // @ts-ignore
  const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
  const res = GetMultipleAccountsAndContextRpcResult.create(unsafeRes)

  if (res.error) {
    throw new Error(
      'failed to get info about accounts ' +
        publicKeys.map(k => k.toBase58()).join(', ') +
        ': ' +
        res.error.message,
    );
  }
  assert(typeof res.result !== 'undefined');
  const accounts: Array<{
    executable: any;
    owner: PublicKey;
    lamports: any;
    data: Buffer;
  }> = [];
  for (const account of res.result.value) {
    let value: {
      executable: any;
      owner: PublicKey;
      lamports: any;
      data: Buffer;
    } | null = null;
    if (res.result.value) {
      const { executable, owner, lamports, data } = account;
      assert(data[1] === 'base64');
      value = {
        executable,
        owner: new PublicKey(owner),
        lamports,
        data: Buffer.from(data[0], 'base64'),
      };
    }
    if (value === null) {
      throw new Error('Invalid response');
    }
    accounts.push(value);
  }
  return accounts.map((account, idx) => {
    return {
      publicKey: publicKeys[idx],
      account,
    };
  });
}

function jsonRpcResult(resultDescription: any) {
  const jsonRpcVersion = superstruct.literal('2.0');
  return superstruct.union([
    superstruct.object({
      jsonrpc: jsonRpcVersion,
      id: superstruct.string(),
      error: superstruct.nullable(superstruct.any()),
      result: superstruct.nullable(resultDescription),
    }),
  ]);
}

function jsonRpcResultAndContext(resultDescription: any) {
  return jsonRpcResult({
    context: superstruct.object({
      slot: superstruct.number(),
    }),
    value: resultDescription,
  });
}

const AccountInfoResult = superstruct.object({
  executable: superstruct.boolean(),
  owner: superstruct.string(),
  lamports: superstruct.number(),
  data: superstruct.any(),
  rentEpoch: superstruct.number(),
});

export const GetMultipleAccountsAndContextRpcResult = jsonRpcResultAndContext(
  superstruct.array(superstruct.nullable(AccountInfoResult)),
);
