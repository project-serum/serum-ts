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
  mainnet: {
    // Cluster.
    label: 'Mainnet Beta',
    url: 'https://solana-api.projectserum.com',
    explorerClusterSuffix: '',

    srm: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'),
    msrm: new PublicKey('MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L'),
    srmFaucet: null,
    msrmFaucet: null,
    god: new PublicKey('FhmUh2PEpTzUwBWPt4qgDBeqfmb2ES3T64CkT1ZiktSS'),
    megaGod: new PublicKey('FhmUh2PEpTzUwBWPt4qgDBeqfmb2ES3T64CkT1ZiktSS'),
    registryProgramId: new PublicKey(
      'Gw1XNGbSnx7PJcHTTuxxhWfkjjPmq29Qkv1hWbVFnrDp',
    ),
    lockupProgramId: new PublicKey(
      '6GSn1woRF541HaiEWqNofYn8quzJuRBPi1nwoho8zNnh',
    ),
    metaEntityProgramId: new PublicKey(
      '9etE5ZjHZTrZ2wQfyfTSp5WBxjpvaakNJa5fSVToZn17',
    ),
    registrar: new PublicKey('4VuXXLYZ6zztpj6xV2v8pqfAA9rJMUcQznhcL945bYxg'),
    rewardEventQueue: new PublicKey(
      '3pYWVc4cEum5PyVyZFPBK5WDAwCu6SZMSQhv7KcSmbu8',
    ),
    safe: new PublicKey('9GWd7WDUbeYSQ7LYu4KVE99Ards2mmXGi3bRhiptBvdx'),
    defaultEntity: new PublicKey(
      '52saNiBhPsjnkXnHp4rJ3QKWXxKimzkzwcZstBFLeybZ',
    ),
  },
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

    srm: new PublicKey('3XNS3gbTcCjZojbVdMH1E6vHH9Dddc5CrhsDRGSV1wZL'),
    msrm: new PublicKey('7DZVnF2YpmiuyVG8sBFrvgUioq4s9r6y6hwAXKgAVFxT'),
    srmFaucet: null,
    msrmFaucet: null,
    god: new PublicKey('5rhDZHRmUxYWbbesPUuoWJWi6TQNV2vqPrRmSShfDRVS'),
    megaGod: new PublicKey('B2tJ6tuaUyPFdWFQkhuYDhDoVjq2FZRGfQzf9FxJ5F42'),
    registryProgramId: new PublicKey(
      '2HmKKSTrk5Np7F5a5AvcrcaHuQahwpWRyJV2U2MY3Y6k',
    ),
    lockupProgramId: new PublicKey(
      '4DgjvXBztdWL9PwdRbvx7VmJ1nyDRzjzBzM6vr3xFBFH',
    ),
    metaEntityProgramId: new PublicKey(
      '4Ab8DDqvMyRZgr52Txiv1gxCBCt8rQCZqwJoDDfTd4TM',
    ),
    registrar: new PublicKey('DkfLodT4UupSCQSs1YedxjxDmdPqFn1NQEmT5mLNY2ZD'),
    rewardEventQueue: new PublicKey(
      'HhQxMLGDBx7eQgsX1om7Mcw5oQ7nFQBB74HUddiEw35m',
    ),
    safe: new PublicKey('EBbNTwe3Dkwdbb4MA7dSqkm9ecCe3Q5LetFjxy6fvzuB'),
    defaultEntity: new PublicKey(
      'DppBnhqkdLKhEkZ6qHTpKxAXQ9rziPboYYU1wjqokdgN',
    ),
  },
};
