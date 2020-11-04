import {
  Account,
  Connection,
  SystemProgram,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { Layout, struct, Structure, u8, nu64, blob } from 'buffer-layout';
import { AccountInfo, AccountLayout, u64 } from '@solana/spl-token';
import { TokenInstructions } from '@project-serum/serum';
import BN from 'bn.js';

export async function createMint(connection: Connection, payer: Account) {
  const mint = new Account();
  const vault = new Account();
  const txn = new Transaction();
  txn.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint: mint.publicKey,
      decimals: 0,
      mintAuthority: payer.publicKey,
    }),
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: vault.publicKey,
      space: 165,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: vault.publicKey,
      mint: mint.publicKey,
      owner: payer.publicKey,
    }),
    TokenInstructions.mintTo({
      mint: mint.publicKey,
      destination: vault.publicKey,
      amount: new BN(10000),
      mintAuthority: payer.publicKey,
    }),
  );
  await sendAndConfirmTransaction(connection, txn, [payer, mint, vault]);
  return [mint.publicKey, vault.publicKey];
}

export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Account[],
) {
  const txid = await connection.sendTransaction(transaction, signers, {
    preflightCommitment: 'recent',
  });
  await connection.confirmTransaction(txid, 'recent');
  return txid;
}

export function parseTokenAccount(data: Buffer): AccountInfo {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    // eslint-disable-next-line new-cap
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
}
