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
import { Domain } from 'domain';
import { Account } from './model';

const blockOwnerErrors = [5648711, 7460548];

const blockResolverErrors = [
  4320255, 4332464, 4178274, 4239675, 4310110, 4320164, 3944761, 4047241,
  4106083, 4164386, 4332469, 3800374, 3924727, 3938314, 4332476, 4332480,
  4332485, 4567184, 4672102, 4672102, 4819759, 5081141, 5097049, 5286861,
  6221020, 6320912, 6320920, 6461181, 6651468, 6651507,
];
const domainLabels = new Map<string, string>();
// const domains = new Map<string, Domain>();
// const accounts = new Map<string, Account>();
// const domainLabels = new Map<string, string>();
// const domainLabels = new Map<string, string>();
// const domainLabels = new Map<string, string>();

async function processDataENSRegistry(
  ctx: any,
  evmLog: Log,
  header: BlockHeader,
): Promise<any> {
  const { hash, height, timestamp } = header;

  if (evmLog.address == ENS_REGISTRY_CONTRACT) {
    if (evmLog.topics[0] === EnsRegistryEvent.NewOwner.topic) {
      if (blockOwnerErrors.includes(height)) return null;

      const { node, label, owner } = EnsRegistryEvent.NewOwner.decode(evmLog);
      await EnsRegistryHandler.handleNewOwner(
        {
          node,
          label,
          owner,
          logIndex: evmLog.logIndex,
          blockNumber: height,
          ctx,
          domainLabels,
          hash,
          timestamp,
        },
        true,
      );
    }
    if (evmLog.topics[0] === EnsRegistryEvent.NewResolver.topic) {
      if (blockResolverErrors.includes(height)) return null;
      const { node, resolver } = EnsRegistryEvent.NewResolver.decode(evmLog);

      await EnsRegistryHandler.handleNewResolver({
        ctx,
        blockNumber: height,
        hash,
        logIndex: evmLog.logIndex,
        node,
        timestamp,
        resolverAddress: resolver,
      });
    }

    if (evmLog.topics[0] === EnsRegistryEvent.Transfer.topic) {
      const { node, owner } = EnsRegistryEvent.Transfer.decode(evmLog);

      await EnsRegistryHandler.handleTransfer({
        ctx,
        owner,
        node,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        timestamp,
      });
    }

    if (evmLog.topics[0] === EnsRegistryEvent.NewTTL.topic) {
      const { node, ttl } = EnsRegistryEvent.NewTTL.decode(evmLog);

      await EnsRegistryHandler.handleNewTTL({
        ctx,
        node,
        ttl,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        timestamp,
      });
    }
  } else if (evmLog.address == ENS_REGISTRY_OLD_CONTRACT) {
    if (evmLog.topics[0] === EnsRegistryEvent.NewOwner.topic) {
      if (blockOwnerErrors.includes(height)) return null;

      const { node, label, owner } = EnsRegistryEvent.NewOwner.decode(evmLog);
      await EnsRegistryHandler.handleNewOwnerOldRegistry({
        node,
        label,
        owner,
        logIndex: evmLog.logIndex,
        blockNumber: height,
        ctx,
        domainLabels,
        hash,
        timestamp,
      });
    }
    if (evmLog.topics[0] === EnsRegistryEvent.NewResolver.topic) {
      if (blockResolverErrors.includes(height)) return null;
      const { node, resolver } = EnsRegistryEvent.NewResolver.decode(evmLog);

      await EnsRegistryHandler.handleNewResolverOldRegistry({
        ctx,
        blockNumber: height,
        hash,
        logIndex: evmLog.logIndex,
        node,
        timestamp,
        resolverAddress: resolver,
      });
    }

    if (evmLog.topics[0] === EnsRegistryEvent.Transfer.topic) {
      const { node, owner } = EnsRegistryEvent.Transfer.decode(evmLog);

      await EnsRegistryHandler.handleTransferOldRegistry({
        ctx,
        owner,
        node,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        timestamp,
      });
    }

    if (evmLog.topics[0] === EnsRegistryEvent.NewTTL.topic) {
      const { node, ttl } = EnsRegistryEvent.NewTTL.decode(evmLog);

      await EnsRegistryHandler.handleNewTTLOldRegistry({
        ctx,
        node,
        ttl,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        timestamp,
      });
    }
  }
}

