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

    srm: new PublicKey('GuYiNEona74SWyXUPH6YJiRjsGsXWUKDWxbYGTdfhq9Q'),
    msrm: new PublicKey('8a14E5uo9KReuGc3g6zy49p7pFSCdD6KCAGswKchQXwf'),
    srmFaucet: new PublicKey('dCxamz14WkfVspagG2ATKPqYnnnkbi6gbtBStEGJmye'),
    msrmFaucet: new PublicKey('BAhCxLPhxKH5DV8tKPryncbA5WgAiF6SjhET7u9vGNn2'),
    god: new PublicKey('9qx4JwgrAjqSDTv2fZh7ZJw5YGSgJrCsrVq7a3WNEnaW'),
    megaGod: new PublicKey('7BagAJ5fCGkG2SUQs7bsot3rC4mKJ3reqJLA1Yaav1PC'),
    registryProgramId: new PublicKey(
      '91A57picJWot5GPS5Dfc7bbqzfBPzHHtJ74bD7oetFnn',
    ),
    lockupProgramId: new PublicKey(
      '4s2YYCY6JxiVBz6hNbFAkDFEvECU3xZWa6QxXdCPZteK',
    ),
    metaEntityProgramId: new PublicKey(
      'HbuSt513LQ2UiUCNDxV6q3QJAFf1iwyVfgChRoSAyGGA',
    ),
    registrar: new PublicKey('39i6gAwhJsYuH7vLiLUmx5LuZxmqHp9FXB9sbRHQeGkF'),
    rewardEventQueue: new PublicKey(
      'Bj6BYeBZ5eJW3GtGze49Sf625Cp6jBFdhMdwdYVQaNEc',
    ),
    safe: new PublicKey('HhctHe6D4GhWPJykBdga4U35HVMynoaDiwhj24vK3FNG'),
    defaultEntity: new PublicKey(
      '7Aob4UzZsNnNZbiHUFS1h5JNUGDRBT4FjnLdAAKpp298',
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
