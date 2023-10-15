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
  node: string;
  timestamp: number;
}

export interface INewOwner extends IBase {
  label: string;
  owner: string;
  domainLabels: Map<string, string>;
}

export interface ITransfer extends IBase {
  owner: string;
}

export interface INewTTL extends IBase {
  ttl: bigint;
}

export interface INewResolver extends IBase {
  resolverAddress: string;
}
