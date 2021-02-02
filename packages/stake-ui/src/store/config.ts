import { PublicKey } from '@solana/web3.js';

type Networks = { [label: string]: Network };

export type Network = {
  // Cluster.
  label: string;
  url: string;
  explorerClusterSuffix: string;

  // Faucets.
  srmFaucet: PublicKey | null;
  msrmFaucet: PublicKey | null;

  // Programs.
  registryProgramId: PublicKey;
  lockupProgramId: PublicKey;

  // Staking instances.
  registrars: { [token: string]: PublicKey };

  // Whitelisted token mints.
  mints: { [token: string]: PublicKey };
};

export const networks: Networks = {
  mainnet: {
    // Cluster.
    label: 'Mainnet Beta',
    url: 'https://solana-api.projectserum.com',
    explorerClusterSuffix: '',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      'GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv',
    ),
    lockupProgramId: new PublicKey(
      'AxeE1onr5r6ccMcFF7yMAcxJzQXAXWBUY9wsEnGAp5Du',
    ),
    registrars: {
      srm: new PublicKey('5vJRzKtcp4fJxqmR7qzajkaKSiAb6aT9grRsaZKXU222'),
      msrm: new PublicKey('7uURiX2DwCpRuMFebKSkFtX9v5GK1Cd8nWLL8tyoyxZY'),
      fida: new PublicKey('CJPEDnLSD6gQa94fkFmcPdqikHYMPzAL8NXmaurta2a7'),
      maps: new PublicKey('9tzkorTXKbw73hokMsq34R6ADd13eJF9X4udXQLiGAKc'),
      oxy: new PublicKey('DsWhta1RWA9NYEamaeYsGHpfLRX91bA4bWGnaivtFju2'),
    },
    mints: {
      srm: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'),
      msrm: new PublicKey('MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L'),
      fida: new PublicKey('EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp'),
      maps: new PublicKey('MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb'),
      oxy: new PublicKey('z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M'),
    },
  },
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://devnet.solana.com',
    explorerClusterSuffix: 'devnet',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      '26c6KiAgdFV5o6CMccaWVo6pfFyEGXVXQC5LQvxh14ma',
    ),
    lockupProgramId: new PublicKey(
      '128BA7kccVixqsXF9pGEPBgrgua8Y8AxeN9SfJfnv1T6',
    ),
    registrars: {
      token1: new PublicKey('5qg2Vey9KCNWar2PFsnv1UJavXBxMcCARKEz1rsttTGa'),
      token2: new PublicKey('FVAtZrwcdMYhvBRJBY4Jzg35hGYN1LxptXQkCMpPPETA'),
    },
    mints: {
      token1: new PublicKey('9BS8Ut95cCVsC36mr8oDCCUCRMp2Tiom15vcgenMUh2t'),
      token2: new PublicKey('7aTYaDoZtCWi71op4G71d8VVVM1BiBNqVNUGRm9rcnvY'),
    },
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      'zyX2Mz2hErCRtY89c71xBhG97ecZBzGW7gXQcqK3kGm',
    ),
    lockupProgramId: new PublicKey(
      'G1eYCEgXjdrQa9hHRtmw6HYpccTKrboVmf99LEpo8966',
    ),
    registrars: {
      token1: new PublicKey('BGKtgdD8nUN7nYcReaEmc21ov1LNaRh1RaBPo2bN4u2X'),
      token2: new PublicKey('66YNDsBxejtN6UDodiCTMtjyyxyucMRTJnwb4zFjaRY8'),
    },
    mints: {
      token1: new PublicKey('2NGvipoNMC8AFj2cqwt9GqsLvAg17nAdJjcZgYAzPoRA'),
      token2: new PublicKey('dLiXdXEUiG8N4YzJaq3sbxrT16qhgc5TVFPn4XemQTj'),
    },
  },
};
