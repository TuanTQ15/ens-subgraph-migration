export interface IBase {
  blockNumber: number;
  logIndex: number;
  hash: string;
}

export interface INameWrapped extends IBase {
  node: string;
  name: string;
  owner: string;
  fuses: number;
  expiry: bigint;
}

export interface INameUnwrapped extends IBase {
  node: string;
  owner: string;
}

export interface IFusesSet extends IBase {
  node: string;
  fuses: number;
}

export interface IExpiryExtended extends IBase {
  node: string;
  expiry: bigint;
}

export interface ITransferSingle extends IBase {
  to: string;
  id: bigint;
}

export interface ITransferBatch extends IBase {
  to: string;
  ids: bigint[];
}
