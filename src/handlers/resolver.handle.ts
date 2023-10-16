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
import { createEventID, hexStringToUint8Array } from '../utils';
import { ResolverInterface } from '../interfaces';

function createResolverID(node: string, resolver: string): string {
  return resolver.concat('-').concat(node);
}

function getOrCreateResolver(
  resolvers: Map<string, Resolver>,
  domains: Map<string, Domain>,
  node: string,
  address: string,
): Resolver {
  const id = createResolverID(node, address);
  const resolver = resolvers.get(id);

  if (resolver) return resolver;

  const domain = domains.get(node);
  const newResolver = new Resolver({
    id,
    domain,
    address: hexStringToUint8Array(address),
  });

  resolvers.set(newResolver.id, newResolver);
  return newResolver;
}

export async function handleAddrChanged(
  data: ResolverInterface.IAddrChanged,
  domains: Map<string, Domain>,
  accounts: Map<string, Account>,
  resolvers: Map<string, Resolver>,
  resolveEvents: Map<string, ResolverEvent>,
  addrChangedEvents: Map<string, AddrChanged>,
): Promise<void> {
  const { a, node, address, hash, blockNumber, logIndex } = data;
  const account = new Account({
    id: a,
  });

  const domain = domains.get(node);

  const resolverId = createResolverID(node, address);
  if (domain && domain.resolver?.id == resolverId) {
    domain.resolvedAddress = account;
    domains.set(domain.id, domain);
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
  const resolveEvent = new ResolverEvent({
    ...dataEvent,
    addrChanged: addrChangedEvent,
  });

  accounts.set(account.id, account);
  resolvers.set(resolver.id, resolver);

  resolveEvents.set(resolveEvent.id, resolveEvent);
  addrChangedEvents.set(addrChangedEvent.id, addrChangedEvent);
}

export async function handleMulticoinAddrChanged(
  data: ResolverInterface.IMulticoinAddrChanged,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  changeAddressEvents: Map<string, MulticoinAddrChanged>,
): Promise<void> {
  const { node, coinType, newAddress, address, blockNumber, logIndex, hash } =
    data;
  const resolver = getOrCreateResolver(resolvers, domains, node, address);

  if (!resolver.coinTypes) {
    resolver.coinTypes = [coinType];
  } else {
    const coinTypes = resolver.coinTypes;
    if (!coinTypes.includes(coinType)) {
      coinTypes.push(coinType);
      resolver.coinTypes = coinTypes;
    }
  }

  resolvers.set(resolver.id, resolver);

  const eventId = createEventID(blockNumber, logIndex);
  const dataEvent = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    coinType: BigInt(coinType),
    addr: newAddress ? hexStringToUint8Array(newAddress) : new Uint8Array(),
  };
  const changeAddressEvent = new MulticoinAddrChanged(dataEvent);

  const resolverEvent = new ResolverEvent({
    ...dataEvent,
    multicoinAddrChanged: changeAddressEvent,
  });

  resolverEvents.set(resolverEvent.id, resolverEvent);
  changeAddressEvents.set(changeAddressEvent.id, changeAddressEvent);
}

export function handleNameChanged(
  data: ResolverInterface.INameChanged,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  nameChangedEvents: Map<string, NameChanged>,
) {
  const { address, blockNumber, logIndex, hash, node, name } = data;
  if (name.indexOf('\u0000') != -1) return;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = resolvers.get(resolverId);

  const eventData = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    name,
  };
  const nameChangedEvent = new NameChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    nameChanged: nameChangedEvent,
  });
  resolverEvents.set(resolverEvent.id, resolverEvent);
  nameChangedEvents.set(nameChangedEvent.id, nameChangedEvent);
}

export function handleABIChanged(
  data: ResolverInterface.IABIChanged,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  abiChangedEvents: Map<string, AbiChanged>,
) {
  const { blockNumber, logIndex, contentType, hash, node, address } = data;
  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = resolvers.get(resolverId);

  const dataEvent = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    contentType,
  };
  const abiChangedEvent = new AbiChanged(dataEvent);
  const resolveEvent = new ResolverEvent({
    ...dataEvent,
    abiChanged: abiChangedEvent,
  });

  resolverEvents.set(resolveEvent.id, resolveEvent);
  abiChangedEvents.set(abiChangedEvent.id, abiChangedEvent);
}

export function handlePubkeyChanged(
  data: ResolverInterface.IPubkeyChanged,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  pubKeyChangedEvents: Map<string, PubkeyChanged>,
) {
  const { address, blockNumber, logIndex, hash, node, x, y } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = resolvers.get(resolverId);

  const eventData = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    x: x ? hexStringToUint8Array(x) : new Uint8Array(),
    y: y ? hexStringToUint8Array(y) : new Uint8Array(),
  };
  const pubKeyChangedEvent = new PubkeyChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    pubkeyChanged: pubKeyChangedEvent,
  });

  resolverEvents.set(resolverEvent.id, resolverEvent);
  pubKeyChangedEvents.set(pubKeyChangedEvent.id, pubKeyChangedEvent);
}

