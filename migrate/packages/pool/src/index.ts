import { Connection, PublicKey } from '@solana/web3.js';
import { Basket, decodePoolState, isPoolState, PoolAction } from './schema';
import { PoolInfo, RETBUF_PROGRAM_ID } from './instructions';
import { simulateTransaction } from './simulate-transaction';
import { PoolTransactions } from './transactions';

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

/**
 * Fetch the basket for a creation or redemption.
 *
 * For creations, the basket is the quantity of each asset that needs to be paid
 * to the pool to create the given quantity of pool tokens.
 *
 * For redemptions, the basket is the quantity of each asset that is received
 * from the pool in return for redeeming the given quantity of pool tokens.
 *
 * @param connection Connection to use to fetch data.
 * @param pool Pool to interact with.
 * @param action Creation, redemption, or swap.
 * @param payer Arbitrary Solana address. Must hold nonzero SOL and not be owned
 * by a program.
 */
export async function getPoolBasket(
  connection: Connection,
  pool: PoolInfo,
  action: PoolAction,
  payer: PublicKey,
): Promise<Basket> {
  const { transaction } = PoolTransactions.getBasket(pool, action, payer);
  const { value } = await simulateTransaction(
    connection,
    transaction,
    connection.commitment ?? 'single',
  );
  if (value.err) {
    console.warn('Program logs:', value.logs);
    throw new Error('Failed to get pool basket: ' + JSON.stringify(value.err));
  }
  if (value.logs) {
    for (let i = value.logs.length - 2; i >= 0; --i) {
      if (
        value.logs[i + 1] ===
          'Call BPF program ' + RETBUF_PROGRAM_ID.toBase58() &&
        value.logs[i].startsWith('Program log: ')
      ) {
        const data = Buffer.from(
          value.logs[i].slice('Program log: '.length),
          'base64',
        );
        return Basket.decode(data);
      }
    }
  }
  throw new Error('Failed to find pool basket in logs');
}
