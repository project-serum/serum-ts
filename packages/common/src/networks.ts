import { PublicKey } from '@solana/web3.js';

type Networks = { [label: string]: Network };

export type Network = {
  label: string;
  // Cluster.
  url: string;
  explorerClusterSuffix: string;

  // Mints and god accounts.
  srm: PublicKey;
  msrm: PublicKey;
  god: PublicKey;
  megaGod: PublicKey;

  // Programs.
  registryProgramId: PublicKey;
  lockupProgramId: PublicKey;
  metaEntityProgramId: PublicKey;

  // Program accounts.
  safe: PublicKey;
  registrar: PublicKey;
  rewardEventQueue: PublicKey;

  // Misc.
  defaultEntity: PublicKey;
};

export const networks: Networks = {
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://devnet.solana.com',
    explorerClusterSuffix: 'devnet',
    srm: new PublicKey('JsQRYA2cGsn9QZyX7F3nyiQLdzVcFsLJhV58T5UR4e4'),
    msrm: new PublicKey('5gaMWWCaLgNSp6h77mZzUhhze9QzGj1YC166eSNCruHx'),
    god: new PublicKey('BZUK8EREmokVsLKucxtrUz4C6ze4wrm5s6oeWJCzbZ7Y'),
    megaGod: new PublicKey('85vEGKqq3PZ6kcEZYvVRT9ADq2jaToPLhUPgw2MnzJnT'),
    registryProgramId: new PublicKey(
      'AbdZxECBtnqZ4Q5TM8aCcqQEsc6Kjq1dWYAuTSvrmt6G',
    ),
    lockupProgramId: new PublicKey(
      'A2xXx2uMPRfwULwJCqSvVx61dJrgS1gnBzaJ1JcCtVh5',
    ),
    metaEntityProgramId: new PublicKey(
      'DAfQ6aNLHir19XqVxkf1GLfeSG6bcR5Tx6WqsrojzCUQ',
    ),
    registrar: new PublicKey('7XNUpjDHZUu1q2XuPUPWAkWq7zCz5YopegtX36tEjznk'),
    rewardEventQueue: new PublicKey(
      'CfX3BzCmjMEaBrkeTDvHq4D2TFv8u7tkHnkDXrN9J8sk',
    ),
    safe: new PublicKey('C7mz8Yd975tvxqCGuk7GrQwN3pp1zn9gwsbWwWn7t5rA'),
    defaultEntity: new PublicKey(
      'AL7HJTDWB1TgvS9YQMXujUHGr4n2xBKH6GgXXGQLsFVe',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srm: new PublicKey('JsQRYA2cGsn9QZyX7F3nyiQLdzVcFsLJhV58T5UR4e4'),
    msrm: new PublicKey('5gaMWWCaLgNSp6h77mZzUhhze9QzGj1YC166eSNCruHx'),
    god: new PublicKey('BZUK8EREmokVsLKucxtrUz4C6ze4wrm5s6oeWJCzbZ7Y'),
    megaGod: new PublicKey('85vEGKqq3PZ6kcEZYvVRT9ADq2jaToPLhUPgw2MnzJnT'),
    registryProgramId: new PublicKey(
      'AbdZxECBtnqZ4Q5TM8aCcqQEsc6Kjq1dWYAuTSvrmt6G',
    ),
    lockupProgramId: new PublicKey(
      'A2xXx2uMPRfwULwJCqSvVx61dJrgS1gnBzaJ1JcCtVh5',
    ),
    metaEntityProgramId: new PublicKey(
      'DAfQ6aNLHir19XqVxkf1GLfeSG6bcR5Tx6WqsrojzCUQ',
    ),
    registrar: new PublicKey('7XNUpjDHZUu1q2XuPUPWAkWq7zCz5YopegtX36tEjznk'),
    rewardEventQueue: new PublicKey(
      'CfX3BzCmjMEaBrkeTDvHq4D2TFv8u7tkHnkDXrN9J8sk',
    ),
    safe: new PublicKey('C7mz8Yd975tvxqCGuk7GrQwN3pp1zn9gwsbWwWn7t5rA'),
    defaultEntity: new PublicKey(
      'AL7HJTDWB1TgvS9YQMXujUHGr4n2xBKH6GgXXGQLsFVe',
    ),
  },
};
