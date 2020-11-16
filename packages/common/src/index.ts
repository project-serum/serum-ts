import {
  Account,
  Connection,
  SystemProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Provider } from './provider';
import { Layout, struct, Structure, u8, nu64, blob } from 'buffer-layout';
import { AccountInfo, AccountLayout, u64 } from '@solana/spl-token';
import { TokenInstructions } from '@project-serum/serum';
import BN from 'bn.js';

export * from './provider';

// Mainnet.
// export const SPL_SHARED_MEMORY_ID = new PublicKey(
//   'shmem4EWT2sPdVGvTZCzXXRAURL9G5vpPxNwSeKhHUL',
// );

// Devnet.
export const SPL_SHARED_MEMORY_ID = new PublicKey(
  '3w2Q6XjS2BDpxHVRzs8oWbNuH7ivZp1mVo3mbq318oyG',
);

export async function createMint(
  provider: Provider,
  authority?: PublicKey,
): Promise<PublicKey> {
  if (authority === undefined) {
    authority = provider.wallet.publicKey;
  }
  const mint = new Account();
  const instructions = await createMintInstructions(
    provider,
    authority,
    mint.publicKey,
  );

  const tx = new Transaction();
  tx.add(...instructions);

  await provider.send(tx, [mint]);

  return mint.publicKey;
}

export async function createMintInstructions(
  provider: Provider,
  authority: PublicKey,
  mint: PublicKey,
): Promise<TransactionInstruction[]> {
  let instructions = [
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint,
      decimals: 0,
      mintAuthority: authority,
    }),
  ];
  return instructions;
}

export async function createMintAndVault(
  provider: Provider,
  amount: BN,
  owner?: PublicKey,
): Promise<[PublicKey, PublicKey]> {
  if (owner === undefined) {
    owner = provider.wallet.publicKey;
  }
  const mint = new Account();
  const vault = new Account();
  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeMint({
      mint: mint.publicKey,
      decimals: 0,
      mintAuthority: provider.wallet.publicKey,
    }),
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: vault.publicKey,
      space: 165,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        165,
      ),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: vault.publicKey,
      mint: mint.publicKey,
      owner,
    }),
    TokenInstructions.mintTo({
      mint: mint.publicKey,
      destination: vault.publicKey,
      amount,
      mintAuthority: provider.wallet.publicKey,
    }),
  );
  await provider.send(tx, [mint, vault]);
  return [mint.publicKey, vault.publicKey];
}

export async function createTokenAccount(
  provider: Provider,
  mint: PublicKey,
  owner: PublicKey,
): Promise<PublicKey> {
  const vault = new Account();
  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: vault.publicKey,
      space: 165,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        165,
      ),
      programId: TokenInstructions.TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: vault.publicKey,
      mint,
      owner,
    }),
  );
  await provider.send(tx, [vault]);
  return vault.publicKey;
}

export async function createAccountRentExempt(
  provider: Provider,
  programId: PublicKey,
  size: number,
): Promise<Account> {
  const acc = new Account();
  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: acc.publicKey,
      space: size,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        size,
      ),
      programId,
    }),
  );
  await provider.send(tx, [acc]);
  return acc;
}

export async function getTokenAccount(
  provider: Provider,
  addr: PublicKey,
): Promise<AccountInfo> {
  let depositorAccInfo = await provider.connection.getAccountInfo(addr);
  if (depositorAccInfo === null) {
    throw new Error('Failed to find token account');
  }
  return parseTokenAccount(depositorAccInfo.data);
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

export function sleep(ms: number): Promise<any> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
