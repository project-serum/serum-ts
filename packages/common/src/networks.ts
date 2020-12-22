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

    srm: new PublicKey('5ya5rnzm5MkvCXhLDCJqAUzT16A37ks2DekkfoNnwNMn'),
    msrm: new PublicKey('3fHm9sEBS3CukUX366mwzn3YwEc5zWNzR4JcGK6EVQad'),
    srmFaucet: new PublicKey('4qfd8QDCFXgvcaBfA2KYfQaobBQbRDn4gJxg86NhZRgD'),
    msrmFaucet: new PublicKey('7C9R9UN5tvJ8CTVgEYnRKXtSaVCYd14k98D4hDQf6gT7'),
    god: new PublicKey('GQZdNZhFJdhQhuL2yzVSAbZgsddkvoY2mcwfuT3mpjyW'),
    megaGod: new PublicKey('FPzCxY3zdmgXpDqyEnAhNMpthNdqnCoG2sK3qv77GXH1'),
    registryProgramId: new PublicKey(
      '3ofaHrxu7RdqH8m1wXfVrsTqgwctmx2NsHPv6m7oh1dy',
    ),
    lockupProgramId: new PublicKey(
      'Az4dD6YeA4akzz4Qx3RuQqaCtLEaDiBT8u7mDL24sbAu',
    ),
    metaEntityProgramId: new PublicKey(
      '8v8hwdeyBhmV4y235F9XQ7g5Vz2EYvJTkGqTfrh3Hz5f',
    ),
    registrar: new PublicKey('CU9WcqupNYvJErkGcXFAc97toGNn3sudA3basC3DNyYa'),
    rewardEventQueue: new PublicKey(
      'FimrG7oMRxSARZ1eFKoNYpZb11RmsGughABf7HEtJHg4',
    ),
    safe: new PublicKey('6Duzo1gCreYjn5ha4GvFsYu1xSUDwXdDRzYhPVF9ir5u'),
    defaultEntity: new PublicKey(
      'C4jSXy8jNzzrd9mDyCR4dt4L7MKqnXS6QXzddWRh3jRK',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srm: new PublicKey('5SJCvEnLQkvPj6SPDStiaTwUB1aYa95KewfiBjGL1cmS'),
    msrm: new PublicKey('CxVUauucfZnQPNnvUqScDAVWUfMxvwnSSS9zPqbQQoCw'),
    srmFaucet: null,
    msrmFaucet: null,
    god: new PublicKey('GznWNRfue3Y7htP9WbRfW6uitRa9NMg8oLckR1qSiESB'),
    megaGod: new PublicKey('7Kr3WMCDcW598utPoSeJk7zJ2nmZZBoZikJLp8M9Hghv'),
    registryProgramId: new PublicKey(
      'F3nugLJnYswkr5MhtsbkYnGExw7FiRew6izTkTrabVuG',
    ),
    lockupProgramId: new PublicKey(
      'D5E96snBmYVFd6Gg6BtXKhbJWdjBRhqYYvibyaaKcsVv',
    ),
    metaEntityProgramId: new PublicKey(
      'Cu372h1sfqBVUG83cYYocmBGTNc1UNWghfui2TczJjLZ',
    ),
    registrar: new PublicKey('3qMdUVwah5Ej1rxaWFkrx6HDxcZ3aZoxaiPj5yP7fiv8'),
    rewardEventQueue: new PublicKey(
      'DYx33pZf9BgSNPGxSvCEZjWjDTk9ybAqRnGKMHPYy7G8',
    ),
    safe: new PublicKey('252GViKQx5Q6HmmDN3LgkevcMCnRgMREqsUz9DZojroH'),
    defaultEntity: new PublicKey(
      'Gb1Gobnvyx2BPn7KdmNayi8bVbqBJZ3Xy9pxC9r7cPxW',
    ),
  },
};
