import { DataHandlerContext } from '@subsquid/evm-processor';
import {
  Account,
  Resolver,
  Domain,
  AddrChanged,
  AbiChanged,
  ResolverEvent,
  MulticoinAddrChanged,
  AuthorisationChanged,
  ContenthashChanged,
  InterfaceChanged,
  NameChanged,
  PubkeyChanged,
  TextChanged,
  VersionChanged,
} from '../model';
import { Store } from '@subsquid/typeorm-store';
import { createEventID, hexStringToUint8Array } from '../utils';
import { ResolverInterface } from '../interfaces';

function createResolverID(node: string, resolver: string): string {
  return resolver.concat('-').concat(node);
}

async function getOrCreateResolver(
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
  node: string,
  address: string,
): Promise<Resolver> {
  const id = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id });

  if (resolver) return resolver;

  const [domain] = await Promise.all([
    ctx.store.findOneBy(Domain, { id: node }),
  ]);

  const newResolver = new Resolver({
    id,
    domain,
    address: hexStringToUint8Array(address),
  });

  await ctx.store.save(newResolver);
  return newResolver;
}

export async function handleAddrChanged(
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
  node: string,
  a: string,
  address: string,
  blockNumber: number,
  logIndex: number,
  hash: string,
): Promise<void> {
  const account = new Account({
    id: a,
  });

  const domain = await ctx.store.findOneBy(Domain, {
    id: node,
  });

  const resolverId = createResolverID(node, address);
  if (domain && domain.resolver?.id == resolverId) {
    domain.resolvedAddress = account;
    await ctx.store.save(domain);
  }

  const resolver = new Resolver({
    id: resolverId,
    domain,
    address: hexStringToUint8Array(address),
    addr: account,
  });

  const eventId = createEventID(blockNumber, logIndex);
  const dataEvent = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    addr: account,
  };
  const addrChangedEvent = new AddrChanged(dataEvent);
  const resolveEvent = new ResolverEvent(dataEvent);

  await ctx.store.save(account);
  await ctx.store.save(resolver);
  await Promise.all([
    ctx.store.save(resolveEvent),
    ctx.store.save(addrChangedEvent),
  ]);
}

export async function handleMulticoinAddrChanged(
  data: ResolverInterface.IMulticoinAddrChanged,
): Promise<void> {
  const {
    ctx,
    node,
    coinType,
    newAddress,
    address,
    blockNumber,
    logIndex,
    hash,
  } = data;
  const resolver = await getOrCreateResolver(ctx, node, address);

  if (!resolver.coinTypes) {
    resolver.coinTypes = [coinType];
  } else {
    const coinTypes = resolver.coinTypes;
    if (!coinTypes.includes(coinType)) {
      coinTypes.push(coinType);
      resolver.coinTypes = coinTypes;
    }
  }
  await ctx.store.save(resolver);

  const eventId = createEventID(blockNumber, logIndex);
  const dataEvent = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    coinType: BigInt(coinType),
    addr: newAddress ? hexStringToUint8Array(newAddress) : new Uint8Array(),
  };
  const resolverEvent = new ResolverEvent(dataEvent);
  const eventChangeAddress = new MulticoinAddrChanged(dataEvent);

  await Promise.all([
    ctx.store.save(resolverEvent),
    ctx.store.save(eventChangeAddress),
  ]);
}

export async function handleNameChanged(
  data: ResolverInterface.INameChanged,
): Promise<void> {
  const { ctx, address, blockNumber, logIndex, hash, node, name } = data;
  if (name.indexOf('\u0000') != -1) return;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id: resolverId });
  const resolverEvent = new NameChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    name,
  });

  await ctx.store.save(resolverEvent);
}

export async function handleABIChanged(
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
  node: string,
  contentType: bigint,
  address: string,
  blockNumber: number,
  logIndex: number,
  hash: string,
) {
  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id: resolverId });

  const dataEvent = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    contentType,
  };
  const adiChangedEvent = new AbiChanged(dataEvent);
  const resolveEvent = new ResolverEvent(dataEvent);
  await Promise.all([
    ctx.store.save(adiChangedEvent),
    ctx.store.save(resolveEvent),
  ]);
}

