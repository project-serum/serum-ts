import { encodeInstruction } from './instructions';
import BN from 'bn.js';

describe('instruction', () => {
  it('encodes initialize market', () => {
    const b = encodeInstruction({
      initializeMarket: {
        baseLotSize: new BN(10),
        quoteLotSize: new BN(100000),
        feeRateBps: 5,
        vaultSignerNonce: new BN(1),
        quoteDustThreshold: new BN(10),
      },
    });
    expect(b.toString('hex')).toEqual(
      '00000000000a00000000000000a086010000000000050001000000000000000a00000000000000',
    );
  });

  it('encodes new order', () => {
    const b = encodeInstruction({
      newOrder: {
        side: 'sell',
        limitPrice: new BN(10),
        maxQuantity: new BN(5),
        orderType: 'postOnly',
      },
    });
    expect(b.toString('hex')).toEqual(
      '0001000000010000000a00000000000000050000000000000002000000',
    );
  });
});
