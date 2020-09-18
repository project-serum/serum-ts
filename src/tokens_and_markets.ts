import { MSRM_MINT, SRM_MINT, WRAPPED_SOL_MINT } from './token-instructions';
import { PublicKey } from '@solana/web3.js';

export function getLayoutVersion(programId: PublicKey) {
  if (
    programId.equals(
      new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
    ) ||
    programId.equals(
      new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
    )
  ) {
    return 1;
  }
  return 2;
}

export const TOKEN_MINTS: Array<{ address: PublicKey; name: string }> = [
  {
    address: new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E'),
    name: 'BTC',
  },
  {
    address: new PublicKey('2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk'),
    name: 'ETH',
  },
  {
    address: new PublicKey('AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3'),
    name: 'FTT',
  },
  {
    address: new PublicKey('3JSf5tPeuscJGtaCp5giEiDhv51gQ4v3zWg8DGgyLfAB'),
    name: 'YFI',
  },
  {
    address: new PublicKey('CWE8jPTUYhdCTZYWPTe1o5DFqfdjzWKc9WKz6rSjQUdG'),
    name: 'LINK',
  },
  {
    address: new PublicKey('Ga2AXHpfAF6mv2ekZwcsJFqu7wB4NV331qNH7fW9Nst8'),
    name: 'XRP',
  },
  {
    address: new PublicKey('BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4'),
    name: 'USDT',
  },
  {
    address: new PublicKey('BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW'),
    name: 'USDC',
  },
  {
    address: MSRM_MINT,
    name: 'MSRM',
  },
  {
    address: SRM_MINT,
    name: 'SRM',
  },
  {
    address: new PublicKey('AR1Mtgh7zAtxuxGd2XPovXPVjcSdY3i4rQYisNadjfKy'),
    name: 'SUSHI',
  },
  {
    address: new PublicKey('SF3oTvfWzEP3DTwGSvUXRrGTvr75pdZNnBLAH9bzMuX'),
    name: 'SXP',
  },
  {
    address: new PublicKey('CsZ5LZkDS7h9TDKjrbL7VAwQZ9nsRu8vJLhRYfmGaN8K'),
    name: 'ALEPH',
  },
  {
    address: new PublicKey('BtZQfWqDGbk9Wf2rXEiWyQBdBY1etnUUn6zEphvVS7yN'),
    name: 'HGET',
  },
  {
    address: new PublicKey('5Fu5UUgbjpUvdBveb3a1JTNirL8rXtiYeSMWvKjtUNQv'),
    name: 'CREAM',
  },
  {
    address: new PublicKey('873KLxCbz7s9Kc4ZzgYRtNmhfkQrhfyWGZJBmyCbC3ei'),
    name: 'UBXT',
  },
  {
    address: new PublicKey('HqB7uswoVg4suaQiDP3wjxob1G5WdZ144zhdStwMCq7e'),
    name: 'HNT',
  },
  {
    address: new PublicKey('9S4t2NEAiJVMvPdRYKVrfJpBafPBLtvbvyS3DecojQHw'),
    name: 'FRONT',
  },
  { address: WRAPPED_SOL_MINT, name: 'SOL' },
];

