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
    srm: new PublicKey('FmFyBrJsMaQKrEu9o3rmuPXEuejaUzfjKrTnADjUyUf1'),
    msrm: new PublicKey('D1WNLkLvSLKFsdKpwdYgKjHjjGJx1riiAUSYowQ8JG7z'),
    god: new PublicKey('4UyNBPrLMxbmrRbmKMeGFJDQKvAxdtnxRUBdyKrLNkdt'),
    megaGod: new PublicKey('D1Gab6oEbg3k9ZZubshfBekUW777ArKTejdycGWfUqmw'),
    registryProgramId: new PublicKey(
      'C9vWHs2dbauSzZq6F2cHFPSRprMgJsCpwZ58GoaSH7HM',
    ),
    lockupProgramId: new PublicKey(
      'DBLQie1sXbXLvLqQ7w4rzQDppEeShxm5JMzkqWnXe12e',
    ),
    metaEntityProgramId: new PublicKey(
      'GWHVH6zbMWHznQRduiYedFJ2c5Zhf3AT8vpvpc2byamZ',
    ),
    registrar: new PublicKey('DumAdaDJGPGTgjX5VT8tc8CNNCEgEuVxK2hFP1Kj2Rf7'),
    rewardEventQueue: new PublicKey(
      '2BxeG7oNADvrvnJC2eT4z3rmdKzdz7T3pR9XSagARAKj',
    ),
    safe: new PublicKey('75PELe8FmaTzAhU18Xdt1ELQpMuy5SCeZ6gv49D2zuN9'),
    defaultEntity: new PublicKey('oymf9QCsFt1aqSkcCGwQ65mnGaELGDCirCKUEJh4vF1'),
  },

  // Fill in with your local cluster addresses.
  localhost: {
    // Cluster.
    label: 'Localhost',
    url: 'http://localhost:8899',
    explorerClusterSuffix: 'localhost',
    srm: new PublicKey('Aff4zU3a8mGjP6zfkQihnPYgFi6FxQNzHspG7x8nnJw1'),
    msrm: new PublicKey('2BAH1MwrmD8dMCWSxgtYXBfsB7kfXUwh7yPvbAYVQNZn'),
    god: new PublicKey('DzTBoP75bpJ7aiztVzonvZHLzmF7FPhX9pXUCMr7VNso'),
    megaGod: new PublicKey('9n4U1Au1WNvCnKLUaSxL7xzeMZMxyTSc3RYCDz3YhMoQ'),
    registryProgramId: new PublicKey(
      '8Puw7KgpNchQbFuzH6ygowrMz2f5bqJgZhFCjBQ8veqL',
    ),
    lockupProgramId: new PublicKey(
      'qKLucNcq7wzeLaXcVTAZ3CnVEiWYEA61fwQZgmAxVfq',
    ),
    metaEntityProgramId: new PublicKey(
      '5vvPrPPyS3rFysLBKs3A6spRQAH91jG9GbQhp71r86pc',
    ),
    registrar: new PublicKey('5vFgjzCVpo9dJg5TfZFC3t1yhj39tay6tNPy6VMvrA74'),
    rewardEventQueue: new PublicKey(
      'CK1aiSuCYf3zsLfecy1eNt2ruj4z2A8rxH588ZAGTo5t',
    ),
    safe: new PublicKey('5Rx2SN84V11QCE2fkTeDekQ3nCANWvSnzs5rsqqrqNu4'),
    defaultEntity: new PublicKey(
      '4bm34niiTuW4pu2cSHngc5PwCTBiBxfuznwxuDs7weNo',
    ),
  },
};
