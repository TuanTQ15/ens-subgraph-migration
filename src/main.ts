import { TypeormDatabase } from '@subsquid/typeorm-store';
import {
  ENS_BASE_REGISTRAR,
  ENS_REGISTRY_CONTRACT,
  ENS_REGISTRY_OLD_CONTRACT,
  ETH_REGISTRAR_CONTROLLER_CONTRACT,
  ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT,
  processor,
} from './processor';
import { events as EnsRegistryEvent } from './abi/Registry';
import { events as PublicResolverEvent } from './abi/PublicResolver';
import { BlockHeader, Log } from '@subsquid/evm-processor';
import {
  EnsRegistryHandler,
  EthRegistrarHandler,
  NameWrapperHandler,
  ResolverHandler,
} from './handlers';
import { events as BaseRegistrarEvent } from './abi/BaseRegistrar';
import { events as EthRegistrarControllerOldEvent } from './abi/EthRegistrarControllerOld';
import { events as EthRegistrarControllerEvent } from './abi/EthRegistrarController';
import { events as NameWrapperEvent } from './abi/NameWrapper';
import {
  Account,
  DomainEvent,
  NewOwner,
  Resolver,
  Domain,
  NewResolver,
  Transfer,
  NewTTL,
  ResolverEvent,
  AddrChanged,
  MulticoinAddrChanged,
  AbiChanged,
  AuthorisationChanged,
  ContenthashChanged,
  InterfaceChanged,
  NameChanged,
  PubkeyChanged,
  TextChanged,
  VersionChanged,
  Registration,
  RegistrationEvent,
  NameRegistered,
  NameRenewed,
  NameTransferred,
  WrappedDomain,
  NameWrapped,
  FusesSet,
  WrappedTransfer,
  NameUnwrapped,
  ExpiryExtended,
} from './model';

const domainLabels = new Map<string, string>();
const domains = new Map<string, Domain>();
const accounts = new Map<string, Account>();
const resolvers = new Map<string, Resolver>();
const newOwnerEvents = new Map<string, NewOwner>();
const domainEvents = new Map<string, DomainEvent>();
const newResolverEvents = new Map<string, NewResolver>();
const transferEvents = new Map<string, Transfer>();
const newTTLEvents = new Map<string, NewTTL>();
const resolverEvents = new Map<string, ResolverEvent>();
const addrChangedEvents = new Map<string, AddrChanged>();
const changeAddressEvents = new Map<string, MulticoinAddrChanged>();
const abiChangedEvents = new Map<string, AbiChanged>();
const authorizationEvents = new Map<string, AuthorisationChanged>();
const contenthashChangedEvents = new Map<string, ContenthashChanged>();
const interfaceChangedEvents = new Map<string, InterfaceChanged>();
const nameChangedEvents = new Map<string, NameChanged>();
const pubKeyChangedEvents = new Map<string, PubkeyChanged>();
const textChangedEvents = new Map<string, TextChanged>();
const versionChangedEvents = new Map<string, VersionChanged>();
const registrations = new Map<string, Registration>();
const registrationEvents = new Map<string, RegistrationEvent>();
const nameRegisteredEvents = new Map<string, NameRegistered>();
const nameRenewedEvents = new Map<string, NameRenewed>();
const nameTransferEvents = new Map<string, NameTransferred>();
const wrappedDomains = new Map<string, WrappedDomain>();
const nameWrappedEvents = new Map<string, NameWrapped>();
const fusesSetEvents = new Map<string, FusesSet>();
const wrappedTransfers = new Map<string, WrappedTransfer>();
const nameUnwrappedEvents = new Map<string, NameUnwrapped>();
const expiryExtendedEvents = new Map<string, ExpiryExtended>();

