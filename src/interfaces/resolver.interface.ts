export interface IBase {
  blockNumber: number;
  logIndex: number;
  hash: string;
  node: string;
  address: string;
}

export interface IAddrChanged extends IBase {
  a: string;
}

export interface IMulticoinAddrChanged extends IBase {
  coinType: string;
  newAddress: string;
}

export interface IAuthorisationChanged extends IBase {
  owner: string;
  target: string;
  isAuthorised: boolean;
}

export interface IContenthashChanged extends IBase {
  contentHash: string;
}

export interface IInterfaceChanged extends IBase {
  interfaceID: string;
  implementer: string;
}

export interface INameChanged extends IBase {
  name: string;
}

export interface IPubkeyChanged extends IBase {
  x: string;
  y: string;
}

export interface ITextChanged extends IBase {
  key: string;
}

export interface ITextChangedWithValue extends IBase {
  key: string;
  value: string;
}

export interface IVersionChanged extends IBase {
  newVersion: bigint;
}

export interface IABIChanged extends IBase {
  contentType: bigint;
}
