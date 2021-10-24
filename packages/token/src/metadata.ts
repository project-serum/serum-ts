import { PublicKey } from '@solana/web3.js';
import { rustEnum, bool, u8, publicKey, str, vec, option, struct } from '@project-serum/borsh'
import { u16 } from 'buffer-layout';

const KEY_LAYOUT = rustEnum([
	struct([], 'uninitialized'),
	struct([], 'editionV1'),
	struct([], 'masterEditionV1'),
	struct([], 'reservationListV1'),
	struct([], 'metadataV1'),
	struct([], 'reservationListV2'),
	struct([], 'masterEditionV2'),
	struct([], 'editionMarker'),
]);

const CREATOR_LAYOUT = struct([
	publicKey('address'),
	bool('verified'),
	u8('share'),
])

const DATA_LAYOUT = struct([
	str('name'),
	str('symbol'),
	str('uri'),
	u16('sellerFeeBasisPoints'),
	option(vec(CREATOR_LAYOUT.replicate('creators')), 'creators')
])

const METADATA_LAYOUT = struct([
	KEY_LAYOUT.replicate('key'),
	publicKey('updateAuthority'),
	publicKey('mint'),
	DATA_LAYOUT.replicate('data'),
	bool('primarySaleHappened'),
	bool('isMutable'),
	option(u8(), 'editionNonce'),
]);

export interface Metadata {
	key: Key;
	updateAuthority: PublicKey;
	mint: PublicKey;
	data: Data;
	primarySaleHappened: boolean;
	isMutable: boolean;
	editionNonce: number;
}

export interface Data {
	name: string;
	symbol: string;
	uri: string;
	sellerFeeBasisPoints: number;
	creators: Array<Creator> | null;
}

export interface Creator {
	address: PublicKey;
	verified: boolean;
	share: number;
}

export type Key =
	{ unitialized: {} }
	| { editionV1: {} }
	| { masterEditionV1: {} }
	| { reserverationListV1: {} }
	| { metadataV1: {} }
	| { reservationListV2: {} }
	| { masterEditionV2: {} }
	| { editoinMarket: {} };

// eslint-disable-next-line no-control-regex
const METADATA_REPLACE = new RegExp('\u0000', 'g');

export function decodeMetadata(buffer: Buffer): Metadata {
	const metadata: any = METADATA_LAYOUT.decode(buffer);
  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
  return metadata;
};
