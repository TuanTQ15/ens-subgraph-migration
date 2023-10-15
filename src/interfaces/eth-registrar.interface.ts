import { DataHandlerContext } from '@subsquid/evm-processor';
import { Store } from '@subsquid/typeorm-store';

export interface IBase {
  ctx: DataHandlerContext<
    Store,
    {
      transaction: {
        from: true;
        value: true;
        hash: true;
      };
    }
  >;
  blockNumber: number;
  logIndex: number;
  hash: string;
}

export interface INameRegistered extends IBase {
  id: bigint;
  owner: string;
  expires: bigint;
  timestamp: bigint;
}

export interface INameRenewed extends IBase {
  id: bigint;
  expires: bigint;
}

export interface ITransfer extends IBase {
  to: string;
  tokenId: bigint;
}

export interface INameRegisteredOld extends IBase {
  name: string;
  label: string;
  owner: string;
  cost: bigint;
  expires: bigint;
}

export interface INameRenewedByController extends IBase {
  name: string;
  label: string;
  cost: bigint;
  expires: bigint;
}

export interface INameRegisteredByController extends IBase {
  name: string;
  label: string;
  owner: string;
  baseCost: bigint;
  premium: bigint;
  expires: bigint;
}
