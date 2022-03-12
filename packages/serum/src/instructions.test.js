import { encodeInstruction, decodeInstruction } from './instructions';
import BN from 'bn.js';
import base58 from 'bs58';

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
      '0001000000010000000a000000000000000500000000000000020000000000000000000000',
    );
  });

  it('decodes new order from rawbytes', () => {
    const newOrderExpectedJSON = '{"newOrderV3":{"side":"buy","limitPrice":"011d28","maxBaseQuantity":"0122","maxQuoteQuantity":"7e2edb40","selfTradeBehavior":"decrementTake","orderType":"limit","clientId":"00","limit":65535}}'
    const newOrderInstData58 = '189VEfQCdeLeDg3Y6qq3iVwwij5GobKfSvh42MPYfkCpGVM4TkjdwRK9FdLswwBvABt5k'
    const newOrderInstDataBytes = base58.decode(newOrderInstData58)
    const orderObj = decodeInstruction(newOrderInstDataBytes);
    expect(JSON.stringify(orderObj)).toEqual(newOrderExpectedJSON);
  });
});