function processDataENSRegistry(evmLog: Log, header: BlockHeader): any {
  const { hash, height, timestamp } = header;

  if (evmLog.address == ENS_REGISTRY_CONTRACT) {
    if (evmLog.topics[0] === EnsRegistryEvent.NewOwner.topic) {
      const { node, label, owner } = EnsRegistryEvent.NewOwner.decode(evmLog);
      EnsRegistryHandler.handleNewOwner(
        {
          node,
          label,
          owner,
          logIndex: evmLog.logIndex,
          blockNumber: height,
          domainLabels,
          hash,
          timestamp,
        },
        true,
        accounts,
        domains,
        newOwnerEvents,
        domainEvents,
      );
    }

    if (evmLog.topics[0] === EnsRegistryEvent.NewResolver.topic) {
      const { node, resolver } = EnsRegistryEvent.NewResolver.decode(evmLog);

      EnsRegistryHandler.handleNewResolver(
        {
          blockNumber: height,
          hash,
          logIndex: evmLog.logIndex,
          node,
          timestamp,
          resolverAddress: resolver,
        },
        domains,
        resolvers,
        newResolverEvents,
        domainEvents,
      );
    }

    if (evmLog.topics[0] === EnsRegistryEvent.Transfer.topic) {
      const { node, owner } = EnsRegistryEvent.Transfer.decode(evmLog);

      EnsRegistryHandler.handleTransfer(
        {
          owner,
          node,
          blockNumber: height,
          logIndex: evmLog.logIndex,
          hash,
          timestamp,
        },
        accounts,
        domains,
        transferEvents,
        domainEvents,
      );
    }

    if (evmLog.topics[0] === EnsRegistryEvent.NewTTL.topic) {
      const { node, ttl } = EnsRegistryEvent.NewTTL.decode(evmLog);

      EnsRegistryHandler.handleNewTTL(
        {
          node,
          ttl,
          blockNumber: height,
          logIndex: evmLog.logIndex,
          hash,
          timestamp,
        },
        domains,
        newTTLEvents,
        domainEvents,
      );
    }
  } else if (evmLog.address == ENS_REGISTRY_OLD_CONTRACT) {
    if (evmLog.topics[0] === EnsRegistryEvent.NewOwner.topic) {
      const { node, label, owner } = EnsRegistryEvent.NewOwner.decode(evmLog);
      EnsRegistryHandler.handleNewOwnerOldRegistry(
        {
          node,
          label,
          owner,
          logIndex: evmLog.logIndex,
          blockNumber: height,
          domainLabels,
          hash,
          timestamp,
        },
        accounts,
        domains,
        newOwnerEvents,
        domainEvents,
      );
    }
    if (evmLog.topics[0] === EnsRegistryEvent.NewResolver.topic) {
      // if (blockResolverErrors.includes(height)) return null;
      const { node, resolver } = EnsRegistryEvent.NewResolver.decode(evmLog);

      EnsRegistryHandler.handleNewResolverOldRegistry(
        {
          blockNumber: height,
          hash,
          logIndex: evmLog.logIndex,
          node,
          timestamp,
          resolverAddress: resolver,
        },
        domains,
        resolvers,
        newResolverEvents,
        domainEvents,
      );
    }

    if (evmLog.topics[0] === EnsRegistryEvent.Transfer.topic) {
      const { node, owner } = EnsRegistryEvent.Transfer.decode(evmLog);

      EnsRegistryHandler.handleTransferOldRegistry(
        {
          owner,
          node,
          blockNumber: height,
          logIndex: evmLog.logIndex,
          hash,
          timestamp,
        },
        accounts,
        domains,
        transferEvents,
        domainEvents,
      );
    }

    if (evmLog.topics[0] === EnsRegistryEvent.NewTTL.topic) {
      const { node, ttl } = EnsRegistryEvent.NewTTL.decode(evmLog);

      EnsRegistryHandler.handleNewTTLOldRegistry(
        {
          node,
          ttl,
          blockNumber: height,
          logIndex: evmLog.logIndex,
          hash,
          timestamp,
        },
        domains,
        newTTLEvents,
        domainEvents,
      );
    }
  }
}

