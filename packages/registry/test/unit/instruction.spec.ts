import { instruction } from '../../src';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

describe('Instruction', () => {
  // TODO: remove this test once we have end-to-end tests with the Rust
  //       program. Will make changes much easier/more flexible.
  it('Serializes and deserializes a Rust RegistryInstruction', async () => {
    const pk = new PublicKey('HsQhg1k93vEA326SXxnGj1sZrdupG7rj5T6g5cMgk1ed');
    const registryInstruction = {
      updateMember: {
        watchtower: {
          authority: pk,
          dst: pk,
        },
        delegate: null,
      },
    };
    const data = instruction.encode(registryInstruction);
    const buf = Buffer.from([
      5,
      1,
      250,
      164,
      212,
      146,
      235,
      177,
      143,
      158,
      100,
      199,
      142,
      62,
      68,
      41,
      200,
      125,
      27,
      90,
      42,
      14,
      236,
      238,
      81,
      32,
      41,
      163,
      158,
      120,
      231,
      70,
      240,
      238,
      250,
      164,
      212,
      146,
      235,
      177,
      143,
      158,
      100,
      199,
      142,
      62,
      68,
      41,
      200,
      125,
      27,
      90,
      42,
      14,
      236,
      238,
      81,
      32,
      41,
      163,
      158,
      120,
      231,
      70,
      240,
      238,
      0,
    ]);
    const registryInstruction2 = instruction.decode(buf);

    expect(data).toStrictEqual(buf);
    expect(JSON.stringify(registryInstruction)).toEqual(
      JSON.stringify(registryInstruction2),
    );
  });
});