async function processResolver(ctx: any, evmLog: Log, header: BlockHeader) {
  const { hash, height, timestamp } = header;
  if (evmLog.topics[0] === PublicResolverEvent.AddrChanged.topic) {
    const { node, a } = PublicResolverEvent.AddrChanged.decode(evmLog);
    await ResolverHandler.handleAddrChanged(
      ctx,
      node,
      a,
      evmLog.address,
      height,
      evmLog.logIndex,
      hash,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.ABIChanged.topic) {
    const { node, contentType } = PublicResolverEvent.ABIChanged.decode(evmLog);

    await ResolverHandler.handleABIChanged(
      ctx,
      node,
      contentType,
      evmLog.address,
      height,
      evmLog.logIndex,
      hash,
    );
  }

  if (evmLog.topics[0] === PublicResolverEvent.AddressChanged.topic) {
    const { node, coinType, newAddress } =
      PublicResolverEvent.AddressChanged.decode(evmLog);

    await ResolverHandler.handleMulticoinAddrChanged({
      ctx,
      blockNumber: height,
      hash,
      address: evmLog.address,
      logIndex: evmLog.logIndex,
      node,
      coinType: coinType.toString(),
      newAddress,
    });
  }

  if (evmLog.topics[0] === PublicResolverEvent.AuthorisationChanged.topic) {
    const { node, owner, target, isAuthorised } =
      PublicResolverEvent.AuthorisationChanged.decode(evmLog);
    await ResolverHandler.handleAuthorisationChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      node,
      owner,
      target,
      isAuthorised,
    });
  }

  if (evmLog.topics[0] === PublicResolverEvent.ContenthashChanged.topic) {
    const { node, hash: contentHash } =
      PublicResolverEvent.ContenthashChanged.decode(evmLog);
    await ResolverHandler.handleContentHashChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      contentHash,
      node,
    });
  }

  if (evmLog.topics[0] === PublicResolverEvent.InterfaceChanged.topic) {
    const { node, implementer, interfaceID } =
      PublicResolverEvent.InterfaceChanged.decode(evmLog);
    await ResolverHandler.handleInterfaceChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      node,
      implementer,
      interfaceID,
    });
  }

  if (evmLog.topics[0] === PublicResolverEvent.NameChanged.topic) {
    const { node, name } = PublicResolverEvent.NameChanged.decode(evmLog);

    await ResolverHandler.handleNameChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      node,
      name,
    });
  }

  if (evmLog.topics[0] === PublicResolverEvent.PubkeyChanged.topic) {
    const { node, x, y } = PublicResolverEvent.PubkeyChanged.decode(evmLog);
    await ResolverHandler.handlePubkeyChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      node,
      x,
      y,
    });
  }

  //got RangeError: data out-of-bounds (buffer=0x, length=0, offset=32, code=BUFFER_OVERRUN, version=6.7.0)
  // if (
  //   evmLog.topics[0] ===
  //   PublicResolverEvent['TextChanged(bytes32,string,string)'].topic
  // ) {
  //   const { node, key } =
  //     PublicResolverEvent['TextChanged(bytes32,string,string)'].decode(evmLog);
  //   await ResolverHandler.handleTextChanged({
  //     ctx,
  //     address: evmLog.address,
  //     blockNumber: height,
  //     logIndex: evmLog.logIndex,
  //     hash,
  //     node,
  //     key,
  //   });
  // }

  //got RangeError: data out-of-bounds (buffer=0x, length=0, offset=32, code=BUFFER_OVERRUN, version=6.7.0)
  // if (
  //   evmLog.topics[0] ===
  //   PublicResolverEvent['TextChanged(bytes32,string,string,string)'].topic
  // ) {
  //   const { node, key, value } =
  //     PublicResolverEvent['TextChanged(bytes32,string,string,string)'].decode(
  //       evmLog,
  //     );
  //   await ResolverHandler.handleTextChangedWithValue({
  //     ctx,
  //     address: evmLog.address,
  //     blockNumber: height,
  //     logIndex: evmLog.logIndex,
  //     hash,
  //     node,
  //     key,
  //     value,
  //   });
  // }

  if (evmLog.topics[0] === PublicResolverEvent.VersionChanged.topic) {
    const { node, newVersion } =
      PublicResolverEvent.VersionChanged.decode(evmLog);
    await ResolverHandler.handleVersionChanged({
      ctx,
      address: evmLog.address,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      node,
      newVersion,
    });
  }
}

