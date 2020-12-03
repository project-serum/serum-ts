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
    srm: new PublicKey('3NvhJP2dE7ErBFwVmTDGNdmzLmZaEMGaMTNUCSUimePL'),
    msrm: new PublicKey('2uRbCzdqyfToWzgejMqNy1yk9zh471uWarXAmueZfh4f'),
    god: new PublicKey('CzZGEBxKeZ8LejucC8w7CYanyqJm8nBLJbxgUh43GmWc'),
    megaGod: new PublicKey('HzSJ7HwPHuyoV41BCNaUzMbgMp4CWNTCLsxNPJTC3515'),
    registryProgramId: new PublicKey(
      'JCvKsEMNhN8Akc9SjDknnUPoQE7NjTKWuRPXvfobKpZo',
    ),
    lockupProgramId: new PublicKey(
      'BzTJeMYgKMVAS4DzejoxWKmnAAwaeUWKmD9C4NwvJccD',
    ),
    metaEntityProgramId: new PublicKey(
      '2iJ8Ca4pJAHWuemVJ6dmwXvNgMqRGNAUEdRDd9RuicpR',
    ),
    registrar: new PublicKey('7XsVUB4MB1ivbyQKGspE62zi2JsErtV8YiPbn4qHxJqj'),
    rewardEventQueue: new PublicKey(
      'J8K7o9TGodEj9bABR7B7bfpcTdRPzqucip4PsZqmSPYH',
    ),
    safe: new PublicKey('DkWMjxWBPAVh4YRLDZx6qY4YFCf1PLXorwhEWDtDRmP8'),
    defaultEntity: new PublicKey(
      '5nDBQwRx96ZHghFdVaw6V6XKXiYbmnBStgXvN127h65C',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',
    srm: new PublicKey('J6KxVodeqx1NNgnyBWPNBjv7i12rJV1a186UaQibiWiD'),
    msrm: new PublicKey('7XAhpj3jcc5pRurp1p4yypBfh4E921i4RSrT3U4t1Myr'),
    god: new PublicKey('2mvh2rZ2fgtfRRLet3HCk7GpJH5DfaurmY1pBQcnftxU'),
    megaGod: new PublicKey('DxabmKkdenqCxQKUbwHoi3T8gGUXZXzgVebNLXoCYwx1'),
    registryProgramId: new PublicKey(
      'Cacxbh28W4t7NWyPivWt5JddL4yswdMDp1kiMfsV8RGQ',
    ),
    lockupProgramId: new PublicKey(
      '2YEsNu8yBuco3by5TxDdd8zw7a4X277KMMtewe3QGG4o',
    ),
    metaEntityProgramId: new PublicKey(
      'AdPqoiXRJ58J7YAFbSsHLaBj6k9MARsJzj9fiKmCWqST',
    ),
    registrar: new PublicKey('4UrMdiuCppYuEL5hGLEdY2cNGM4dp1vQ3DdSBraspGU7'),
    rewardEventQueue: new PublicKey(
      'DBXwFhDxQmztTzpBcwCMZeWDNs673xoMTx2TYNht3Fav',
    ),
    safe: new PublicKey('2FYqMGmf7U1BWD1TRga5S6xccX2Ah71Qx5AUTHq161ZX'),
    defaultEntity: new PublicKey(
      'HVcVRAzXc94TGZmgshB3yvHocUi1zXoedU1fmZQ16Y5z',
    ),
  },
};
