export interface IBase {
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
