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
  stakeProgramId: PublicKey;
  lockupProgramId: PublicKey;
  retbufProgramId: PublicKey;
  metaEntityProgramId: PublicKey;

  // Program accounts.
  safe: PublicKey;
  registrar: PublicKey;
  rewardEventQueue: PublicKey;
  retbuf: PublicKey;

  // Misc.
  defaultEntity: PublicKey;
};

export const networks: Networks = {
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://devnet.solana.com',
    explorerClusterSuffix: 'devnet',

    srm: new PublicKey('DLRk8GWo1YF4Kc5DrVQkaMDQti27VVGzR3Y1Tm8Frpyj'),
    msrm: new PublicKey('CrtnNeZg3tnRKnxxYxjsnkYNk1xRjhEci8ZJhuRAU7WX'),
    god: new PublicKey('HtbxQ8ZfenVhw5G8GSVK5nymbNXXo37fwwp9sjAjaBEx'),
    megaGod: new PublicKey('DKmDLZUUkfaFEQ3PWYezmoL3BwaEt1QHHYrLGPWuCMiV'),
    registryProgramId: new PublicKey(
      'G5W9X8gjf2v8QH3D7aQrFhHSxMK7sxB1wQQpKPue2Nnv',
    ),
    stakeProgramId: new PublicKey(
      'APU8W2tEUhiAAeaiEtYKdaMtB3KrBQXqyiinvjGurvBf',
    ),
    lockupProgramId: new PublicKey(
      'Bk9M7yycNZiKkFtKDzzLQAhvQjWMqxYSFJzxFspL9uJ',
    ),
    retbufProgramId: new PublicKey(
      '3w2Q6XjS2BDpxHVRzs8oWbNuH7ivZp1mVo3mbq318oyG',
    ),
    metaEntityProgramId: new PublicKey(
      'H6PGzjRWMBd2dajxL5ZjDc9LU4onSB5PbrqHS94Hgoed',
    ),
    registrar: new PublicKey('2w6i8FLi7DJ2UrTTGeKwkotgvM2k9FtfcP7vLfzT5pnx'),
    rewardEventQueue: new PublicKey(
      'ozD1sY1rdizmPkr29PCyrWVrUC73HLQurTnvtsFmC6P',
    ),
    safe: new PublicKey('2u8tjVJuz8P7EYa4WL3x2oHndjZLZNfA4vkWaa3SP75f'),
    retbuf: new PublicKey('8PUeeTe22fHJqTVB5wahQmqZjaHzDPC7arYhWSnTLqZA'),
    defaultEntity: new PublicKey(
      'GQmf9Ag2EHC6RyJuxyEkUMMRzB8zhhSEq8Bmae7Wxyhi',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srm: new PublicKey('49uPApDJo81q2ruSV7QGcKbWvrvidwkuwiBdNGqNLEDj'),
    msrm: new PublicKey('5WzVn4fzZwL1pHp3o1SnQwNhB6YjfinhQNZMRtv4PDRV'),
    god: new PublicKey('8WmKCQiuBo97cGE7NTo6Gvfec8fi9sMCwbdyToXk99eS'),
    megaGod: new PublicKey('4L6KRfJ2G1Gp59Cmav3Wux6wuyArvuhXx1R3ozCDF7Zy'),
    registryProgramId: new PublicKey(
      '7VA5eMqGwEvkkRsgrz28uFeqAKAMQ32TBHpTakKpWSBT',
    ),
    stakeProgramId: new PublicKey(
      'FcznkS6Yo6mfhG6Rp49A5GTiag9AE9g8sZdfb5tUV271',
    ),
    lockupProgramId: new PublicKey(
      '9quusFhQuZPHTCWRNAiZspJtei639KNgmaJNFYUxbPwZ',
    ),
    retbufProgramId: new PublicKey(
      'shmem4EWT2sPdVGvTZCzXXRAURL9G5vpPxNwSeKhHUL',
    ),
    metaEntityProgramId: new PublicKey(
      'Ftm99ezozbjdSZJBU3raB316jdijGDWx1uSxRDwK2UUZ',
    ),
    registrar: new PublicKey('C8kZJRjMfQAC6Gjn8s25oHsDwQegMebWafDUBacmKCxR'),
    rewardEventQueue: new PublicKey(
      '5a4WCYb4bPWJE7e8VGdr5ntUsapE6z9RBpc4Ci5CYfWn',
    ),
    safe: new PublicKey('Gqhc69ywiiWTaLEJArC6pqHwzPCqGRmNMaiLUbsD5jqU'),
    retbuf: new PublicKey('7XxFAvQ9HoHch1jH1tJerPcAJ4zg65ZhusdMWeK5ZPx'),
    defaultEntity: new PublicKey(
      'AX1XPYdcgiSrkKupNr8ywWFE1sNe6Ln79c5qyHGsRvju',
    ),
  },
};
