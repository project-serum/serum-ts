import { Client } from '../../src';
import BN from 'bn.js';
import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const registryProgramId = new PublicKey(
  '5WGaDhXLTwe41iCjuZFgfcyPS9chCLDb96HhN6yHifUL',
);
const stakeProgramId = new PublicKey(
  'EVBVb4wKn6LkmzStSULZ1mP44HJj44GzuvDKeBRqYEpB',
);

const registrarAddress = new PublicKey(
  'AGk3wmHGUQmRc5tu1MNzFhThB6ToPXS5XZ4xZm4FCQcm',
);
const poolAddress = new PublicKey(
  'D3XSQk8KttLhoWcpuMNw3ugxJVK94fqxs3iq81rX11VP',
);

const srmMint = new PublicKey('L3hZd1HFW2cJjJHpnXN28mARXekyWCmymEzBsjDF8r1');
const msrmMint = new PublicKey('CbfEBSbRYnpSEKCRR7tqXBHy8omsuQBYGURoW5E3A5gM');

describe('End-to-end tests', () => {
  it('Runs against a localnetwork', async () => {
    let client = await Client.local(registryProgramId, registrarAddress);

    let registrar = await client.accounts.registrar(registrarAddress);

    let { entity } = await client.createEntity({});
    let e = await client.accounts.entity(entity);

    let { member } = await client.createMember({ entity });
    let m = await client.accounts.member(member);

    console.log(e);
    console.log(m);
  });
});
