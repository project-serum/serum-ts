import {
  SystemProgram,
  TransactionInstruction,
  PublicKey,
  Account,
} from '@solana/web3.js';
import { Provider } from '@project-serum/common';
import * as instruction from './instruction';
import * as accounts from './accounts';

type InitializeInstrParams = {
  programId: PublicKey;
  provider: Provider;
  metadataAccount: Account;
  authority: PublicKey;
  entity: PublicKey;
  name: string;
  about: string;
  imageUrl: string;
  mqueue: Account;
};

export async function initializeInstrs(
  params: InitializeInstrParams,
): Promise<Array<TransactionInstruction>> {
  const {
    programId,
    authority,
    name,
    about,
    imageUrl,
    provider,
    metadataAccount,
    entity,
    mqueue,
  } = params;
  return [
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: metadataAccount.publicKey,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        accounts.metadata.SIZE,
      ),
      space: accounts.metadata.SIZE,
      programId,
    }),
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mqueue.publicKey,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        accounts.mqueue.MQueue.accountSize(),
      ),
      space: accounts.mqueue.MQueue.accountSize(),
      programId,
    }),
    new TransactionInstruction({
      keys: [
        {
          pubkey: metadataAccount.publicKey,
          isWritable: true,
          isSigner: false,
        },
      ],
      programId,
      data: instruction.encode({
        initialize: {
          authority,
          entity,
          name,
          about,
          imageUrl,
          chat: mqueue.publicKey,
        },
      }),
    }),
  ];
}

type UpdateInstrParams = {
  programId: PublicKey;
  authority: PublicKey;
  metadata: PublicKey;
  name: string | null;
  about: string | null;
  imageUrl: string | null;
  chat: PublicKey | null;
};

export async function updateInstr(
  params: UpdateInstrParams,
): Promise<TransactionInstruction> {
  const {
    programId,
    authority,
    name,
    about,
    chat,
    metadata,
    imageUrl,
  } = params;
  return new TransactionInstruction({
    keys: [
      { pubkey: metadata, isWritable: true, isSigner: false },
      { pubkey: authority, isWritable: false, isSigner: true },
    ],
    programId,
    data: instruction.encode({
      updateMetaEntity: {
        name,
        about,
        imageUrl,
        chat,
      },
    }),
  });
}