async function processDataRegistrar(
  ctx: any,
  evmLog: Log,
  header: BlockHeader,
) {
  const { hash, height, timestamp } = header;

  if (
    evmLog.topics[0] === BaseRegistrarEvent.NameRegistered.topic &&
    evmLog.address == ENS_BASE_REGISTRAR
  ) {
    const { id, owner, expires } =
      BaseRegistrarEvent.NameRegistered.decode(evmLog);
    await EthRegistrarHandler.handleNameRegistered(
      {
        id,
        owner,
        expires,
        blockNumber: height,
        logIndex: evmLog.logIndex,
        hash,
        ctx,
        timestamp: BigInt(timestamp),
      },
      domainLabels,
    );
  }

  if (
    evmLog.topics[0] === BaseRegistrarEvent.NameRenewed.topic &&
    evmLog.address == ENS_BASE_REGISTRAR
  ) {
    const { id, expires } = BaseRegistrarEvent.NameRenewed.decode(evmLog);
    await EthRegistrarHandler.handleNameRenewed({
      id,
      expires,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === BaseRegistrarEvent.Transfer.topic) {
    const { to, tokenId } = BaseRegistrarEvent.Transfer.decode(evmLog);
    await EthRegistrarHandler.handleNameTransferred({
      to,
      tokenId,
      blockNumber: height,
      ctx,
      hash,
      logIndex: evmLog.logIndex,
    });
  }

  if (
    evmLog.address == ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT &&
    evmLog.topics[0] === EthRegistrarControllerOldEvent.NameRegistered.topic
  ) {
    const { name, label, owner, cost, expires } =
      EthRegistrarControllerOldEvent.NameRegistered.decode(evmLog);
    await EthRegistrarHandler.handleNameRegisteredByControllerOld({
      owner,
      name,
      label,
      cost,
      expires,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (
    (evmLog.address == ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT ||
      evmLog.address == ETH_REGISTRAR_CONTROLLER_CONTRACT) &&
    evmLog.topics[0] === EthRegistrarControllerOldEvent.NameRenewed.topic
  ) {
    const { name, label, cost, expires } =
      EthRegistrarControllerOldEvent.NameRenewed.decode(evmLog);

    await EthRegistrarHandler.handleNameRenewedByController({
      name,
      label,
      cost,
      expires,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (
    evmLog.address == ETH_REGISTRAR_CONTROLLER_CONTRACT &&
    evmLog.topics[0] === EthRegistrarControllerEvent.NameRegistered.topic
  ) {
    const { name, label, owner, baseCost, premium, expires } =
      EthRegistrarControllerEvent.NameRegistered.decode(evmLog);

    await EthRegistrarHandler.handleNameRegisteredByController({
      name,
      label,
      owner,
      baseCost,
      premium,
      expires,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      ctx,
      hash,
    });
  }
}

async function processDataNameWrapper(
  ctx: any,
  evmLog: Log,
  header: BlockHeader,
) {
  const { hash, height } = header;

  if (evmLog.topics[0] === NameWrapperEvent.NameWrapped.topic) {
    const { node, name, owner, fuses, expiry } =
      NameWrapperEvent.NameWrapped.decode(evmLog);
    console.log('transfer name wrapped');
    await NameWrapperHandler.handleNameWrapped({
      node,
      name,
      owner,
      fuses,
      expiry,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === NameWrapperEvent.NameUnwrapped.topic) {
    const { node, owner } = NameWrapperEvent.NameUnwrapped.decode(evmLog);

    await NameWrapperHandler.handleNameUnwrapped({
      node,
      owner,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === NameWrapperEvent.FusesSet.topic) {
    const { node, fuses } = NameWrapperEvent.FusesSet.decode(evmLog);
    console.log('transfer fusesSet');
    await NameWrapperHandler.handleFusesSet({
      node,
      fuses,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === NameWrapperEvent.ExpiryExtended.topic) {
    const { node, expiry } = NameWrapperEvent.ExpiryExtended.decode(evmLog);
    console.log('transfer expiry extend');
    await NameWrapperHandler.handleExpiryExtended({
      node,
      expiry,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === NameWrapperEvent.TransferSingle.topic) {
    const { to, id } = NameWrapperEvent.TransferSingle.decode(evmLog);
    console.log('transfer single');
    await NameWrapperHandler.handleTransferSingle({
      to,
      id,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }

  if (evmLog.topics[0] === NameWrapperEvent.TransferBatch.topic) {
    const { to, ids } = NameWrapperEvent.TransferBatch.decode(evmLog);
    console.log('transfer batch');
    await NameWrapperHandler.handleTransferBatch({
      to,
      ids,
      blockNumber: height,
      logIndex: evmLog.logIndex,
      hash,
      ctx,
    });
  }
}

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  for (const block of ctx.blocks) {
    const { header, logs } = block;
    // console.log(header.height);
    for (const log of logs) {
      await processDataENSRegistry(ctx, log, header);
      await processResolver(ctx, log, header);
      await processDataRegistrar(ctx, log, header);
      await processDataNameWrapper(ctx, log, header);
    }
  }
});
