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
    srm: new PublicKey('2dwBRECiYGHaPyJ7dGaUaTNV2ZqxYdNcHsQQWEPP6hLp'),
    msrm: new PublicKey('4sCC6FdHNnhPHgJPZX8TmtL4G97LziCUhLCKxJKZB4YH'),
    god: new PublicKey('FRh25x1aUKY46NE11hRqevoe6QXJNHqbxVtJUF5SeJdg'),
    megaGod: new PublicKey('GHtNzKLcZzZz48m8wywNNKaSe3ZvHc2KjER5Jsvh7gqD'),
    registryProgramId: new PublicKey(
      'H4RA56rDsjNZ6wWtKAMTpszw4413YLypb6EKMX8iNjro',
    ),
    lockupProgramId: new PublicKey(
      'AcDSAJzQMkDS3VWDpNwox1JUDbqunb7c4mdHVmjv7Jcf',
    ),
    metaEntityProgramId: new PublicKey(
      '8qz37hNzm78EWTkbhYcgbXHjhdRjqRESJAiBYgfqVX8N',
    ),
    registrar: new PublicKey('2Mqa8EsLkiB2YZoVJLVP6ijAsJ8LyuGh5tqfVYTgmsPC'),
    rewardEventQueue: new PublicKey(
      '2fY9fmFHaMswiTKFJ2pXzQsGBpsTXqa8f7qfjojZLGTs',
    ),
    safe: new PublicKey('DfPZQJngR5UY6nFQ2jA78bfzd3mXhkJZQiJno2VKfnmS'),
    defaultEntity: new PublicKey(
      '4tQMFy2S8TtveSiMHvDZbwWnxF8QYSqbS2XxAPYM57nB',
    ),
  },
};
