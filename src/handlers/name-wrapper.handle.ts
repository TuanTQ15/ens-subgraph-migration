import { NameWrapperInterface } from '../interfaces';
import {
  Account,
  Domain,
  ExpiryExtended,
  FusesSet,
  NameUnwrapped,
  NameWrapped,
  WrappedDomain,
  WrappedTransfer,
} from '../model';
import {
  checkValidLabel,
  concatUint8Arrays,
  createEventID,
  createOrLoadAccount,
  createOrLoadDomain,
  hexStringToUint8Array,
  uint8ArrayToHexString,
} from '../utils';
import { BIG_INT_ZERO } from './ens-registry.handle';
import { ETH_NODE } from './eth-registrar.handle';

function fromHexString(hex: string): Uint8Array {
  if (hex.length % 2 == 0) {
    console.log('input ' + hex + ' has odd length');
  }

  // Skip possible `0x` prefix.
  if (hex.length >= 2 && hex.charAt(0) == '0' && hex.charAt(1) == 'x') {
    hex = hex.substr(2);
  }
  const output = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    output[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return output;
}

function decodeName(buf: string): Array<string> | null {
  let offset = 0;
  let list = new Uint8Array(0);
  let dot = fromHexString('2e');
  let hex = hexStringToUint8Array(buf);
  let len = hex[offset++];
  let firstLabel = '';
  if (len === 0) {
    return [firstLabel, '.'];
  }

  while (len) {
    let label = buf.slice((offset + 1) * 2, (offset + 1 + len) * 2);
    let labelBytes = fromHexString(label);

    if (!checkValidLabel(uint8ArrayToHexString(labelBytes))) {
      return null;
    }

    if (offset > 1) {
      list = concatUint8Arrays(list, dot);
    } else {
      firstLabel = labelBytes.toString();
    }
    list = concatUint8Arrays(list, labelBytes);
    offset += len;
    len = hex[offset++];
  }
  return [firstLabel, list.toString()];
}

const PARENT_CANNOT_CONTROL = 65536;

function checkPccBurned(fuses: any): boolean {
  return (fuses & PARENT_CANNOT_CONTROL) == PARENT_CANNOT_CONTROL;
}

export function handleNameWrapped(
  data: NameWrapperInterface.INameWrapped,
  domains: Map<string, Domain>,
  accounts: Map<string, Account>,
  wrappedDomains: Map<string, WrappedDomain>,
  nameWrappedEvents: Map<string, NameWrapped>,
) {
  const {
    name: inputName,
    node,
    expiry,
    fuses,
    blockNumber,
    hash,
    owner,
    logIndex,
  } = data;
  let decoded = decodeName(inputName);
  let label: string | null = null;
  let name: string | null = null;
  if (decoded !== null) {
    label = decoded[0];
    name = decoded[1];
  }
  let account = createOrLoadAccount(accounts, owner);
  let domain = createOrLoadDomain(domains, node);

  if (!domain.labelName && label) {
    domain.labelName = label;
    domain.name = name;
  }
  if (
    checkPccBurned(fuses) &&
    (!domain.expiryDate || expiry > domain.expiryDate!)
  ) {
    domain.expiryDate = expiry;
  }
  domain.wrappedOwner = account;
  domains.set(domain.id, domain);

  const wrappedDomain = new WrappedDomain({
    id: node,
    domain,
    expiryDate: expiry,
    fuses,
    owner: account,
    name,
  });

  const eventId = createEventID(blockNumber, logIndex);
  const nameWrappedEvent = new NameWrapped({
    id: eventId,
    domain,
    name,
    wrappedFuses: fuses,
    wrappedExpiryDate: expiry,
    owner: account,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
  });

  wrappedDomains.set(wrappedDomain.id, wrappedDomain);
  nameWrappedEvents.set(nameWrappedEvent.id, nameWrappedEvent);
}

export function handleNameUnwrapped(
  data: NameWrapperInterface.INameUnwrapped,
  domains: Map<string, Domain>,
  accounts: Map<string, Account>,
  wrappedDomains: Map<string, WrappedDomain>,
  nameUnwrappedEvents: Map<string, NameUnwrapped>,
) {
  const { node, owner, blockNumber, hash, logIndex } = data;

  const account = createOrLoadAccount(accounts, owner);

  const domain = createOrLoadDomain(domains, node);

  domain.wrappedOwner = null;
  if (domain.expiryDate && domain.parent && domain.parent.id !== ETH_NODE) {
    domain.expiryDate = null;
  }
  domains.set(domain.id, domain);

  const eventId = createEventID(blockNumber, logIndex);

  let nameUnwrappedEvent = new NameUnwrapped({
    id: eventId,
    domain,
    unwrappedOwner: account,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
  });

  nameUnwrappedEvents.set(nameUnwrappedEvent.id, nameUnwrappedEvent);
  wrappedDomains.delete(node);
}

export function handleFusesSet(
  data: NameWrapperInterface.IFusesSet,
  domains: Map<string, Domain>,
  wrappedDomains: Map<string, WrappedDomain>,
  fusesSetEvents: Map<string, FusesSet>,
) {
  const { node, fuses, blockNumber, logIndex, hash } = data;

  const wrappedDomain = wrappedDomains.get(node);
  const domain = createOrLoadDomain(domains, node);
  if (wrappedDomain) {
    wrappedDomain.fuses = fuses;
    wrappedDomains.set(wrappedDomain.id, wrappedDomain);
    if (wrappedDomain.expiryDate && checkPccBurned(wrappedDomain.fuses)) {
      if (!domain.expiryDate || wrappedDomain.expiryDate > domain.expiryDate!) {
        domain.expiryDate = wrappedDomain.expiryDate;
        domains.set(domain.id, domain);
      }
    }
  }
  const eventId = createEventID(blockNumber, logIndex);

  const fusesBurnedEvent = new FusesSet({
    id: eventId,
    domain,
    fusesSet: fuses,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
  });

  fusesSetEvents.set(fusesBurnedEvent.id, fusesBurnedEvent);
}

export function handleExpiryExtended(
  data: NameWrapperInterface.IExpiryExtended,
  domains: Map<string, Domain>,
  wrappedDomains: Map<string, WrappedDomain>,
  expiryExtendedEvents: Map<string, ExpiryExtended>,
) {
  const { node, expiry, blockNumber, hash, logIndex } = data;
  const wrappedDomain = wrappedDomains.get(node);
  const domain = createOrLoadDomain(domains, node);
  if (wrappedDomain) {
    wrappedDomain.expiryDate = expiry;
    wrappedDomains.set(wrappedDomain.id, wrappedDomain);

    if (checkPccBurned(wrappedDomain.fuses)) {
      if (!domain.expiryDate || expiry > domain.expiryDate!) {
        domain.expiryDate = expiry;
        domains.set(domain.id, domain);
      }
    }
  }

  const eventId = createEventID(blockNumber, logIndex);
  const expiryExtendedEvent = new ExpiryExtended({
    id: eventId,
    domain,
    expiryDate: expiry,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
  });
  expiryExtendedEvents.set(expiryExtendedEvent.id, expiryExtendedEvent);
}

export function handleTransferSingle(
  data: NameWrapperInterface.ITransferSingle,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  wrappedDomains: Map<string, WrappedDomain>,
  wrappedTransfers: Map<string, WrappedTransfer>,
) {
  const { to, id: node, blockNumber, logIndex, hash } = data;
  const _to = createOrLoadAccount(accounts, to);
  const namehash = '0x' + node.toString().slice(2).padStart(64, '0');
  const domain = createOrLoadDomain(domains, namehash);

  const wrappedDomain = wrappedDomains.get(namehash);

  // new registrations emit the Transfer` event before the NameWrapped event
  // so we need to create the WrappedDomain entity here
  if (!wrappedDomain) {
    const newWrappedDomain = new WrappedDomain({ id: namehash });
    newWrappedDomain.domain = domain;

    // placeholders until we get the NameWrapped event
    newWrappedDomain.expiryDate = BIG_INT_ZERO;
    newWrappedDomain.fuses = 0;
    newWrappedDomain.owner = _to;
    wrappedDomains.set(newWrappedDomain.id, newWrappedDomain);
  } else {
    wrappedDomain.owner = _to;
    wrappedDomains.set(wrappedDomain.id, wrappedDomain);
  }

  domain.wrappedOwner = _to;
  domains.set(domain.id, domain);

  const eventId = createEventID(blockNumber, logIndex);
  const wrappedTransfer = new WrappedTransfer({
    id: eventId,
    domain,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    wrappedTransferOwner: _to,
  });
  wrappedTransfers.set(wrappedTransfer.id, wrappedTransfer);
}

export function handleTransferBatch(
  data: NameWrapperInterface.ITransferBatch,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  wrappedDomains: Map<string, WrappedDomain>,
  wrappedTransfers: Map<string, WrappedTransfer>,
) {
  const { ids, to, blockNumber, logIndex, hash } = data;

  for (let i = 0; i < ids.length; i++) {
    handleTransferSingle(
      {
        to,
        id: ids[i],
        blockNumber,
        logIndex,
        hash,
      },
      accounts,
      domains,
      wrappedDomains,
      wrappedTransfers,
    );
  }
}
