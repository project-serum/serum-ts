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
          mint: new PublicKey('HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed'),
          vaultAddress: new PublicKey(
            'HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed',
          ),
        },
      ],
      vaultSigner: new PublicKey(
        'HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed',
      ),
      vaultSignerNonce: 0,
      accountParams: [
        {
          address: new PublicKey(
            'HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed',
          ),
          writable: true,
        },
        {
          address: new PublicKey(
            'HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed',
          ),
          writable: false,
        },
      ],
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
