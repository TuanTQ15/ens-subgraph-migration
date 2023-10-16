import { DataHandlerContext } from '@subsquid/evm-processor';
import {
  Account,
  Domain,
  DomainEvent,
  NewOwner,
  NewResolver,
  NewTTL,
  Resolver,
  Transfer,
} from '../model';
import {
  concatUint8Arrays,
  createEventID,
  hexStringToUint8Array,
  int32ToBigInt,
  uint8ArrayToHexString,
} from '../utils';
import { keccak256 } from 'ethers';
import { Store } from '@subsquid/typeorm-store';
import { EnsRegistryInterface } from '../interfaces';

export const ROOT_NODE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const BIG_INT_ZERO = int32ToBigInt(0);
export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

function makeSubnode(node: string, label: string): string {
  const endCodeNode = hexStringToUint8Array(node);
  const endCodeLabel = hexStringToUint8Array(label);
  const concatenatedArray = concatUint8Arrays(endCodeNode, endCodeLabel);
  const hash = keccak256(concatenatedArray);
  return hash;
}

function createDomain(node: string, timestamp: bigint): Domain {
  let domain = new Domain({
    id: node,
  });
  const owner = new Account({
    id: EMPTY_ADDRESS,
  });
  if (node == ROOT_NODE) {
    domain = new Domain({
      id: node,
      owner,
      isMigrated: true,
      createdAt: timestamp,
      subdomainCount: 0,
    });
  }
  return domain;
}

function getDomain(
  node: string,
  domains: Map<string, Domain>,
  timestamp: bigint = BIG_INT_ZERO,
): Domain | undefined {
  const domain = domains.get(node);
  if (domain && node == ROOT_NODE) {
    return createDomain(node, timestamp);
  } else {
    return domain;
  }
}

function recurseDomainDelete(
  domain: Domain,
  domains: Map<string, Domain>,
): string | null {
  if (
    (!domain.resolver ||
      uint8ArrayToHexString(domain.resolver.address).split('-')[0] ==
        EMPTY_ADDRESS) &&
    domain.owner &&
    domain.owner.id == EMPTY_ADDRESS &&
    domain.subdomainCount == 0
  ) {
    if (domain.parent) {
      const parentDomain = domains.get(domain.parent.id);
      if (parentDomain) {
        parentDomain.subdomainCount = parentDomain.subdomainCount - 1;

        domains.set(parentDomain.id, parentDomain);
        return recurseDomainDelete(parentDomain, domains);
      }

      return null;
    }
  }

  return domain.id;
}

async function saveDomain(
  domain: Domain,
  domains: Map<string, Domain>,
): Promise<void> {
  await recurseDomainDelete(domain, domains);

  domains.set(domain.id, domain);
}

// Handler for NewOwner events
export function handleNewOwner(
  data: EnsRegistryInterface.INewOwner,
  isMigrated: boolean,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  newOwnerEvents: Map<string, NewOwner>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const {
    node,
    label,
    blockNumber,
    logIndex,
    hash,
    owner,
    timestamp,
    domainLabels,
  } = data;
  const account = new Account({
    id: owner,
    domains: [],
    wrappedDomains: [],
    registrations: [],
  });

  //await ctx.store.save(account);
  accounts.set(account.id, account);
  const subnode = makeSubnode(node, label);

  let domain = getDomain(subnode, domains, BigInt(timestamp));
  const parent = getDomain(node, domains);

  if (!domain) {
    domain = new Domain({
      id: subnode,
      createdAt: BigInt(timestamp),
      subdomainCount: 0,
    });
  }

  if (!domain.parent && parent) {
    parent.subdomainCount = parent.subdomainCount + 1;
    domains.set(parent.id, parent);
    if (parent.labelName) domainLabels.set(label, parent.labelName);
  }

  if (!domain.name) {
    // Get label and node names
    let existLabel = domainLabels.get(label);
    if (existLabel) {
      domain.labelName = existLabel;
    }

    if (!existLabel) {
      existLabel = '[' + label.slice(2) + ']';
      domainLabels.set(label, existLabel);
    }

    if (
      node ==
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      domain.name = label;
      domainLabels.set(label, existLabel);
    } else {
      //parent = parent!;
      const name = parent ? parent.name : null;
      if (existLabel && name) {
        const newName = existLabel + '.' + name;
        domain.name = newName;
        domainLabels.set(label, newName);
      }
    }
  }
  domain.owner = account;
  domain.parent = parent;
  domain.labelhash = hexStringToUint8Array(label);
  domain.isMigrated = isMigrated;

  saveDomain(domain, domains);
  const domainEventId = createEventID(blockNumber, logIndex);

  const newOwnerEvent = new NewOwner({
    id: domainEventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newOwner: account,
  });

  const domainEvent = new DomainEvent({
    id: domainEventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newOwner: newOwnerEvent,
  });

  newOwnerEvents.set(newOwnerEvent.id, newOwnerEvent);
  domainEvents.set(domainEvent.id, domainEvent);
}

