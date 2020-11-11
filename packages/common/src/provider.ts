import {
  Connection,
  Account,
  PublicKey,
  Transaction,
  TransactionSignature,
  SendOptions,
} from '@solana/web3.js';

export class Provider {
  constructor(
    readonly connection: Connection,
    readonly wallet: Wallet,
    readonly opts: SendOptions,
  ) {}

  static local(opts?: SendOptions): Provider {
    opts = opts || {
      preflightCommitment: 'max',
    };
    const connection = new Connection(
      'http://localhost:8899',
      opts.preflightCommitment,
    );
    const wallet = NodeWallet.local();
    return new Provider(connection, wallet, opts);
  }

  // Prepends the wallet as the fee payer to the given signer array, signs
  // the transaction, and sends it off to the cluster.
  async send(
    tx: Transaction,
    signers?: Array<Account | undefined>,
    opts?: SendOptions,
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

    this.wallet.signTransaction(tx);

    signerKps.forEach(kp => {
      tx.partialSign(kp);
    });

    const rawTx = tx.serialize();
    const txId = await this.connection.sendRawTransaction(rawTx, opts);
    await this.connection.confirmTransaction(
      txId,
      this.opts.preflightCommitment,
    );
    return txId;
  }
}

interface Wallet {
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
