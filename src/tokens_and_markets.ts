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
  {
    address: new PublicKey('6WNVCuxCGJzNjmMZoKyhZJwvJ5tYpsLyAtagzYASqBoF'),
    name: 'AKRO',
  },
  {
    address: new PublicKey('DJafV9qemGp7mLMEn5wrfqaFwxsbLgUsGVS16zKRk9kc'),
    name: 'HXRO',
  },
  {
    address: new PublicKey('DEhAasscXF4kEGxFgJ3bq4PpVGp5wyUxMRvn6TzGVHaw'),
    name: 'UNI',
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
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('B37pZmwrwXHjpgvd9hHDAx1yeDsNevTnbbrN9W12BoGK'),
    name: 'ALEPH/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8AcVjMG2LTbpkjNoyq8RwysokqZunkjy3d5JDzxC6BJa'),
    name: 'BTC/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('CAgAeMD7quTdnr6RPa7JySQpjf3irAmefYNdTb6anemq'),
    name: 'BTC/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('HfCZdJ1wfsWKfYP2qyWdXTT5PWAGWFctzFjLH48U1Hsd'),
    name: 'ETH/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('ASKiV944nKg1W9vsf7hf3fTsjawK6DwLwrnB2LH9n61c'),
    name: 'ETH/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8mDuvJJSgoodovMRYArtVVYBbixWYdGzR47GPrRT65YJ'),
    name: 'SOL/USDT',
    deprecated: true,
    programId: new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
  },
  {
    address: new PublicKey('Cdp72gDcYMCLLk3aDkPxjeiirKoFqK38ECm8Ywvk94Wi'),
    name: 'SOL/USDC',
    deprecated: true,
    programId: new PublicKey('BJ3jrUzddfuSrZHXSCxMUUQsjKEyLmuuyZebkcaFp2fg'),
  },
  {
    address: new PublicKey('HARFLhSq8nECZk4DVFKvzqXMNMA9a3hjvridGMFizeLa'),
    name: 'SRM/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('68J6nkWToik6oM9rTatKSR5ibVSykAtzftBUEAvpRsys'),
    name: 'SRM/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('DzFjazak6EKHnaB2w6qSsArnj28CV1TKd2Smcj9fqtHW'),
    name: 'SUSHI/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('9wDmxsfwaDb2ysmZpBLzxKzoWrF1zHzBN7PV5EmJe19R'),
    name: 'SUSHI/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('GuvWMATdEV6DExWnXncPYEzn4ePWYkvGdC8pu8gsn7m7'),
    name: 'SXP/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('GbQSffne1NcJbS4jsewZEpRGYVR4RNnuVUN8Ht6vAGb6'),
    name: 'SXP/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('H4snTKK9adiU15gP22ErfZYtro3aqR9BTMXiH3AwiUTQ'),
    name: 'MSRM/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('7kgkDyW7dmyMeP8KFXzbcUZz1R2WHsovDZ7n3ihZuNDS'),
    name: 'MSRM/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('DHDdghmkBhEpReno3tbzBPtsxCt6P3KrMzZvxavTktJt'),
    name: 'FTT/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FZqrBXz7ADGsmDf1TM9YgysPUfvtG8rJiNUrqDpHc9Au'),
    name: 'FTT/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('5zu5bTZZvqESAAgFsr12CUMxdQvMrvU9CgvC1GW8vJdf'),
    name: 'YFI/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FJg9FUtbN3fg3YFbMCFiZKjGh5Bn4gtzxZmtxFzmz9kT'),
    name: 'YFI/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('F5xschQBMpu1gD2q1babYEAVJHR1buj1YazLiXyQNqSW'),
    name: 'LINK/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('7GZ59DMgJ7D6dfoJTpszPayTRyua9jwcaGJXaRMMF1my'),
    name: 'LINK/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('BAbc9baz4hV1hnYjWSJ6cZDRjfvziWbYGQu9UFkcdUmx'),
    name: 'HGET/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('uPNcBgFhrLW3FtvyYYbBUi53BBEQf9e4NPgwxaLu5Hn'),
    name: 'HGET/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('3puWJFZyCso14EdxhywjD7xqyTarpsULx483mzvqxQRW'),
    name: 'CREAM/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('EBxJWA2nLV57ZntbjizxH527ZjPNLT5cpUHMnY5k3oq'),
    name: 'CREAM/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('8Ae7Uhigx8k4fKdJG7irdPCVDZLvWsJfeTH2t5fr3TVD'),
    name: 'UBXT/USDC',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('46VdEkj4MJwZinwVb3Y7DUDpVXLNb9YW7P2waKU3vCqr'),
    name: 'UBXT/USDT',
    deprecated: true,
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('Hze5AUX4Qp1cTujiJ4CsAMRGn4g6ZpgXsmptFn3xxhWg'),
    deprecated: true,
    name: 'HNT/USDC',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('Hc22rHKrhbrZBaQMmhJvPTkp1yDr31PDusU8wKoqFSZV'),
    deprecated: true,
    name: 'HNT/USDT',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('FJq4HX3bUSgF3yQZ8ADALtJYfAyr9fz36SNG18hc3dgF'),
    deprecated: true,
    name: 'FRONT/USDC',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    address: new PublicKey('HFoca5HKwiTPpw9iUY5iXWqzkXdu88dS7YrpSvt2uhyF'),
    deprecated: true,
    name: 'FRONT/USDT',
    programId: new PublicKey('4ckmDgGdxQoPDLUkDT3vHgSAkzA3QRdNq5ywwY4sUSJn'),
  },
  {
    name: 'ALEPH/USDT',
    address: new PublicKey('5xnYnWca2bFwC6cPufpdsCbDJhMjYCC59YgwoZHEfiee'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'ALEPH/USDC',
    address: new PublicKey('BZMuoQ2i2noNUXMdrRDivc7MwjGspNJTCfZkdHMwK18T'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'BTC/USDT',
    address: new PublicKey('EXnGBBSamqzd3uxEdRLUiYzjJkTwQyorAaFXdfteuGXe'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'BTC/USDC',
    address: new PublicKey('5LgJphS6D5zXwUVPU7eCryDBkyta3AidrJ5vjNU6BcGW'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'ETH/USDT',
    address: new PublicKey('5abZGhrELnUnfM9ZUnvK6XJPoBU5eShZwfFPkdhAC7o'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'ETH/USDC',
    address: new PublicKey('DmEDKZPXXkWgaYiKgWws2ZXWWKCh41eryDPRVD4zKnD9'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SOL/USDT',
    address: new PublicKey('7xLk17EQQ5KLDLDe44wCmupJKJjTGd8hs3eSVVhCx932'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SOL/USDC',
    address: new PublicKey('EBFTQNg2QjyxV7WDDenoLbfLLXLcbSz6w1YrdTCGPWT5'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SRM/USDT',
    address: new PublicKey('H3APNWA8bZW2gLMSq5sRL41JSMmEJ648AqoEdDgLcdvB'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SRM/USDC',
    address: new PublicKey('8YmQZRXGizZXYPCDmxgjwB8X8XN4PZG7MMwNg76iAmPZ'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SUSHI/USDT',
    address: new PublicKey('4uZTPc72sCDcVRfKKii67dTPm2Xe4ri3TYnGcUQrtnU9'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SUSHI/USDC',
    address: new PublicKey('9vFuX2BizwinWjkZLQTmThDcNMFEcY3wVXYuqnRQtcD'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SXP/USDT',
    address: new PublicKey('33GHmwG9woY95JuWNi74Aa8uKvysSXxif9P1EwwkrCRz'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'SXP/USDC',
    address: new PublicKey('C5NReXAeQhfjiDCGPFj1UUmDxDqF8v2CUVKoYuQqb4eW'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'MSRM/USDT',
    address: new PublicKey('FUaF58sDrgbqakHTR8RUwRLauSofRTjqyCsqThFPh6YM'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'MSRM/USDC',
    address: new PublicKey('58H7ZRmiyWtsrz2sQGz1qQCMW6n7447xhNNehUSQGPj5'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'FTT/USDT',
    address: new PublicKey('5NqjQVXLuLSDnsnQMfWp3rF9gbWDusWG4B1Xwtk3rZ5S'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'FTT/USDC',
    address: new PublicKey('ES8skmkEeyH1BYFThd2FtyaFKhkqtwH7XWp8mXptv3vg'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'YFI/USDT',
    address: new PublicKey('97NiXHUNkpYd1eb2HthSDGhaPfepuqMAV3QsZhAgb1wm'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'YFI/USDC',
    address: new PublicKey('Gw78CYLLFbgmmn4rps9KoPAnNtBQ2S1foL2Mn6Z5ZHYB'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'LINK/USDT',
    address: new PublicKey('hBswhpNyz4m5nt4KwtCA7jYXvh7VmyZ4TuuPmpaKQb1'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'LINK/USDC',
    address: new PublicKey('WjfsTPyrvUUrhGJ9hVQFubMnKDcnQS8VxSXU7L2gLcA'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HGET/USDT',
    address: new PublicKey('GaeUpY7CT8rjoeVGjY1t3mJJDd1bdXxYWtrGSpsVFors'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HGET/USDC',
    address: new PublicKey('2ZmB255T4FVUugpeXTFxD6Yz5GE47yTByYvqSTDUbk3G'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'CREAM/USDC',
    address: new PublicKey('FGJtCDXoHLHjagP5Ht6xcUFt2rW3z8MJPe87rFKP2ZW6'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'CREAM/USDT',
    address: new PublicKey('7qq9BABQvTWKZuJ5fX2PeTKX6XVtduEs9zW9WS21fSzN'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'UBXT/USDC',
    address: new PublicKey('7K6MPog6LskZmyaYwqtLvRUuedoiE68nirbQ9tK3LasE'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'UBXT/USDT',
    address: new PublicKey('DCHvVahuLTNWBGUtEzF5GrTdx5FRpxqEJiS6Ru1hrDfD'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HNT/USDC',
    address: new PublicKey('9RyozJe3bkAFfH3jmoiKHjkWCoLTxn7aBQSi6YfaV6ab'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HNT/USDT',
    address: new PublicKey('DWjJ8VHdGYBxDQYdrRBVDWkHswrgjuBFEv5pBhiRoPBz'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'FRONT/USDC',
    address: new PublicKey('AGtBbGuJZiv3Ko3dfT4v6g4kCqnNc9DXfoGLe5HpjmWx'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'FRONT/USDT',
    address: new PublicKey('56eqxJYzPigm4FkigiBdsfebjMgAbKNh24E7oiKLBtye'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'AKRO/USDC',
    address: new PublicKey('AA1HSrsMcRNzjaQfRMTNarHR9B7e4U79LJ2319UtiqPF'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'AKRO/USDT',
    address: new PublicKey('FQbCNSVH3RgosCPB4CJRstkLh5hXkvuXzAjQzT11oMYo'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HXRO/USDT',
    address: new PublicKey('Fs5xtGUmJTYo8Ao75M3R3m3mVX53KMUhzfXCmyRLnp2P'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'HXRO/USDC',
    address: new PublicKey('AUAobJdffexcoJBMeyLorpShu3ZtG9VvPEPjoeTN4u5Z'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'UNI/USDT',
    address: new PublicKey('ChKV7mxecPqFPGYJjhzowPHDiLKFWXXVujUiE3EWxFcg'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
  {
    name: 'UNI/USDC',
    address: new PublicKey('GpdYLFbKHeSeDGqsnQ4jnP7D1294iBpQcsN1VPwhoaFS'),
    programId: new PublicKey('EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o'),
    deprecated: false,
  },
];
