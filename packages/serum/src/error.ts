import { Transaction, SystemProgram } from "@solana/web3.js";
import {PROGRAM_LAYOUT_VERSIONS} from "./tokens_and_markets";
import { TOKEN_PROGRAM_ID } from './token-instructions';

export enum DexError {
    InvalidMarketFlags = 0,
    InvalidAskFlags,
    InvalidBidFlags,
    InvalidQueueLength,
    OwnerAccountNotProvided,

    ConsumeEventsQueueFailure,
    WrongCoinVault,
    WrongPcVault,
    WrongCoinMint,
    WrongPcMint,

    CoinVaultProgramId = 10,
    PcVaultProgramId,
    CoinMintProgramId,
    PcMintProgramId,

    WrongCoinMintSize,
    WrongPcMintSize,
    WrongCoinVaultSize,
    WrongPcVaultSize,

    UninitializedVault,
    UninitializedMint,

    CoinMintUninitialized = 20,
    PcMintUninitialized,
    WrongMint,
    WrongVaultOwner,
    VaultHasDelegate,

    AlreadyInitialized,
    WrongAccountDataAlignment,
    WrongAccountDataPaddingLength,
    WrongAccountHeadPadding,
    WrongAccountTailPadding,

    RequestQueueEmpty = 30,
    EventQueueTooSmall,
    SlabTooSmall,
    BadVaultSignerNonce,
    InsufficientFunds,

    SplAccountProgramId,
    SplAccountLen,
    WrongFeeDiscountAccountOwner,
    WrongFeeDiscountMint,

    CoinPayerProgramId,
    PcPayerProgramId = 40,
    ClientIdNotFound,
    TooManyOpenOrders,

    FakeErrorSoWeDontChangeNumbers,
    BorrowError,

    WrongOrdersAccount,
    WrongBidsAccount,
    WrongAsksAccount,
    WrongRequestQueueAccount,
    WrongEventQueueAccount,

    RequestQueueFull = 50,
    EventQueueFull,
    MarketIsDisabled,
    WrongSigner,
    TransferFailed,
    ClientOrderIdIsZero,

    WrongRentSysvarAccount,
    RentNotProvided,
    OrdersNotRentExempt,
    OrderNotFound,
    OrderNotYours,

    WouldSelfTrade,

    Unknown = 1000,
}

export const KNOWN_PROGRAMS = {
  [TOKEN_PROGRAM_ID.toString()]: 'Token program',
  [SystemProgram.programId.toString()]: 'System program'
};

type CustomError = { Custom: number }
type InstructionError = [number, CustomError]

export function parseInstructionErrorResponse(transaction: Transaction, errorResponse: InstructionError): {
  failedInstructionIndex: number,
  error: string,
  failedProgram: string,
} {
  const [failedInstructionIndex, customError] = errorResponse;
  const failedInstruction = transaction.instructions[failedInstructionIndex];
  let parsedError;
  if (failedInstruction.programId.toString() in PROGRAM_LAYOUT_VERSIONS) {
    parsedError = DexError[customError['Custom']];
  } else if (failedInstruction.programId.toString() in KNOWN_PROGRAMS) {
    const program = KNOWN_PROGRAMS[failedInstruction.programId.toString()];
    parsedError = `${program} error ${customError['Custom']}`;
  } else {
    parsedError = `Unknown program ${failedInstruction.programId.toString()} custom error: ${customError['Custom']}`
  }
  return {
    failedInstructionIndex,
    error: parsedError,
    failedProgram: failedInstruction.programId.toString()
  };
}
