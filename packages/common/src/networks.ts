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
      '6J7ZoSxtKJUjVLpGRcBrEtvE2T3YVf9mfKUaicndzpCc',
    ),
    lockupProgramId: new PublicKey(
      '4nvqpaMz7H12VgHSABjEDFmH62MoWP3BxfMG3BAFQiBo',
    ),
    metaEntityProgramId: new PublicKey(
      '68gpi9be8NNVTDViQxSYtbM1788uebczX2Vz7obSnQRz',
    ),
    registrar: new PublicKey('8ZS85GGfa92JH6vrmpy8fgQQEBLWwYUwWmpBhcA94fDH'),
    rewardEventQueue: new PublicKey(
      'E3T3WiPeQ96NPqhJGQScG2o2ERYtsM2begzzytJtEbi6',
    ),
    safe: new PublicKey('Dp5zzdTLnYNq9E6H81YQu1ucNLK3FzH3Ah3KedydiNgE'),
    defaultEntity: new PublicKey('W2hbfGYVXuuoN7F8LY9HeuQTgHqibhpwqEiH8G5SgMZ'),
  },
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://devnet.solana.com',
    explorerClusterSuffix: 'devnet',

    srm: new PublicKey('Bap9SwT53SjGPeKq4LAC6i86fCzEzUGGHsYfRiCFSGyF'),
    msrm: new PublicKey('CmtL8e86367ZLiAuJELx4WqmDz7dRnD1oyaiq4TQDdEU'),
    srmFaucet: new PublicKey('49w7DBsZvdjF38wpjs649k5oehCTqL2vbtQVLXyK1yHo'),
    msrmFaucet: new PublicKey('7o5zCHCZitpigrcosZwVFFiEK18iZ6ye9fPHdAjK4nzK'),
    god: new PublicKey('HhthYFVpTqAg5KTMJXQ8QWamJCPy5kEGgXREK4EnDzSU'),
    megaGod: new PublicKey('DmrjeDjs6JNgag4FPegb81DCn2YXyDECkLZvTrmviCDr'),
    registryProgramId: new PublicKey(
      'CKKz2WYvneiLb2mzouWc4iPpKisuXs5XKYn7ZUrRjkeK',
    ),
    lockupProgramId: new PublicKey(
      '8wreDpv5nuY1gee1X4wkqtRkzoGypVYzWBrMmzipAJKN',
    ),
    metaEntityProgramId: new PublicKey(
      'BsVgsh8mqi3qn8eKRiye1a4eF8Qwqot8p2n3ZMNdL2UY',
    ),
    registrar: new PublicKey('7Tzf4D4BU1tzwitXbHeUf7bwMNSSVQXfzPsgnbM5RY7d'),
    rewardEventQueue: new PublicKey(
      '6su6KTdKRGTBjHT5EV2Jr6GnjMSma88uBbBEiuoHsaQf',
    ),
    safe: new PublicKey('CxiGCt8kVm5BuzmWycJdZwXsYt52iLB8Huty5r1xRvRZ'),
    defaultEntity: new PublicKey(
      'CWt29Ye2Qb5vnst9NQhtm8MGzXRyk3VAHsGzLpuHEXFw',
    ),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srm: new PublicKey('AXDqQWGo9SRVNVmno38aEDh25vVKH1dmEhxqjTe9w8uH'),
    msrm: new PublicKey('FS37uYjobq6CBnrCwJUTFNmghMDWLxnmb2yjmnCU9Zxs'),
    srmFaucet: null,
    msrmFaucet: null,
    god: new PublicKey('ZTt3mzFby8exmBMPPWkERBcume9Ymv4No4pbcqeLN2N'),
    megaGod: new PublicKey('7bzSpbyJBcQYdHwC9fptGUT6TMkMm2j3Tu1kDGPwSTYV'),
    registryProgramId: new PublicKey(
      'HHEYHhdtBoKWxL7bT3SYZLWs7a1XicDJqWtnJ9ucnzxy',
    ),
    lockupProgramId: new PublicKey(
      'BHP6hmUiTAFN21A56Ym1WeR7t12ETUey9YFU1Gq37Qtk',
    ),
    metaEntityProgramId: new PublicKey(
      'DRQaj8nYr5yE316csf7eSvhat4HWi19vyoM2Cg7v5AU7',
    ),
    registrar: new PublicKey('BkJSxoqPEKty9fX4xTFad2AEbAiNNTMTnobM2aCAtmvn'),
    rewardEventQueue: new PublicKey(
      'J8Mo35sBSFogfPAQYi54RU9HBAoag8UtQfK68JhRv97L',
    ),
    safe: new PublicKey('HSdZNXCG9HGLP3ZZxJFZDF4wjfviJdYF736sSYy9t4oE'),
    defaultEntity: new PublicKey(
      '2sNZ6vWrPSzWYy19vZneU3S2vwn7MX9MdDmCQHzPLSZq',
    ),
  },
};
