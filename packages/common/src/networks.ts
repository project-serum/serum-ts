import { PublicKey } from '@solana/web3.js';

type Networks = { [label: string]: Network };

export type Network = {
  label: string;
  // Cluster.
  url: string;
  explorerClusterSuffix: string;

  // Mints.
  srm: PublicKey;
  msrm: PublicKey;

  // Faucets.
  srmFaucet: PublicKey | null;
  msrmFaucet: PublicKey | null;

  // God accounts (used for integration tests).
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

    srmFaucet: new PublicKey('9q8NhG9U95S1M3NZGunKnXRpZ81LW65tAzzHgyknNj2r'),
    msrmFaucet: new PublicKey('6oAY2zRqF6dfGNCQSVGF6PB2dFgrtsajQCssvFCpC3Cm'),
    srm: new PublicKey('4Ghge2MMPmWXeD2FR541akGhjjgUi7RUtk7DBP5bTwGB'),
    msrm: new PublicKey('5PsAVQLCrgtKqZpLdg7HsTXHMcvVCQ1c4bFHHej8Axxn'),
    god: new PublicKey('7YbS8znK1eY3p6z1Xo6eCyx7XFyZPBs1mTdVCLsFGCqc'),
    megaGod: new PublicKey('GDhZrqcjUMJokqm6cjhyMXheBxxvUkfq3Q8YUtZ6BdCm'),
    registryProgramId: new PublicKey(
      'FigXetJcXogqm94qfmyKWy6U5KJAwtxSgJMjUHercVQp',
    ),
    lockupProgramId: new PublicKey(
      'CiNaYvdnQ42BNdbKvvAapHxiP18pvc3Vk5WuZ59ia64x',
    ),
    metaEntityProgramId: new PublicKey(
      '8wfM5sd5Yivn4WWkcSp4pNua7ytDvjeyLVLaU3QWiLAT',
    ),
    registrar: new PublicKey('BB8JRs7FUTawxV6QELRGoNus2TNaMg1egG9rKosxCiAW'),
    rewardEventQueue: new PublicKey(
      '5Ch6eHTC9rXHk5pLe9EfdYxWYUdtBpN9FY5xuH8BLawg',
    ),
    safe: new PublicKey('3CuTNekgrJykh6ukB8Ty7Y6V5gTX4DD3p38HLYAtqV6c'),
    defaultEntity: new PublicKey(
      'BUvnMzShmicx2uiw2sJSRSHp19DLSfDijnYbwezAncwG',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srmFaucet: null,
    msrmFaucet: null,
    srm: new PublicKey('2kU9eab4BbXZx4k7FhJdwe4gzc1bSEqASiohzq3BKsaY'),
    msrm: new PublicKey('8e4kjAnCZkMUx2XVdRSZg8JQ2nXXfy8GWQWCXrNKrQad'),
    god: new PublicKey('DNcaasMboG4AdfW2T81A6YiB6vo26zU38aXmaddgL1c'),
    megaGod: new PublicKey('Gj6XnPBYEvKQWtejiVqBnbUfaLXZ5WuozU39nnMhMyMN'),
    registryProgramId: new PublicKey(
      'DUuGKXGUeQhN9bsDJ3bhN8XQPaNiivNnqYRyREP6mL79',
    ),
    lockupProgramId: new PublicKey(
      '2dHazPdUjqRBnF7qh2NeCgKCW5B5fYgYtXRtxkpvjUbf',
    ),
    metaEntityProgramId: new PublicKey(
      'CbBi6FvvuNwkwjzULY2giDrcMrE8RCYh1LXpvsYiDMsJ',
    ),
    registrar: new PublicKey('HCCd9pShhv158orEyA2BGRsvEQ8zEg2aqHHACNCwn3MR'),
    rewardEventQueue: new PublicKey(
      'GzYK3YuHgGRoZ57ByKQUbTBbXkXaMAEo7KXNgFe6bxoN',
    ),
    safe: new PublicKey('3PA8hDnUjyooFnc2f6WUDwnNBrVNN1CmCC5GC6fM6HY2'),
    defaultEntity: new PublicKey(
      '791GDmb4RMZk7PJfczahw5fTubbSxgonWjtmsWmmUoAn',
    ),
  },
};
