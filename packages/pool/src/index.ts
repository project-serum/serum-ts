import { Connection, PublicKey } from '@solana/web3.js';
import { decodePoolState, isPoolState } from './schema';
import { PoolInfo } from './instructions';

export * from './schema';
export { PoolInstructions, PoolInfo, UserInfo } from './instructions';
export {
  PoolTransactions,
  TransactionAndSigners,
  SimplePoolParams,
} from './transactions';

/**
 * Load and decode pool state.
 *
 * Throws an error if the pool is not found or invalid.
 *
 * @param connection Solana connection to use to fetch the pool state.
 * @param address Pool state account address.
 */
export async function loadPoolInfo(
  connection: Connection,
  address: PublicKey,
): Promise<PoolInfo> {
  const accountInfo = await connection.getAccountInfo(address);
  if (accountInfo === null) {
    throw new Error('Pool does not exist');
  }
  if (!isPoolState(accountInfo.data)) {
    throw new Error('Address is not a valid pool');
  }
  return {
    address,
    state: decodePoolState(accountInfo.data),
    program: accountInfo.owner,
  };
}