export const MARKETS: Array<{
  address: PublicKey;
  name: string;
  programId: PublicKey;
  deprecated: boolean;
}> = [
  {
    address: new PublicKey('EmCzMQfXMgNHcnRoFwAdPe1i2SuiSzMj1mx6wu3KN2uA'),
    name: 'ALEPH/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('B37pZmwrwXHjpgvd9hHDAx1yeDsNevTnbbrN9W12BoGK'),
    name: 'ALEPH/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8AcVjMG2LTbpkjNoyq8RwysokqZunkjy3d5JDzxC6BJa'),
    name: 'BTC/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('CAgAeMD7quTdnr6RPa7JySQpjf3irAmefYNdTb6anemq'),
    name: 'BTC/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('HfCZdJ1wfsWKfYP2qyWdXTT5PWAGWFctzFjLH48U1Hsd'),
    name: 'ETH/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('ASKiV944nKg1W9vsf7hf3fTsjawK6DwLwrnB2LH9n61c'),
    name: 'ETH/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8mDuvJJSgoodovMRYArtVVYBbixWYdGzR47GPrRT65YJ'),
    name: 'SOL/USDT',
    deprecated: false,
    programId: new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
  },
  {
    address: new PublicKey('Cdp72gDcYMCLLk3aDkPxjeiirKoFqK38ECm8Ywvk94Wi'),
    name: 'SOL/USDC',
    deprecated: false,
    programId: new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
  },
  {
    address: new PublicKey('HARFLhSq8nECZk4DVFKvzqXMNMA9a3hjvridGMFizeLa'),
    name: 'SRM/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('68J6nkWToik6oM9rTatKSR5ibVSykAtzftBUEAvpRsys'),
    name: 'SRM/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('DzFjazak6EKHnaB2w6qSsArnj28CV1TKd2Smcj9fqtHW'),
    name: 'SUSHI/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('9wDmxsfwaDb2ysmZpBLzxKzoWrF1zHzBN7PV5EmJe19R'),
    name: 'SUSHI/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('GuvWMATdEV6DExWnXncPYEzn4ePWYkvGdC8pu8gsn7m7'),
    name: 'SXP/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('GbQSffne1NcJbS4jsewZEpRGYVR4RNnuVUN8Ht6vAGb6'),
    name: 'SXP/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('H4snTKK9adiU15gP22ErfZYtro3aqR9BTMXiH3AwiUTQ'),
    name: 'MSRM/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('7kgkDyW7dmyMeP8KFXzbcUZz1R2WHsovDZ7n3ihZuNDS'),
    name: 'MSRM/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('DHDdghmkBhEpReno3tbzBPtsxCt6P3KrMzZvxavTktJt'),
    name: 'FTT/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FZqrBXz7ADGsmDf1TM9YgysPUfvtG8rJiNUrqDpHc9Au'),
    name: 'FTT/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('5zu5bTZZvqESAAgFsr12CUMxdQvMrvU9CgvC1GW8vJdf'),
    name: 'YFI/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FJg9FUtbN3fg3YFbMCFiZKjGh5Bn4gtzxZmtxFzmz9kT'),
    name: 'YFI/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('F5xschQBMpu1gD2q1babYEAVJHR1buj1YazLiXyQNqSW'),
    name: 'LINK/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('7GZ59DMgJ7D6dfoJTpszPayTRyua9jwcaGJXaRMMF1my'),
    name: 'LINK/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('BAbc9baz4hV1hnYjWSJ6cZDRjfvziWbYGQu9UFkcdUmx'),
    name: 'HGET/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('uPNcBgFhrLW3FtvyYYbBUi53BBEQf9e4NPgwxaLu5Hn'),
    name: 'HGET/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('3puWJFZyCso14EdxhywjD7xqyTarpsULx483mzvqxQRW'),
    name: 'CREAM/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('EBxJWA2nLV57ZntbjizxH527ZjPNLT5cpUHMnY5k3oq'),
    name: 'CREAM/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8Ae7Uhigx8k4fKdJG7irdPCVDZLvWsJfeTH2t5fr3TVD'),
    name: 'UBXT/USDC',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('46VdEkj4MJwZinwVb3Y7DUDpVXLNb9YW7P2waKU3vCqr'),
    name: 'UBXT/USDT',
    deprecated: false,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('Hze5AUX4Qp1cTujiJ4CsAMRGn4g6ZpgXsmptFn3xxhWg'),
    deprecated: false,
    name: 'HNT/USDC',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('Hc22rHKrhbrZBaQMmhJvPTkp1yDr31PDusU8wKoqFSZV'),
    deprecated: false,
    name: 'HNT/USDT',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FJq4HX3bUSgF3yQZ8ADALtJYfAyr9fz36SNG18hc3dgF'),
    deprecated: false,
    name: 'FRONT/USDC',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('HFoca5HKwiTPpw9iUY5iXWqzkXdu88dS7YrpSvt2uhyF'),
    deprecated: false,
    name: 'FRONT/USDT',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
];
