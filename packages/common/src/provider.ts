import {
  Connection,
  Account,
  PublicKey,
  Transaction,
  TransactionSignature,
  ConfirmOptions,
  sendAndConfirmRawTransaction,
} from '@solana/web3.js';

export class Provider {
  constructor(
    readonly connection: Connection,
    readonly wallet: Wallet,
    readonly opts: ConfirmOptions,
  ) {}

  static defaultOptions(): ConfirmOptions {
    return {
      preflightCommitment: 'recent',
      commitment: 'recent',
    };
  }

  static local(url?: string, opts?: ConfirmOptions): Provider {
    opts = opts || Provider.defaultOptions();
    const connection = new Connection(
      url || 'http://localhost:8899',
      opts.preflightCommitment,
    );
    const wallet = NodeWallet.local();
    return new Provider(connection, wallet, opts);
  }

  async send(
    tx: Transaction,
    signers?: Array<Account | undefined>,
    opts?: ConfirmOptions,
  ): Promise<TransactionSignature> {
    if (signers === undefined) {
      signers = [];
    }
    if (opts === undefined) {
      opts = this.opts;
    }

    const signerKps = signers.filter(s => s !== undefined) as Array<Account>;
    const signerPubkeys = [this.wallet.publicKey].concat(
      signerKps.map(s => s.publicKey),
    );

    tx.setSigners(...signerPubkeys);
    tx.recentBlockhash = (
      await this.connection.getRecentBlockhash(opts.preflightCommitment)
    ).blockhash;

    await this.wallet.signTransaction(tx);
    signerKps.forEach(kp => {
      tx.partialSign(kp);
    });

    const rawTx = tx.serialize();

    const txId = await sendAndConfirmRawTransaction(
      this.connection,
      rawTx,
      opts,
    );

    return txId;
  }

  // TODO: batch signing to sollet.
  async sendAll(
    txs: Array<SendTxRequest>,
    opts?: ConfirmOptions,
  ): Promise<Array<TransactionSignature>> {
    const sigs: Array<TransactionSignature> = [];
    for (let k = 0; k < txs.length; k += 1) {
      const t = txs[k];
      const s = await this.send(t.tx, t.signers, opts);
      sigs.push(s);
    }
    return sigs;
  }
}

export type SendTxRequest = {
  tx: Transaction;
  signers: Array<Account | undefined>;
};

export interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  publicKey: PublicKey;
}

export class NodeWallet implements Wallet {
  constructor(readonly payer: Account) {}

  static local(): NodeWallet {
    const payer = new Account(
      Buffer.from(
        JSON.parse(
          require('fs').readFileSync(
            require('os').homedir() + '/.config/solana/id.json',
            {
              encoding: 'utf-8',
            },
          ),
        ),
      ),
    );
    return new NodeWallet(payer);
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.payer);
    return tx;
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}
