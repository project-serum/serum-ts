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
    srm: new PublicKey('FS6Cnw4QmivAhubRQTR3APd2cooXDTbRUUmm2wnySJ6Y'),
    msrm: new PublicKey('CVt4v9TYQ7Ttm6pHScfBEa9Qr5qbadv6CXZwod619tXJ'),
    god: new PublicKey('4gHmYYrmjP2Fa1D8gfGvjGngnkGfr16wejoA12hF7xms'),
    megaGod: new PublicKey('4QD6HXwh3vUTgqdWWx7HpgfrfPUS9vtUfQMydQNWC4Lm'),
    registryProgramId: new PublicKey(
      '3KMpAgSG3r36gJ3ggrNTpyc93n8Xmdh8E6p1nLPcpY92',
    ),
    lockupProgramId: new PublicKey(
      'CQ1Ygr7kSfRduSG1i5BpgcrktXhCXH99UCfx2SaDuHdj',
    ),
    metaEntityProgramId: new PublicKey(
      'GyY2CVRa2J4bQAhqZumBneqpzC8WQiQCtoyf746VkxQ',
    ),
    registrar: new PublicKey('gk3k89AfGmp8sJMwTevBQTbzjvMzHvv1YK9t2vu5Ahp'),
    rewardEventQueue: new PublicKey(
      'DFV7TTGAA2JcRRVaKLTimtrKDund4kxJZqLPLafSMBWJ',
    ),
    safe: new PublicKey('5BiCAiMDfQnxf6d2uycn2ip94QE599AHm4GvPoUF7DSo'),
    defaultEntity: new PublicKey(
      '7rLxVcbxPN1ZAwiuBLUD4qrDXPPsMF8Qy7BhJmLJwEDj',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srm: new PublicKey('5ETSHKC2orBZzBKEechFBLBSfDhBf3ByVKQWyRAEuFLE'),
    msrm: new PublicKey('AirSq4vsX3XvaazWoQD5TMskonf2w8EX2cjkavQ3ybQF'),
    god: new PublicKey('5erwgD4Lyoz1TjNein913f4QYdNobAgGt31GCW72tiV1'),
    megaGod: new PublicKey('C4GJwGsu2T4AEzyn6F1D3HpVD7TuoSEnGF82wZp4k5gA'),
    registryProgramId: new PublicKey(
      '8jyaHb7bZhTqc37xU1UND5JgPdLsj7YYenjSAgVLG1Pp',
    ),
    lockupProgramId: new PublicKey(
      '9SD4kDxKLJtqY5XFWrzE8FeqpdUxvPr6Avy4JHBHaQww',
    ),
    metaEntityProgramId: new PublicKey(
      '2xMwpwPWGERhbAx2De7ekmeupFvyVLsM94ft69hNR8Pm',
    ),
    registrar: new PublicKey('Gk99MPXPhgoGEJ4bJ6eAfWB6nCbRZXpS8MjDTdcv14cR'),
    rewardEventQueue: new PublicKey(
      'Bv8UqLzUkAEdgYxDe7WXNCMPApC8eMT7vUS4CLYS4qhD',
    ),
    safe: new PublicKey('Gwy3Wx7xnd6xLQE37iDfdJKnFAXBzds7YkjFQBWQAGPq'),
    defaultEntity: new PublicKey(
      '8NKFqZp2uoAeVpeyxi7aZRKUNwPkzoc9JnV5rsLozWyy',
    ),
  },
};
