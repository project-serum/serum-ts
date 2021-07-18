import { utils } from '@project-serum/anchor';
import {
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';

export interface Middleware {
  initOpenOrders(ix: TransactionInstruction): void;
  newOrderV3(ix: TransactionInstruction): void;
  cancelOrderV2(ix: TransactionInstruction): void;
  cancelOrderByClientIdV2(ix: TransactionInstruction): void;
  settleFunds(ix: TransactionInstruction): void;
  closeOpenOrders(ix: TransactionInstruction): void;
}

export class OpenOrdersPda implements Middleware {
  private _proxyProgramId: PublicKey;
  private _dexProgramId: PublicKey;

  constructor({
    proxyProgramId,
    dexProgramId,
  }: {
    proxyProgramId: PublicKey;
    dexProgramId: PublicKey;
  }) {
    this._proxyProgramId = proxyProgramId;
    this._dexProgramId = dexProgramId;
  }

  public static async openOrdersAddress(
    market: PublicKey,
    owner: PublicKey,
    dexProgramId: PublicKey,
    proxyProgramId: PublicKey,
  ): Promise<PublicKey> {
    // b"open-orders".
    const openOrdersStr = Buffer.from([
      111,
      112,
      101,
      110,
      45,
      111,
      114,
      100,
      101,
      114,
      115,
    ]);
    const [addr] = await PublicKey.findProgramAddress(
      [
        openOrdersStr,
        dexProgramId.toBuffer(),
        market.toBuffer(),
        owner.toBuffer(),
      ],
      proxyProgramId,
    );
    return addr;
  }

  initOpenOrders(ix: TransactionInstruction) {
    const market = ix.keys[2].pubkey;
    const owner = ix.keys[1].pubkey;
    // b"open-orders"
    const openOrdersSeed = Buffer.from([
      111,
      112,
      101,
      110,
      45,
      111,
      114,
      100,
      101,
      114,
      115,
    ]);

    // b"open-orders-init"
    const openOrdersInitSeed = Buffer.from([
      111,
      112,
      101,
      110,
      45,
      111,
      114,
      100,
      101,
      114,
      115,
      45,
      105,
      110,
      105,
      116,
    ]);
    const [openOrders, bump] = utils.publicKey.findProgramAddressSync(
      [
        openOrdersSeed,
        this._dexProgramId.toBuffer(),
        market.toBuffer(),
        owner.toBuffer(),
      ],
      this._proxyProgramId,
    );
    const [marketAuthority, bumpInit] = utils.publicKey.findProgramAddressSync(
      [openOrdersInitSeed, this._dexProgramId.toBuffer(), market.toBuffer()],
      this._proxyProgramId,
    );

    // Override the open orders account and market authority.
    ix.keys[0].pubkey = openOrders;
    ix.keys[4].pubkey = marketAuthority;

    // Prepend to the account list extra accounts needed for PDA initialization.
    ix.keys = [
      { pubkey: this._dexProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...ix.keys,
    ];
    // Prepend the ix discriminator, bump, and bumpInit to the instruction data,
    // which saves the program compute by avoiding recalculating them in the
    // program.
    ix.data = Buffer.concat([Buffer.from([0, bump, bumpInit]), ix.data]);
  }
  newOrderV3(ix: TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([1]), ix.data]);
  }
  cancelOrderV2(ix: TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([2]), ix.data]);
  }
  cancelOrderByClientIdV2(ix: TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([3]), ix.data]);
  }
  settleFunds(ix: TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([4]), ix.data]);
  }
  closeOpenOrders(ix: TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([5]), ix.data]);
  }
}

export class ReferralFees implements Middleware {
  // eslint-disable-next-line
  initOpenOrders(_ix: TransactionInstruction) {}
  // eslint-disable-next-line
  newOrderV3(_ix: TransactionInstruction) {}
  // eslint-disable-next-line
  cancelOrderV2(_ix: TransactionInstruction) {}
  // eslint-disable-next-line
  cancelOrderByClientIdV2(_ix: TransactionInstruction) {}
  // eslint-disable-next-line
  settleFunds(_ix: TransactionInstruction) {}
  // eslint-disable-next-line
  closeOpenOrders(_ix: TransactionInstruction) {}
}

export class Logger implements Middleware {
  initOpenOrders(ix: TransactionInstruction) {
    console.log('Proxying initOpeNorders', ix);
  }
  newOrderV3(ix: TransactionInstruction) {
    console.log('Proxying newOrderV3', ix);
  }
  cancelOrderV2(ix: TransactionInstruction) {
    console.log('Proxying cancelOrderV2', ix);
  }
  cancelOrderByClientIdV2(ix: TransactionInstruction) {
    console.log('Proxying cancelOrderByClientIdV2', ix);
  }
  settleFunds(ix: TransactionInstruction) {
    console.log('Proxying settleFunds', ix);
  }
  closeOpenOrders(ix: TransactionInstruction) {
    console.log('Proxying closeOpenOrders', ix);
  }
}