function processResolver(evmLog: Log, header: BlockHeader) {
  const { hash, height } = header;
  if (evmLog.topics[0] === PublicResolverEvent.AddrChanged.topic) {
    const { node, a } = PublicResolverEvent.AddrChanged.decode(evmLog);
    ResolverHandler.handleAddrChanged(
      {
        node,
        a,
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      accounts,
      resolvers,
      resolverEvents,
      addrChangedEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.ABIChanged.topic) {
    const { node, contentType } = PublicResolverEvent.ABIChanged.decode(evmLog);

    ResolverHandler.handleABIChanged(
      {
        node,
        contentType,
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      resolvers,
      resolverEvents,
      abiChangedEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.AddressChanged.topic) {
    const { node, coinType, newAddress } =
      PublicResolverEvent.AddressChanged.decode(evmLog);

    ResolverHandler.handleMulticoinAddrChanged(
      {
        blockNumber: height,
        hash,
        address: evmLog.address,
        logIndex: evmLog.logIndex,
        node,
        coinType: coinType.toString(),
        newAddress,
      },
      domains,
      resolvers,
      resolverEvents,
      changeAddressEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.AuthorisationChanged.topic) {
    const { node, owner, target, isAuthorised } =
      PublicResolverEvent.AuthorisationChanged.decode(evmLog);
    ResolverHandler.handleAuthorisationChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        node,
        owner,
        target,
        isAuthorised,
      },
      resolvers,
      authorizationEvents,
      resolverEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.ContenthashChanged.topic) {
    const { node, hash: contentHash } =
      PublicResolverEvent.ContenthashChanged.decode(evmLog);
    ResolverHandler.handleContentHashChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        contentHash,
        node,
      },
      resolvers,
      domains,
      resolverEvents,
      contenthashChangedEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.InterfaceChanged.topic) {
    const { node, implementer, interfaceID } =
      PublicResolverEvent.InterfaceChanged.decode(evmLog);
    ResolverHandler.handleInterfaceChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        node,
        implementer,
        interfaceID,
      },
      resolvers,
      resolverEvents,
      interfaceChangedEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.NameChanged.topic) {
    const { node, name } = PublicResolverEvent.NameChanged.decode(evmLog);

    ResolverHandler.handleNameChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        node,
        name,
      },
      resolvers,
      resolverEvents,
      nameChangedEvents,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.PubkeyChanged.topic) {
    const { node, x, y } = PublicResolverEvent.PubkeyChanged.decode(evmLog);
    ResolverHandler.handlePubkeyChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        node,
        x,
        y,
      },
      resolvers,
      resolverEvents,
      pubKeyChangedEvents,
    );
  }

  // // got RangeError: data out-of-bounds (buffer=0x, length=0, offset=32, code=BUFFER_OVERRUN, version=6.7.0)
  // if (
  //   evmLog.topics[0] ===
  //   PublicResolverEvent['TextChanged(bytes32,string,string)'].topic
  // ) {
  //   if (blockRangeOutOf.includes(height)) return;
  //   const { node, key } =
  //     PublicResolverEvent['TextChanged(bytes32,string,string)'].decode(evmLog);
  //   ResolverHandler.handleTextChanged(
  //     {
  //       address: evmLog.address,
  //       blockNumber: height,
  //       logIndex: evmLog.logIndex,
  //       hash,
  //       node,
  //       key,
  //     },
  //     domains,
  //     resolvers,
  //     resolverEvents,
  //     textChangedEvents,
  //   );
  // }

  // //got RangeError: data out-of-bounds (buffer=0x, length=0, offset=32, code=BUFFER_OVERRUN, version=6.7.0)
  // if (
  //   evmLog.topics[0] ===
  //   PublicResolverEvent['TextChanged(bytes32,string,string,string)'].topic
  // ) {
  //   if (blockRangeOutOf.includes(height)) return;
  //   const { node, key, value } =
  //     PublicResolverEvent['TextChanged(bytes32,string,string,string)'].decode(
  //       evmLog,
  //     );
  //   ResolverHandler.handleTextChangedWithValue(
  //     {
  //       address: evmLog.address,
  //       blockNumber: height,
  //       logIndex: evmLog.logIndex,
  //       hash,
  //       node,
  //       key,
  //       value,
  //     },
  //     domains,
  //     resolvers,
  //     resolverEvents,
  //     textChangedEvents,
  //   );
  // }

  if (evmLog.topics[0] === PublicResolverEvent.VersionChanged.topic) {
    const { node, newVersion } =
      PublicResolverEvent.VersionChanged.decode(evmLog);
    ResolverHandler.handleVersionChanged(
      {
        address: evmLog.address,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        node,
        newVersion,
      },
      domains,
      resolvers,
      resolverEvents,
      versionChangedEvents,
    );
  }
}

