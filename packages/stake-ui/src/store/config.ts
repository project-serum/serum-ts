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
      '6ebQNeTPZ1j7k3TtkCCtEPRvG7GQsucQrZ7sSEDQi9Ks',
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
      'DVBFLTDaN29K69yW61AiVTcQuEmbnuodvW9qGXpQQuRc',
    ),
    lockupProgramId: new PublicKey(
      'FXef1WbmM9WHzFMDcXvsgPWzgHQz7Hrz1CoqNUq5EEi9',
    ),
    registrars: {
      token1: new PublicKey('4QK3drbHCjouKbHUGP9PW8AYH6LuB5f4DQDq4ExCZD5u'),
      token2: new PublicKey('Gz6kVhoUc9mHF2bXkAQik7gXtDoWKvDkJ99fr1v2WTbi'),
    },
    mints: {
      token1: new PublicKey('2CRHQWy4LaM5pXGwfYkgQLvxRJh4vsm4FGzTpjXTFe2p'),
      token2: new PublicKey('GeRsQMtERmiEief53PDv8iTDTDZe8RPpqfcHWukR5nGt'),
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
