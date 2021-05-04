const anchor = require('@project-serum/anchor');
const Provider = anchor.Provider;
const Wallet = anchor.Wallet;
const BN = anchor.BN;
const Connection = require('@solana/web3.js').Connection;
const PublicKey = require('@solana/web3.js').PublicKey;
const TokenListProvider = require('@solana/spl-token-registry')
  .TokenListProvider;
const Swap = require('..').Swap;

// Mainnet beta addresses.
const SRM = new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt');
const USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
const WBTC = new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
const DECIMALS = 6;

async function main() {
  // Client for sending transactions to the swap program on mainnet.
  const client = await swapClient();

  // All tokens available for swapping.
  const _tokens = client.tokens();

  // All tokens available for swapping with SRM.
  const _srmSwapPairs = client.pairs(SRM);

  // Estimate the amount received by swapping from SRM -> USDC.
  const estimatedUsdc = await client.estimate({
    fromMint: SRM,
    toMint: USDC,
    amount: toNative(1),
  });

  const estimatedBtc = await client.estimate({
    fromMint: SRM,
    toMint: WBTC,
    amount: toNative(1),
  });
		console.log('estimate', estimatedBtc.toNumber());
/*
  // Swaps SRM -> USDC on the Serum orderbook. If the resulting USDC is
  // has greater than a 1% error from the estimate, then fails.
  const usdcSwapTx = await client.swap({
    fromMint: SRM,
    toMint: USDC,
    amount: toNative(1),
    minExpectedSwapAmount: estimatedUsdc.mul(new BN(99)).div(new BN(100)),
  });

  // Uses the default minExpectedSwapAmount calculation.
  const usdcSwapTxDefault = await client.swap({
    fromMint: SRM,
    toMint: USDC,
    amount: toNative(1),
  });

  // Transitive swap from SRM -> USDC -> BTC.
  const btcSwapTx = await client.swap({
    fromMint: SRM,
    toMint: WBTC,
    amount: toNative(1),
  });

  console.log('resp', fromNative(estimatedUsdc));
  console.log('resp', fromNative(estimatedBtc));
  console.log('resp', usdcSwapTx);
  console.log('resp', usdcSwapTxDefault);
  console.log('resp', btcSwapTx);
*/
}

async function swapClient() {
  const provider = new Provider(
    new Connection('https://api.mainnet-beta.solana.com', 'recent'),
			Wallet.local(),
			Provider.defaultOptions(),
  );
  const tokenList = await new TokenListProvider().resolve();
  return new Swap(provider, tokenList);
}

// Converts the given number to native units (i.e. with decimals).
// The mints used in this example all have 6 decimals. One should dynamically
// fetch decimals for the tokens they are swapping in production.
function toNative(amount) {
  return new BN(amount * 10 ** DECIMALS);
}

function fromNative(amount) {
  return amount.toNumber() / 10 ** DECIMALS;
}

main().catch(console.error);