export async function handlePubkeyChanged(
  data: ResolverInterface.IPubkeyChanged,
): Promise<void> {
  const { ctx, address, blockNumber, logIndex, hash, node, x, y } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id: resolverId });

  const resolverEvent = new PubkeyChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    x: x ? hexStringToUint8Array(x) : new Uint8Array(),
    y: y ? hexStringToUint8Array(y) : new Uint8Array(),
  });

  await ctx.store.save(resolverEvent);
}

export async function handleTextChanged(
  data: ResolverInterface.ITextChanged,
): Promise<void> {
  const { ctx, address, blockNumber, logIndex, hash, node, key } = data;
  const resolver = await getOrCreateResolver(ctx, node, address);

  if (resolver.texts == null) {
    resolver.texts = [key];
    await ctx.store.save(resolver);
  } else {
    const texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      await ctx.store.save(resolver);
    }
  }

  const eventId = createEventID(blockNumber, logIndex);
  const resolverEvent = new TextChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    key,
  });

  await ctx.store.save(resolverEvent);
}

export async function handleTextChangedWithValue(
  data: ResolverInterface.ITextChangedWithValue,
): Promise<void> {
  const { ctx, address, blockNumber, logIndex, hash, node, key, value } = data;
  const resolver = await getOrCreateResolver(ctx, node, address);

  if (resolver.texts == null) {
    resolver.texts = [key];
    await ctx.store.save(resolver);
  } else {
    const texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      await ctx.store.save(resolver);
    }
  }

  const eventId = createEventID(blockNumber, logIndex);
  const resolverEvent = new TextChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    key,
    value,
  });

  await ctx.store.save(resolverEvent);
}

export async function handleContentHashChanged(
  event: ResolverInterface.IContenthashChanged,
): Promise<void> {
  const { ctx, node, contentHash, hash, blockNumber, address, logIndex } =
    event;

  const resolver = await getOrCreateResolver(ctx, node, address);

  resolver.contentHash = hexStringToUint8Array(contentHash);
  await ctx.store.save(resolver);

  const resolverEvent = new ContenthashChanged({
    id: createEventID(blockNumber, logIndex),
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    hash: resolver.contentHash,
  });
  await ctx.store.save(resolverEvent);
}

export async function handleInterfaceChanged(
  data: ResolverInterface.IInterfaceChanged,
): Promise<void> {
  const {
    node,
    interfaceID,
    implementer,
    hash,
    blockNumber,
    logIndex,
    ctx,
    address,
  } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id: resolverId });
  const resolverEvent = new InterfaceChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    interfaceID: interfaceID
      ? hexStringToUint8Array(interfaceID)
      : new Uint8Array(),
    implementer: implementer
      ? hexStringToUint8Array(implementer)
      : new Uint8Array(),
  });

  await ctx.store.save(resolverEvent);
}

export async function handleAuthorisationChanged(
  data: ResolverInterface.IAuthorisationChanged,
): Promise<void> {
  const {
    ctx,
    blockNumber,
    logIndex,
    hash,
    node,
    owner,
    target,
    isAuthorised,
    address,
  } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = await ctx.store.findOneBy(Resolver, { id: resolverId });
  const eventData = {
    id: eventId,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    resolver,
    target: hexStringToUint8Array(target),
    isAuthorized: isAuthorised,
    owner: hexStringToUint8Array(owner),
  };

  const authorizationEvent = new AuthorisationChanged(eventData);

  await ctx.store.save(authorizationEvent);
}

export async function handleVersionChanged(
  data: ResolverInterface.IVersionChanged,
): Promise<void> {
  const { ctx, blockNumber, logIndex, hash, node, address, newVersion } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolver = await getOrCreateResolver(ctx, node, address);

  const resolverEvent = new VersionChanged({
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    version: newVersion,
  });

  await ctx.store.save(resolverEvent);
  const domain = await ctx.store.findOneBy(Domain, { id: node });
  if (domain && domain.resolver === resolverEvent.resolver) {
    domain.resolvedAddress = null;
    await ctx.store.save(domain);
  }

  resolver.addr = null;
  resolver.contentHash = null;
  resolver.texts = null;
  resolver.coinTypes = null;
  await ctx.store.save(resolver);
}