export function handleTextChanged(
  data: ResolverInterface.ITextChanged,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  textChangedEvents: Map<string, TextChanged>,
) {
  const { address, blockNumber, logIndex, hash, node, key } = data;
  const resolver = getOrCreateResolver(resolvers, domains, node, address);

  if (resolver.texts == null) {
    resolver.texts = [key];
    resolvers.set(resolver.id, resolver);
  } else {
    const texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      resolvers.set(resolver.id, resolver);
    }
  }

  const eventId = createEventID(blockNumber, logIndex);
  const eventData = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    key,
  };
  const textChangedEvent = new TextChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    textChanged: textChangedEvent,
  });
  resolverEvents.set(resolverEvent.id, resolverEvent);
  textChangedEvents.set(textChangedEvent.id, textChangedEvent);
}

export function handleTextChangedWithValue(
  data: ResolverInterface.ITextChangedWithValue,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  textChangedEvents: Map<string, TextChanged>,
) {
  const { address, blockNumber, logIndex, hash, node, key, value } = data;
  const resolver = getOrCreateResolver(resolvers, domains, node, address);

  if (resolver.texts == null) {
    resolver.texts = [key];
    resolvers.set(resolver.id, resolver);
  } else {
    const texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      resolvers.set(resolver.id, resolver);
    }
  }

  const eventId = createEventID(blockNumber, logIndex);
  const eventData = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    key,
    value,
  };
  const textChangedEvent = new TextChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    textChanged: textChangedEvent,
  });
  resolverEvents.set(resolverEvent.id, resolverEvent);
  textChangedEvents.set(textChangedEvent.id, textChangedEvent);
}

export function handleContentHashChanged(
  event: ResolverInterface.IContenthashChanged,
  resolvers: Map<string, Resolver>,
  domains: Map<string, Domain>,
  resolverEvents: Map<string, ResolverEvent>,
  contenthashChangedEvents: Map<string, ContenthashChanged>,
) {
  const { node, contentHash, hash, blockNumber, address, logIndex } = event;

  const resolver = getOrCreateResolver(resolvers, domains, node, address);

  resolver.contentHash = hexStringToUint8Array(contentHash);
  resolvers.set(resolver.id, resolver);

  const eventData = {
    id: createEventID(blockNumber, logIndex),
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    hash: resolver.contentHash,
  };

  const contenthashChangedEvent = new ContenthashChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    contenthashChanged: contenthashChangedEvent,
  });
  resolverEvents.set(resolverEvent.id, resolverEvent);
  contenthashChangedEvents.set(
    contenthashChangedEvent.id,
    contenthashChangedEvent,
  );
}

export function handleInterfaceChanged(
  data: ResolverInterface.IInterfaceChanged,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  interfaceChangedEvents: Map<string, InterfaceChanged>,
) {
  const {
    node,
    interfaceID,
    implementer,
    hash,
    blockNumber,
    logIndex,
    address,
  } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolverId = createResolverID(node, address);
  const resolver = resolvers.get(resolverId);

  const eventData = {
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
  };
  const interfaceChangedEvent = new InterfaceChanged(eventData);
  const resolverEvent = new ResolverEvent({
    ...eventData,
    interfaceChanged: interfaceChangedEvent,
  });

  resolverEvents.set(resolverEvent.id, resolverEvent);
  interfaceChangedEvents.set(interfaceChangedEvent.id, interfaceChangedEvent);
}

export function handleAuthorisationChanged(
  data: ResolverInterface.IAuthorisationChanged,
  resolvers: Map<string, Resolver>,
  authorizationEvents: Map<string, AuthorisationChanged>,
  resolverEvents: Map<string, ResolverEvent>,
): void {
  const {
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
  const resolver = resolvers.get(resolverId);
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

  const resolverEvent = new ResolverEvent({
    ...eventData,
    authorisationChanged: authorizationEvent,
  });
  authorizationEvents.set(authorizationEvent.id, authorizationEvent);
  resolverEvents.set(resolverEvent.id, resolverEvent);
}

export async function handleVersionChanged(
  data: ResolverInterface.IVersionChanged,
  domains: Map<string, Domain>,
  resolvers: Map<string, Resolver>,
  resolverEvents: Map<string, ResolverEvent>,
  versionChangedEvents: Map<string, VersionChanged>,
): Promise<void> {
  const { blockNumber, logIndex, hash, node, address, newVersion } = data;

  const eventId = createEventID(blockNumber, logIndex);
  const resolver = getOrCreateResolver(resolvers, domains, node, address);

  const eventData = {
    id: eventId,
    resolver,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    version: newVersion,
  };
  const versionChangedEvent = new VersionChanged(eventData);

  const resolverEvent = new ResolverEvent({
    ...eventData,
    versionChanged: versionChangedEvent,
  });
  resolverEvents.set(resolverEvent.id, resolverEvent);
  versionChangedEvents.set(versionChangedEvent.id, versionChangedEvent);

  const domain = domains.get(node);
  if (domain && domain.resolver === resolverEvent.resolver) {
    domain.resolvedAddress = null;
    domains.set(domain.id, domain);
  }

  resolver.addr = null;
  resolver.contentHash = null;
  resolver.texts = null;
  resolver.coinTypes = null;
  resolvers.set(resolver.id, resolver);
}
