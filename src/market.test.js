import { accountFlags } from './market';

describe('accountFlags', () => {
  const layout = accountFlags();
  it('parses', () => {
    const b = Buffer.from('0000000000000000', 'hex');
    expect(layout.getSpan(b)).toBe(8);
    expect(layout.decode(b).initialized).toBe(false);
    expect(layout.decode(Buffer.from('0000000000000000', 'hex'))).toMatchObject(
      {
        initialized: false,
        market: false,
        openOrders: false,
        requestQueue: false,
        eventQueue: false,
        bids: false,
        asks: false,
      },
    );
    expect(layout.decode(Buffer.from('0300000000000000', 'hex'))).toMatchObject(
      {
        initialized: true,
        market: true,
        openOrders: false,
        requestQueue: false,
        eventQueue: false,
        bids: false,
        asks: false,
      },
    );
    expect(layout.decode(Buffer.from('0500000000000000', 'hex'))).toMatchObject(
      {
        initialized: true,
        market: false,
        openOrders: true,
        requestQueue: false,
        eventQueue: false,
        bids: false,
        asks: false,
      },
    );
  });

  it('serializes', () => {
    const b = Buffer.alloc(8);
    expect(
      layout.encode(
        {
          initialized: true,
          market: false,
          openOrders: false,
          requestQueue: false,
          eventQueue: false,
          bids: false,
          asks: true,
        },
        b,
      ),
    ).toBe(8);
    expect(b.toString('hex')).toEqual('4100000000000000');
  });
});
