// import { keccak256 } from 'ethers';
// import { Account } from '../model';

import { keccak256 } from 'ethers';
import { INameChanged } from '../interfaces/resolver.interface';
import {
  Account,
  Domain,
  NameRegistered,
  NameRenewed,
  NameTransferred,
  Registration,
  RegistrationEvent,
} from '../model';
import {
  byteArrayFromHex,
  checkValidLabel,
  concatUint8Arrays,
  createEventID,
  hexStringToUint8Array,
  uint256ToUint8Array,
  uint8ArrayToHexString,
} from '../utils';
import { EthRegistrarInterface } from '../interfaces';
import { DataHandlerContext } from '@subsquid/evm-processor';
import { Store } from '@subsquid/typeorm-store';

const GRACE_PERIOD_SECONDS = BigInt(7776000); // 90 days

export const ETH_NODE =
  '93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae';

const rootNode = byteArrayFromHex(ETH_NODE);

export function handleNameRegistered(
  data: EthRegistrarInterface.INameRegistered,
  domainLabels: Map<string, string>,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
  registrationEvents: Map<string, RegistrationEvent>,
  nameRegisteredEvents: Map<string, NameRegistered>,
) {
  const { blockNumber, logIndex, hash, id, owner, expires, timestamp } = data;

  let account = new Account({
    id: owner,
  });

  accounts.set(account.id, account);

  const label = uint256ToUint8Array(id);

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = domains.get(domainId);

  if (!domain) return;
  const registration = new Registration({
    id: uint8ArrayToHexString(label),
    domain,
    registrationDate: timestamp,
    expiryDate: expires,
    registrant: account,
  });

  domain.registrant = account;
  domain.expiryDate = expires + GRACE_PERIOD_SECONDS;

  const labelName = domainLabels.get(uint8ArrayToHexString(label));
  if (labelName) {
    domain.labelName = labelName;
    domain.name = labelName! + '.eth';
    registration.labelName = labelName;
  }

  const eventId = createEventID(blockNumber, logIndex);

  const eventData = {
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    registrant: account,
    expiryDate: expires,
  };
  const nameRegisteredEvent = new NameRegistered(eventData);

  const registrationEvent = new RegistrationEvent({
    ...eventData,
    nameRegistered: nameRegisteredEvent,
  });

  registrationEvents.set(registrationEvent.id, registrationEvent);
  domains.set(domain.id, domain);
  registrations.set(registration.id, registration);
  nameRegisteredEvents.set(nameRegisteredEvent.id, nameRegisteredEvent);
}

function setNamePreimage(
  name: string,
  label: string,
  cost: bigint,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
) {
  if (!checkValidLabel(name)) {
    return;
  }

  const domainId = keccak256(
    concatUint8Arrays(rootNode, hexStringToUint8Array(label)),
  );

  const domain = domains.get(domainId);
  if (domain && domain.labelName !== name) {
    domain.labelName = name;
    domain.name = name + '.eth';
    domains.set(domain.id, domain);
  }

  const registration = registrations.get(label);
  if (registration == null) return;
  registration.labelName = name;
  registration.cost = cost;
  registrations.set(registration.id, registration);
}

export async function handleNameRegisteredByControllerOld(
  data: EthRegistrarInterface.INameRegisteredOld,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
): Promise<void> {
  const { name, label, cost } = data;
  await setNamePreimage(name, label, cost, domains, registrations);
}

export function handleNameRegisteredByController(
  data: EthRegistrarInterface.INameRegisteredByController,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
) {
  const { name, label, baseCost, premium } = data;
  const totalConst = baseCost + premium;
  setNamePreimage(name, label, totalConst, domains, registrations);
}

export async function handleNameRenewedByController(
  data: EthRegistrarInterface.INameRenewedByController,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
): Promise<void> {
  const { name, label, cost } = data;
  await setNamePreimage(name, label, cost, domains, registrations);
}

export async function handleNameRenewed(
  data: EthRegistrarInterface.INameRenewed,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
  registrationEvents: Map<string, RegistrationEvent>,
  nameRenewedEvents: Map<string, NameRenewed>,
): Promise<void> {
  const { blockNumber, expires, hash, id, logIndex } = data;
  const label = uint256ToUint8Array(id);
  const registrationId = uint8ArrayToHexString(label);
  const registration = registrations.get(registrationId);

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = domains.get(domainId);

  if (registration) registration.expiryDate = expires;
  if (domain) domain.expiryDate = expires + GRACE_PERIOD_SECONDS;

  const eventId = createEventID(blockNumber, logIndex);

  const eventData = {
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    expiryDate: expires,
  };
  const nameRenewedEvent = new NameRenewed(eventData);

  const registrationEvent = new RegistrationEvent({
    ...eventData,
    nameRenewed: nameRenewedEvent,
  });

  if (domain) domains.set(domain.id, domain);
  if (registration) registrations.set(registration.id, registration);
  nameRenewedEvents.set(nameRenewedEvent.id, nameRenewedEvent);
  registrationEvents.set(registrationEvent.id, registrationEvent);
}

export function handleNameTransferred(
  data: EthRegistrarInterface.ITransfer,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  registrations: Map<string, Registration>,
  registrationEvents: Map<string, RegistrationEvent>,
  transferEvents: Map<string, NameTransferred>,
) {
  const { to, blockNumber, hash, logIndex, tokenId } = data;
  let account = new Account({
    id: to,
  });

  // let label = uint256ToByteArray(event.params.tokenId);
  const label = uint256ToUint8Array(tokenId);

  const registrationId = uint8ArrayToHexString(label);
  const registration = registrations.get(registrationId);

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = domains.get(domainId);

  if (registration) {
    registration.registrant = account;
    registrations.set(registration.id, registration);
  }
  if (domain) {
    domain.registrant = account;
    domains.set(domain.id, domain);
  }

  const eventId = createEventID(blockNumber, logIndex);

  const eventData = {
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    newOwner: account,
  };
  const transferEvent = new NameTransferred(eventData);
  const registrationEvent = new RegistrationEvent({
    ...eventData,
    nameTransferred: transferEvent,
  });

  accounts.set(account.id, account);
  transferEvents.set(transferEvent.id, transferEvent);
  registrationEvents.set(registrationEvent.id, registrationEvent);
}
