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

async function getDomain(
  node: string,
  ctx: DataHandlerContext<
    Store,
    {
      transaction: {
        from: true;
        value: true;
        hash: true;
      };
    }
  >,
  timestamp: bigint = BIG_INT_ZERO,
): Promise<Domain | undefined> {
  const domain = await ctx.store.findOneBy(Domain, {
    id: node,
  });
  if (domain && node == ROOT_NODE) {
    return createDomain(node, timestamp);
  } else {
    return domain;
  }
}

async function recurseDomainDelete(
  domain: Domain,
  ctx: DataHandlerContext<
    Store,
    {
      transaction: {
        from: true;
        value: true;
        hash: true;
      };
    }
  >,
): Promise<string | null> {
  if (
    (!domain.resolver ||
      uint8ArrayToHexString(domain.resolver.address).split('-')[0] ==
        EMPTY_ADDRESS) &&
    domain.owner &&
    domain.owner.id == EMPTY_ADDRESS &&
    domain.subdomainCount == 0
  ) {
    if (domain.parent) {
      const parentDomain = await ctx.store.findOneBy(Domain, {
        id: domain.parent.id,
      });
      if (parentDomain) {
        parentDomain.subdomainCount = parentDomain.subdomainCount - 1;

        await ctx.store.save(parentDomain);
        return await recurseDomainDelete(parentDomain, ctx);
      }

      return null;
    }
  }

  return domain.id;
}

async function saveDomain(
  domain: Domain,
  ctx: DataHandlerContext<
    Store,
    {
      transaction: {
        from: true;
        value: true;
        hash: true;
      };
    }
  >,
): Promise<void> {
  await recurseDomainDelete(domain, ctx);
  await ctx.store.save(domain);
}

// Handler for NewOwner events
export async function handleNewOwner(
  data: EnsRegistryInterface.INewOwner,
  isMigrated: boolean,
): Promise<void> {
  const {
    ctx,
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

  await ctx.store.save(account);
  const subnode = makeSubnode(node, label);

  let domain = await getDomain(subnode, ctx, BigInt(timestamp));
  const parent = await getDomain(node, ctx);

  if (!domain) {
    domain = new Domain({
      id: subnode,
      createdAt: BigInt(timestamp),
      subdomainCount: 0,
    });
  }

  if (!domain.parent && parent) {
    parent.subdomainCount = parent.subdomainCount + 1;
    await ctx.store.save(parent);
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

  await saveDomain(domain, ctx);
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

  await ctx.store.save(newOwnerEvent);
  await ctx.store.save(domainEvent);
}

// Handler for Transfer events
export async function handleTransfer(
  data: EnsRegistryInterface.ITransfer,
): Promise<void> {
  const { ctx, owner, node, blockNumber, logIndex, hash } = data;
  const account = new Account({
    id: owner,
  });

  await ctx.store.save(account);
  // Update the domain owner
  const domain = await ctx.store.findOneBy(Domain, { id: node });
  if (!domain) {
    return;
  }

  domain.owner = account;
  await ctx.store.save(domain);

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

  await ctx.store.save(transferEvent);
  await ctx.store.save(domainEvent);
}

// Handler for NewResolver events
export async function handleNewResolver(
  data: EnsRegistryInterface.INewResolver,
): Promise<void> {
  let id: string | null;

  const { resolverAddress, node, ctx, blockNumber, logIndex, hash } = data;
  // we don't want to create a resolver entity for 0x0
  if (resolverAddress == EMPTY_ADDRESS) {
    id = null;
  } else {
    id = resolverAddress.concat('-').concat(node);
  }

  const domain = await ctx.store.findOneBy(Domain, { id: node });

  if (!domain) {
    return;
  }
  let resolver;

  if (id) {
    resolver = await ctx.store.findOneBy(Resolver, { id });
    if (resolver == null) {
      resolver = new Resolver({
        id,
        domain,
        address: hexStringToUint8Array(resolverAddress),
      });

      await ctx.store.save(resolver);
      // since this is a new resolver entity, there can't be a resolved address yet so set to null
      domain.resolvedAddress = null;
    } else {
      domain.resolvedAddress = resolver.addr;
    }
  } else {
    domain.resolvedAddress = null;
  }

  await ctx.store.save(domain);

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

  await ctx.store.save(newResolverEvent);
  await ctx.store.save(domainEvent);
}

// Handler for NewTTL events
export async function handleNewTTL(
  data: EnsRegistryInterface.INewTTL,
): Promise<void> {
  const { ctx, logIndex, hash, node, ttl, blockNumber } = data;
  const domain = await ctx.store.findOneBy(Domain, { id: node });

  // For the edge case that a domain's owner and resolver are set to empty
  // in the same transaction as setting TTL
  if (domain) {
    domain.ttl = ttl;
    await ctx.store.save(domain);
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
  await ctx.store.save(newTTLEvent);
  await ctx.store.save(domainEvent);
}

export async function handleNewOwnerOldRegistry(
  data: EnsRegistryInterface.INewOwner,
): Promise<void> {
  const { ctx, node, label, timestamp } = data;
  const subnode = makeSubnode(node, label);
  let domain = await getDomain(subnode, ctx, BigInt(timestamp));

  if (domain == null || domain.isMigrated == false) {
    await handleNewOwner(data, false);
  }
}

export async function handleTransferOldRegistry(
  data: EnsRegistryInterface.ITransfer,
): Promise<void> {
  const { node, ctx, timestamp } = data;
  let domain = await getDomain(node, ctx, BigInt(timestamp))!;
  if (domain && domain.isMigrated == false) {
    await handleTransfer(data);
  }
}

export async function handleNewTTLOldRegistry(
  data: EnsRegistryInterface.INewTTL,
): Promise<void> {
  const { node, ctx, timestamp } = data;
  const domain = await getDomain(node, ctx, BigInt(timestamp))!;
  if (domain && domain.isMigrated == false) {
    await handleNewTTL(data);
  }
}

export async function handleNewResolverOldRegistry(
  data: EnsRegistryInterface.INewResolver,
): Promise<void> {
  const { node, timestamp, ctx } = data;
  const domain = await getDomain(node, ctx, BigInt(timestamp))!;
  if (node == ROOT_NODE || (domain && !domain.isMigrated)) {
    await handleNewResolver(data);
  }
}
