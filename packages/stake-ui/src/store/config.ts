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
      '6J7ZoSxtKJUjVLpGRcBrEtvE2T3YVf9mfKUaicndzpCc',
    ),
    lockupProgramId: new PublicKey(
      '4nvqpaMz7H12VgHSABjEDFmH62MoWP3BxfMG3BAFQiBo',
    ),
    registrars: {
      srm: new PublicKey('C4HmoW3HmydAKUCKRR93jUujYrE4G3poDrXFKsf5V6b3'),
      msrm: new PublicKey('8ZS85GGfa92JH6vrmpy8fgQQEBLWwYUwWmpBhcA94fDH'),
    },

    // Whitelisted token mints.
    mints: {},
  },
  devnet: {
    // Cluster.
    label: 'Devnet',
    url: 'https://devnet.solana.com',
    explorerClusterSuffix: 'devnet',

    srmFaucet: new PublicKey('4DBWATaYTC24aMXNTnqPcKdQgVNfiqWABTYZmZ4LuK8Z'),
    msrmFaucet: new PublicKey('2jApmBeQHTt3bKze6QFTRadh38z8i44GNTJhr7eju5zF'),

    registryProgramId: new PublicKey(
      '5v6MzSGkQP6caq9bGjjHyvxxxkj5KAySAG5ZCsuNxHu',
    ),
    lockupProgramId: new PublicKey(
      '9Fcp4Rzz53HHfvgpctX912agYdruY6jjCCJCgi4fHKA1',
    ),
    registrars: {
      token1: new PublicKey('72VPsxo2k6GWvbeEL2BEhNtNuStcZudWajZzGnXgzTJv'),
      token2: new PublicKey('8PYA62aL6FZgzC8XeXhSvY94x4N9SGy8JsfVQS3qwsMm'),
    },
    mints: {
      token1: new PublicKey('ArAjhHCGREmNfo25oG9amzut1sbWuntzakCT6DsiedWh'),
      token2: new PublicKey('4rDNpSZb3yWRpSoedicBwcMcsR4QHauHaGPq6VudM8JM'),
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
