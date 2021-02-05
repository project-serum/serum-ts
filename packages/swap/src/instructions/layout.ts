import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { struct, Structure, u8, nu64, blob, union, Layout } from 'buffer-layout';

export { TokenSwap } from '@solana/spl-token-swap';

/**
 * Layout for a public key
 */
export const publicKey = (property = "publicKey"): Layout<PublicKey> => {
  const publicKeyLayout = blob(32, property) as any;

  const _decode = publicKeyLayout.decode.bind(publicKeyLayout);
  const _encode = publicKeyLayout.encode.bind(publicKeyLayout);

  publicKeyLayout.decode = (buffer: Buffer, offset?: number) => {
    const data = _decode(buffer, offset);
    return new PublicKey(data);
  };

  publicKeyLayout.encode = (key: PublicKey, buffer: Buffer, offset: number) => {
    return _encode(key.toBuffer(), buffer, offset);
  };

  return publicKeyLayout;
};

/**
 * Layout for a 64bit unsigned value
 */
export const uint64 = (property = "uint64"): Layout<BN> => {
  const layout = blob(8, property) as any;

  const _decode = layout.decode.bind(layout);
  const _encode = layout.encode.bind(layout);

  layout.decode = (buffer: Buffer, offset: number) => {
    const data = _decode(buffer, offset);
    return new BN(
      [...data]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(""),
      16
    );
  };

  layout.encode = (num: BN, buffer: Buffer, offset: number) => {
    const a = num.toArray().reverse();
    let b = Buffer.from(a);
    if (b.length !== 8) {
      const zeroPad = Buffer.alloc(8);
      b.copy(zeroPad);
      b = zeroPad;
    }
    return _encode(b, buffer, offset);
  };

  return layout;
};

// TODO: add a proper <T> parameter to `TokenSwapLayoutLegacyV0`.
export const TokenSwapLayoutLegacyV0 = struct([
  u8('isInitialized'),
  u8('nonce'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  uint64('feesNumerator'),
  uint64('feesDenominator'),
]);

// TODO: add a proper <T> parameter to `TokenSwapLayout`.
export const TokenSwapLayoutV1: Structure = struct([
  u8('isInitialized'),
  u8('nonce'),
  publicKey('tokenProgramId'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  publicKey('mintA'),
  publicKey('mintB'),
  publicKey('feeAccount'),
  u8('curveType'),
  uint64('tradeFeeNumerator'),
  uint64('tradeFeeDenominator'),
  uint64('ownerTradeFeeNumerator'),
  uint64('ownerTradeFeeDenominator'),
  uint64('ownerWithdrawFeeNumerator'),
  uint64('ownerWithdrawFeeDenominator'),
  blob(16, 'padding'),
]);

const FEE_LAYOUT = struct(
  [
    nu64("tradeFeeNumerator"),
    nu64("tradeFeeDenominator"),
    nu64("ownerTradeFeeNumerator"),
    nu64("ownerTradeFeeDenominator"),
    nu64("ownerWithdrawFeeNumerator"),
    nu64("ownerWithdrawFeeDenominator"),
    nu64("hostFeeNumerator"),
    nu64("hostFeeDenominator"),
  ],
  "fees"
);

const CURVE_NODE = union(
  u8(),
  blob(32),
  "curve"
);
CURVE_NODE.addVariant(0, struct([]), "constantProduct");
CURVE_NODE.addVariant(
  1,
  struct([nu64("token_b_price")]),
  "constantPrice"
);
CURVE_NODE.addVariant(2, struct([]), "stable");
CURVE_NODE.addVariant(
  3,
  struct([nu64("token_b_offset")]),
  "offset"
);

export const TokenSwapLayout: Structure = struct(
  [
    u8('version'),
    u8("isInitialized"),
    u8("nonce"),
    publicKey("tokenProgramId"),
    publicKey("tokenAccountA"),
    publicKey("tokenAccountB"),
    publicKey("tokenPool"),
    publicKey("mintA"),
    publicKey("mintB"),
    publicKey("feeAccount"),
    FEE_LAYOUT,
    CURVE_NODE,
  ]
);