function processDataRegistrar(evmLog: Log, header: BlockHeader) {
  const { hash, height, timestamp } = header;

  if (
    evmLog.topics[0] === BaseRegistrarEvent.NameRegistered.topic &&
    evmLog.address == ENS_BASE_REGISTRAR
  ) {
    const { id, owner, expires } =
      BaseRegistrarEvent.NameRegistered.decode(evmLog);
    EthRegistrarHandler.handleNameRegistered(
      {
        id,
        owner,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        timestamp: BigInt(timestamp),
      },
      domainLabels,
      accounts,
      domains,
      registrations,
      registrationEvents,
      nameRegisteredEvents,
    );
  }

  if (
    evmLog.topics[0] === BaseRegistrarEvent.NameRenewed.topic &&
    evmLog.address == ENS_BASE_REGISTRAR
  ) {
    const { id, expires } = BaseRegistrarEvent.NameRenewed.decode(evmLog);
    EthRegistrarHandler.handleNameRenewed(
      {
        id,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      registrations,
      registrationEvents,
      nameRenewedEvents,
    );
  }

  if (evmLog.topics[0] === BaseRegistrarEvent.Transfer.topic) {
    const { to, tokenId } = BaseRegistrarEvent.Transfer.decode(evmLog);
    EthRegistrarHandler.handleNameTransferred(
      {
        to,
        tokenId,
        blockNumber: height,
        hash,
        logIndex: evmLog.logIndex,
      },
      accounts,
      domains,
      registrations,
      registrationEvents,
      nameTransferEvents,
    );
  }

  if (
    evmLog.address == ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT &&
    evmLog.topics[0] === EthRegistrarControllerOldEvent.NameRegistered.topic
  ) {
    const { name, label, owner, cost, expires } =
      EthRegistrarControllerOldEvent.NameRegistered.decode(evmLog);
    EthRegistrarHandler.handleNameRegisteredByControllerOld(
      {
        owner,
        name,
        label,
        cost,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      registrations,
    );
  }

  if (
    (evmLog.address == ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT ||
      evmLog.address == ETH_REGISTRAR_CONTROLLER_CONTRACT) &&
    evmLog.topics[0] === EthRegistrarControllerOldEvent.NameRenewed.topic
  ) {
    const { name, label, cost, expires } =
      EthRegistrarControllerOldEvent.NameRenewed.decode(evmLog);

    EthRegistrarHandler.handleNameRenewedByController(
      {
        name,
        label,
        cost,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      registrations,
    );
  }

  if (
    evmLog.address == ETH_REGISTRAR_CONTROLLER_CONTRACT &&
    evmLog.topics[0] === EthRegistrarControllerEvent.NameRegistered.topic
  ) {
    const { name, label, owner, baseCost, premium, expires } =
      EthRegistrarControllerEvent.NameRegistered.decode(evmLog);

    EthRegistrarHandler.handleNameRegisteredByController(
      {
        name,
        label,
        owner,
        baseCost,
        premium,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      registrations,
    );
  }
}

function processDataNameWrapper(evmLog: Log, header: BlockHeader) {
  const { hash, height } = header;

  if (evmLog.topics[0] === NameWrapperEvent.NameWrapped.topic) {
    const { node, name, owner, fuses, expiry } =
      NameWrapperEvent.NameWrapped.decode(evmLog);

    NameWrapperHandler.handleNameWrapped(
      {
        node,
        name,
        owner,
        fuses,
        expiry,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      accounts,
      wrappedDomains,
      nameWrappedEvents,
    );
  }

  if (evmLog.topics[0] === NameWrapperEvent.NameUnwrapped.topic) {
    const { node, owner } = NameWrapperEvent.NameUnwrapped.decode(evmLog);

    NameWrapperHandler.handleNameUnwrapped(
      {
        node,
        owner,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      accounts,
      wrappedDomains,
      nameUnwrappedEvents,
    );
  }

  if (evmLog.topics[0] === NameWrapperEvent.FusesSet.topic) {
    const { node, fuses } = NameWrapperEvent.FusesSet.decode(evmLog);

    NameWrapperHandler.handleFusesSet(
      {
        node,
        fuses,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      wrappedDomains,
      fusesSetEvents,
    );
  }

  if (evmLog.topics[0] === NameWrapperEvent.ExpiryExtended.topic) {
    const { node, expiry } = NameWrapperEvent.ExpiryExtended.decode(evmLog);

    NameWrapperHandler.handleExpiryExtended(
      {
        node,
        expiry,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      domains,
      wrappedDomains,
      expiryExtendedEvents,
    );
  }

  if (evmLog.topics[0] === NameWrapperEvent.TransferSingle.topic) {
    const { to, id } = NameWrapperEvent.TransferSingle.decode(evmLog);

    NameWrapperHandler.handleTransferSingle(
      {
        to,
        id,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      accounts,
      domains,
      wrappedDomains,
      wrappedTransfers,
    );
  }

  if (evmLog.topics[0] === NameWrapperEvent.TransferBatch.topic) {
    const { to, ids } = NameWrapperEvent.TransferBatch.decode(evmLog);

    NameWrapperHandler.handleTransferBatch(
      {
        to,
        ids,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
      },
      accounts,
      domains,
      wrappedDomains,
      wrappedTransfers,
    );
  }
}

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  for (const block of ctx.blocks) {
    const { header, logs } = block;
    console.log(header.height);
    for (const log of logs) {
      processDataENSRegistry(log, header);
      processResolver(log, header);
      processDataRegistrar(log, header);
      processDataNameWrapper(log, header);
    }
  }

  await ctx.store.upsert([...accounts.values()]);
  await ctx.store.upsert([...domains.values()]);
  await ctx.store.upsert([...registrations.values()]);
  await ctx.store.upsert([...resolvers.values()]);

  await ctx.store.upsert([...newOwnerEvents.values()]);
  await ctx.store.upsert([...newResolverEvents.values()]);
  await ctx.store.upsert([...transferEvents.values()]);
  await ctx.store.upsert([...newTTLEvents.values()]);
  await ctx.store.upsert([...domainEvents.values()]);

  await ctx.store.upsert([...addrChangedEvents.values()]);
  await ctx.store.upsert([...changeAddressEvents.values()]);
  await ctx.store.upsert([...abiChangedEvents.values()]);
  await ctx.store.upsert([...authorizationEvents.values()]);
  await ctx.store.upsert([...contenthashChangedEvents.values()]);
  await ctx.store.upsert([...interfaceChangedEvents.values()]);
  await ctx.store.upsert([...nameChangedEvents.values()]);
  await ctx.store.upsert([...pubKeyChangedEvents.values()]);
  await ctx.store.upsert([...textChangedEvents.values()]);
  await ctx.store.upsert([...versionChangedEvents.values()]);
  await ctx.store.upsert([...resolverEvents.values()]);

  await ctx.store.upsert([...nameRegisteredEvents.values()]);
  await ctx.store.upsert([...nameRenewedEvents.values()]);
  await ctx.store.upsert([...nameTransferEvents.values()]);
  await ctx.store.upsert([...wrappedDomains.values()]);
  await ctx.store.upsert([...nameWrappedEvents.values()]);
  await ctx.store.upsert([...fusesSetEvents.values()]);
  await ctx.store.upsert([...wrappedTransfers.values()]);
  await ctx.store.upsert([...nameUnwrappedEvents.values()]);
  await ctx.store.upsert([...expiryExtendedEvents.values()]);

  await ctx.store.upsert([...registrationEvents.values()]);
});
