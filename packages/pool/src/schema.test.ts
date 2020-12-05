import { PublicKey } from '@solana/web3.js';
import { Basket, PoolRequest, PoolState } from '@project-serum/pool';
import BN from 'bn.js';

describe('PoolState', () => {
  it('round trips', () => {
    const b = Buffer.alloc(1000);
    const state = {
      poolTokenMint: new PublicKey(
        'HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed',
      ),
      assets: [
        {
          mint: new PublicKey('BLvBqiEt4C2zn5dZmGLwBocFSbhbsZadV7Hd9oaSHNqj'),
          vaultAddress: new PublicKey(
            'GSUcLyZfwK5MUC8hkjGEAZLCkvjru3jk6nK29N1ciKrF',
          ),
        },
      ],
      vaultSigner: new PublicKey(
        '4pvTcVX3K4mc1dLs1vQ8Sq3Z2NWVGXsjpfJ6tmvnj533',
      ),
      vaultSignerNonce: 0,
      accountParams: [
        {
          address: new PublicKey(
            'HvLPFuTLa8RShBiQfT17tKntA69pNoV7o2XXSyRnaf4e',
          ),
          writable: true,
        },
        {
          address: new PublicKey(
            '6J6QfKjcQojqGZwRNoQ4do48UnV5KqNM7M5Rb2e6eDWx',
          ),
          writable: false,
        },
      ],
      name: 'Test',
      serumFeeVault: new PublicKey(
        '77AkdYcu3DjtzmJYRVnFymfcdaqJjjFhRnKyyDPjQHYF',
      ),
      initializerFeeVault: new PublicKey(
        '4HfeDayMfG9GtaJ9ZBsuDFWHYH3eYiiTXRpFL8uyiYHi',
      ),
      feeRate: 150,
      adminKey: null,
      customState: Buffer.alloc(10),
    };

    const len = PoolState.encode(state, b);
    expect(PoolState.getSpan(b)).toBe(len);
    expect(PoolState.decode(b.slice(0, len))).toEqual(state);
  });
});

describe('PoolRequest', () => {
  it('round trips', () => {
    const b = Buffer.alloc(1000);
    const request = {
      getBasket: {
        swap: {
          quantities: [new BN(12)],
        },
      },
    };

    const len = PoolRequest.encode(request, b);
    expect(PoolRequest.getSpan(b)).toBe(len);
    expect(PoolRequest.decode(b.slice(0, len))).toEqual(request);
  });
});

describe('Basket', () => {
  it('round trips', () => {
    const b = Buffer.alloc(1000);
    const basket = { quantities: [new BN(123), new BN(-123)] };

    const len = Basket.encode(basket, b);
    expect(Basket.getSpan(b)).toBe(len);
    expect(Basket.decode(b.slice(0, len))).toEqual(basket);
  });
});
