import { Transaction, PublicKey, Account } from '@solana/web3.js';
import * as serumCmn from '@project-serum/common';
import * as anchor from '@project-serum/anchor';

export async function registrarSigner(
  programId: PublicKey,
  registrar: PublicKey,
): Promise<{ publicKey: PublicKey; nonce: number }> {
  const [publicKey, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [registrar.toBuffer()],
    programId,
  );
  return {
    publicKey,
    nonce,
  };
}

export async function memberSigner(
  programId: PublicKey,
  registrar: PublicKey,
  member: PublicKey,
): Promise<{ publicKey: PublicKey; nonce: number }> {
  const [publicKey, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [registrar.toBuffer(), member.toBuffer()],
    programId,
  );
  return {
    publicKey,
    nonce,
  };
}

export async function vendorSigner(
  programId: PublicKey,
  registrar: PublicKey,
  vendor: PublicKey,
): Promise<{ publicKey: PublicKey; nonce: number }> {
  const [publicKey, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [registrar.toBuffer(), vendor.toBuffer()],
    programId,
  );
  return {
    publicKey,
    nonce,
  };
}

// Returns the seed used to derive a member address. This is not necessary, but
// a UX convenience. Each member address is a deterministic function of the
// program, beneficiary, and this (constant) seed.
export async function memberSeed(registrar: PublicKey): Promise<string> {
  const seed = await anchor.utils.sha256(`${registrar.toString()}:Member`);
  // The max length of seeds allowed by Solana is 32.
  return seed.slice(0, 32);
}

// Creates all the SPL otken vaults needed for constructing a `Member` account.
export async function createBalanceSandbox(
  provider: serumCmn.Provider,
  r: any,
  registrySigner: PublicKey,
) {
  const spt = new Account();
  const vault = new Account();
  const vaultStake = new Account();
  const vaultPw = new Account();

  const lamports = await provider.connection.getMinimumBalanceForRentExemption(
    165,
  );

  const createSptIx = await serumCmn.createTokenAccountInstrs(
    provider,
    spt.publicKey,
    r.poolMint,
    registrySigner,
    lamports,
  );
  const createVaultIx = await serumCmn.createTokenAccountInstrs(
    provider,
    vault.publicKey,
    r.mint,
    registrySigner,
    lamports,
  );
  const createVaultStakeIx = await serumCmn.createTokenAccountInstrs(
    provider,
    vaultStake.publicKey,
    r.mint,
    registrySigner,
    lamports,
  );
  const createVaultPwIx = await serumCmn.createTokenAccountInstrs(
    provider,
    vaultPw.publicKey,
    r.mint,
    registrySigner,
    lamports,
  );
  let tx0 = new Transaction();
  tx0.add(
    ...createSptIx,
    ...createVaultIx,
    ...createVaultStakeIx,
    ...createVaultPwIx,
  );
  let signers0 = [spt, vault, vaultStake, vaultPw];

  const tx = { tx: tx0, signers: signers0 };

  return [
    tx,
    {
      spt: spt.publicKey,
      vault: vault.publicKey,
      vaultStake: vaultStake.publicKey,
      vaultPw: vaultPw.publicKey,
    },
  ];
}

// Returns all events in the reward queue.
export function rewardEvents(rewardQ: any): any[] {
  let events = [];
  let tail = rewardQ.tail;
  while (tail < rewardQ.head) {
    let idx = tail % rewardQ.events.length;
    events.push(rewardQ.events[idx]);
    tail += 1;
  }
  return events;
}