// Handler for Transfer events
export function handleTransfer(
  data: EnsRegistryInterface.ITransfer,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  transferEvents: Map<string, Transfer>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { owner, node, blockNumber, logIndex, hash } = data;
  const account = new Account({
    id: owner,
  });

  accounts.set(account.id, account);
  // Update the domain owner
  const domain = domains.get(node);
  if (domain) {
    domain.owner = account;
    domains.set(domain.id, domain);
  }

  const domainEventId = createEventID(blockNumber, logIndex);
  const transferEvent = new Transfer({
    id: domainEventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    transferOwner: account,
  });

  const domainEvent = new DomainEvent({
    id: domainEventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    transfer: transferEvent,
  });

  transferEvents.set(transferEvent.id, transferEvent);
  domainEvents.set(domainEvent.id, domainEvent);
}

// Handler for NewResolver events
export function handleNewResolver(
  data: EnsRegistryInterface.INewResolver,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  newResolverEvents: Map<string, NewResolver>,
  domainEvents: Map<string, DomainEvent>,
): void {
  let id: string | null;

  const { resolverAddress, node, blockNumber, logIndex, hash } = data;
  // we don't want to create a resolver entity for 0x0
  if (resolverAddress == EMPTY_ADDRESS) {
    id = null;
  } else {
    id = resolverAddress.concat('-').concat(node);
  }

  const domain = domains.get(node);

  if (!domain) {
    return;
  }
  let resolver;

  if (id) {
    resolver = resolvers.get(id);
    if (resolver == null) {
      resolver = new Resolver({
        id,
        domain,
        address: hexStringToUint8Array(resolverAddress),
      });

      resolvers.set(resolver.id, resolver);
      // since this is a new resolver entity, there can't be a resolved address yet so set to null
      domain.resolvedAddress = null;
    } else {
      domain.resolvedAddress = resolver.addr;
    }
  } else {
    domain.resolvedAddress = null;
  }

  domains.set(domain.id, domain);
  const eventId = createEventID(blockNumber, logIndex);

  const newResolverEvent = new NewResolver({
    id: eventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newResolver: resolver,
  });

  const domainEvent = new DomainEvent({
    id: eventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newResolver: newResolverEvent,
  });

  newResolverEvents.set(newResolverEvent.id, newResolverEvent);

  domainEvents.set(domainEvent.id, domainEvent);
}

// Handler for NewTTL events
export function handleNewTTL(
  data: EnsRegistryInterface.INewTTL,
  domains: Map<string, Domain>,
  newTTLEvents: Map<string, NewTTL>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { logIndex, hash, node, ttl, blockNumber } = data;
  const domain = domains.get(node);

  // For the edge case that a domain's owner and resolver are set to empty
  // in the same transaction as setting TTL
  if (domain) {
    domain.ttl = ttl;
    domains.set(domain.id, domain);
  }
  const eventId = createEventID(blockNumber, logIndex);
  const newTTLEvent = new NewTTL({
    id: eventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newTTL: ttl,
  });

  const domainEvent = new DomainEvent({
    id: eventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    domain,
    newTTL: newTTLEvent,
  });
  newTTLEvents.set(newTTLEvent.id, newTTLEvent);
  domainEvents.set(domainEvent.id, domainEvent);
}

export function handleNewOwnerOldRegistry(
  data: EnsRegistryInterface.INewOwner,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  newOwnerEvents: Map<string, NewOwner>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { node, label, timestamp } = data;
  const subnode = makeSubnode(node, label);
  let domain = getDomain(subnode, domains, BigInt(timestamp));

  if (domain == null || domain.isMigrated == false) {
    handleNewOwner(
      data,
      false,
      accounts,
      domains,
      newOwnerEvents,
      domainEvents,
    );
  }
}

export function handleTransferOldRegistry(
  data: EnsRegistryInterface.ITransfer,
  accounts: Map<string, Account>,
  domains: Map<string, Domain>,
  transferEvents: Map<string, Transfer>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { node, timestamp } = data;
  let domain = getDomain(node, domains, BigInt(timestamp))!;
  if (domain && domain.isMigrated == false) {
    handleTransfer(data, accounts, domains, transferEvents, domainEvents);
  }
}

export function handleNewTTLOldRegistry(
  data: EnsRegistryInterface.INewTTL,
  domains: Map<string, Domain>,
  newTTLEvents: Map<string, NewTTL>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { node, timestamp } = data;
  const domain = getDomain(node, domains, BigInt(timestamp))!;
  if (domain && domain.isMigrated == false) {
    handleNewTTL(data, domains, newTTLEvents, domainEvents);
  }
}

export function handleNewResolverOldRegistry(
  data: EnsRegistryInterface.INewResolver,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  newResolverEvents: Map<string, NewResolver>,
  domainEvents: Map<string, DomainEvent>,
): void {
  const { node, timestamp } = data;
  const domain = getDomain(node, domains, BigInt(timestamp));
  if (node == ROOT_NODE || (domain && !domain.isMigrated)) {
    handleNewResolver(
      data,
      domains,
      resolvers,
      newResolverEvents,
      domainEvents,
    );
  }
}
