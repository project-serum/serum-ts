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
  multisigProgramId: PublicKey;

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
    //url: 'https://api.mainnet-beta.solana.com',
    explorerClusterSuffix: '',

    srmFaucet: null,
    msrmFaucet: null,

    registryProgramId: new PublicKey(
      'GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv',
    ),
    lockupProgramId: new PublicKey(
      '6ebQNeTPZ1j7k3TtkCCtEPRvG7GQsucQrZ7sSEDQi9Ks',
    ),
    multisigProgramId: new PublicKey(
      '3S6ALMCGVib4X3vVR3CLpm2K6Ng5qbWFYMTo5jfxWcEq',
    ),
    registrars: {
      srm: new PublicKey('5vJRzKtcp4fJxqmR7qzajkaKSiAb6aT9grRsaZKXU222'),
      msrm: new PublicKey('7uURiX2DwCpRuMFebKSkFtX9v5GK1Cd8nWLL8tyoyxZY'),
      fida: new PublicKey('CJPEDnLSD6gQa94fkFmcPdqikHYMPzAL8NXmaurta2a7'),
      maps: new PublicKey('9tzkorTXKbw73hokMsq34R6ADd13eJF9X4udXQLiGAKc'),
    },
    mints: {
      srm: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'),
      msrm: new PublicKey('MSRMcoVyrFxnSgo5uXwone5SKcGhT1KEJMFEkMEWf9L'),
      fida: new PublicKey('EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp'),
      maps: new PublicKey('MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb'),
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
      'HutezizsH6GE42X1Gk9i5dBrpeCexsjRtxtGBGL9TnXP',
    ),
    multisigProgramId: new PublicKey(
      '2xLp25wHRsHZCWD2oNDhptzTnDCh97YNGjY7wGyxQMCC',
    ),
    lockupProgramId: new PublicKey(
      '6RPATY1CcWgiMZiJzA61fbKSDJTVsQqSr8gdS4vwC68i',
    ),
    registrars: {
      token1: new PublicKey('GCnZCNut5SYiLCBMgaSSqU6tDPBdNbQnCmpS5YNHTpbo'),
      token2: new PublicKey('7HnUrnCPwuGxiVALRWpbUvg1qhhX6KUbS1sg92YPTatr'),
    },
    mints: {
      token1: new PublicKey('EVWmQkGL1AtYbyEG9NvyRN6MhvBaCrvs3Yw4vfsAYTKM'),
      token2: new PublicKey('Hw7xpY3gatekvs9P3uvicauE3RRQcB7xLtuH8RkQdB3i'),
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

    multisigProgramId: new PublicKey(
      '9z7Pq56To96qbVLzuBcf47Lc7u8uUWZh6k5rhcaTsDjz',
    ),
    registryProgramId: new PublicKey(
      'A3ukM9swAsTqVC6g5Zy9FsWXofe5f2JhXMEfzenNf9Q7',
    ),
    lockupProgramId: new PublicKey(
      '2z65xTKJDM4iJBVz5aXtNrWfQvKGgNJvnqY1GL2mkimu',
    ),
    registrars: {
      token1: new PublicKey('Fwi5pie2VgWTDUSRNkca1HdFCke5r3v3mY83JbxtC3CJ'),
      token2: new PublicKey('9kCGBWgHzGGChvmAsmu5jrXwEShZfLxKRTmKdxEpFUBr'),
    },
    mints: {
      token1: new PublicKey('2aE1pietadYMeDtdqKayS4SVo9W4xtC3U7SN4iGWCVcX'),
      token2: new PublicKey('Cgan7PWyBH6Z7JNA6f9kDYgwBMZBxRexpdd29PJgnqah'),
    },
  },
};

// buffer: 5ZTHhWsdskxuY7tA1jBGBjYH74hb5ohor3mwGtB3uHRj
// program: FtxUGjQ2LkEkQ4LETu7JSA4bpkD3GeXSvJcYZLdNS5MG
