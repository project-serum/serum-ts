import { PublicKey, Account, TransactionInstruction } from '@solana/web3.js';
import { struct, u8, nu64, blob } from 'buffer-layout';
import { CurveType, getProgramVersion, PoolConfig } from '../types';
import { LATEST_VERSION } from '../constants';

export { TokenSwap } from '@solana/spl-token-swap';

export const createInitSwapInstruction = (
  tokenSwapAccount: Account,
  authority: PublicKey,
  tokenAccountA: PublicKey,
  tokenAccountB: PublicKey,
  tokenPool: PublicKey,
  feeAccount: PublicKey,
  tokenAccountPool: PublicKey,
  tokenProgramId: PublicKey,
  swapProgramId: PublicKey,
  nonce: number,
  config: PoolConfig
): TransactionInstruction => {
  const keys = [
    { pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: tokenAccountA, isSigner: false, isWritable: false },
    { pubkey: tokenAccountB, isSigner: false, isWritable: false },
    { pubkey: tokenPool, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: false },
    { pubkey: tokenAccountPool, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];


  let data = Buffer.alloc(1024);
  if (getProgramVersion(swapProgramId) === LATEST_VERSION) {
    const fields = [
      u8("instruction"),
      u8("nonce"),
      nu64("tradeFeeNumerator"),
      nu64("tradeFeeDenominator"),
      nu64("ownerTradeFeeNumerator"),
      nu64("ownerTradeFeeDenominator"),,
      nu64("ownerWithdrawFeeNumerator"),
      nu64("ownerWithdrawFeeDenominator"),
      nu64("hostFeeNumerator"),
      nu64("hostFeeDenominator"),
      u8("curveType"),
    ] as any[];

    if (config.curveType === CurveType.ConstantProductWithOffset) {
      fields.push(nu64("token_b_offset"));
      fields.push(blob(24, "padding"));
    } else if (config.curveType === CurveType.ConstantPrice) {
      fields.push(nu64("token_b_price"));
      fields.push(blob(24, "padding"));
    } else {
      fields.push(blob(32, "padding"));
    }

    const commandDataLayout = struct(fields);

    const { fees, ...rest } = config;

    const encodeLength = commandDataLayout.encode(
      {
        instruction: 0, // InitializeSwap instruction
        nonce,
        ...fees,
        ...rest,
      },
      data
    );
    data = data.slice(0, encodeLength);
  } else {
    const commandDataLayout = struct([
      u8("instruction"),
      u8("nonce"),
      u8("curveType"),
      nu64("tradeFeeNumerator"),
      nu64("tradeFeeDenominator"),
      nu64("ownerTradeFeeNumerator"),
      nu64("ownerTradeFeeDenominator"),
      nu64("ownerWithdrawFeeNumerator"),
      nu64("ownerWithdrawFeeDenominator"),
      blob(16, "padding"),
    ]);

    const encodeLength = commandDataLayout.encode(
      {
        instruction: 0, // InitializeSwap instruction
        nonce,
        curveType: config.curveType,
        tradeFeeNumerator: config.fees.tradeFeeNumerator,
        tradeFeeDenominator: config.fees.tradeFeeDenominator,
        ownerTradeFeeNumerator: config.fees.ownerTradeFeeNumerator,
        ownerTradeFeeDenominator: config.fees.ownerTradeFeeDenominator,
        ownerWithdrawFeeNumerator: config.fees.ownerWithdrawFeeNumerator,
        ownerWithdrawFeeDenominator: config.fees.ownerWithdrawFeeDenominator,
      },
      data
    );
    data = data.slice(0, encodeLength);
  }

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};
