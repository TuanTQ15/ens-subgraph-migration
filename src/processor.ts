import { lookupArchive } from '@subsquid/archive-registry';
import {
  BlockHeader,
  DataHandlerContext,
  EvmBatchProcessor,
  EvmBatchProcessorFields,
  Log as _Log,
  Transaction as _Transaction,
} from '@subsquid/evm-processor';
import { events as EnsRegistryEvent } from './abi/Registry';
import { events as PublicResolverEvent } from './abi/PublicResolver';
import { events as BaseRegistrarEvent } from './abi/BaseRegistrar';
import { events as EthRegistrarControllerOldEvent } from './abi/EthRegistrarControllerOld';
import { events as EthRegistrarControllerEvent } from './abi/EthRegistrarController';
import { events as NameWrapperEvent } from './abi/NameWrapper';

export const ENS_REGISTRY_CONTRACT =
  '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'.toLowerCase();
export const ENS_REGISTRY_OLD_CONTRACT =
  '0x314159265dd8dbb310642f98f50c066173c1259b'.toLowerCase();
export const ENS_BASE_REGISTRAR =
  '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'.toLowerCase();
export const ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT =
  '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5'.toLowerCase();
export const ETH_REGISTRAR_CONTROLLER_CONTRACT =
  '0xCc5e7dB10E65EED1BBD105359e7268aa660f6734'.toLowerCase();
export const NAME_WRAPPER =
  '0x114D4603199df73e7D157787f8778E21fCd13066'.toLowerCase();

export const processor = new EvmBatchProcessor()
  .setDataSource({
    // Change the Archive endpoints for run the squid
    // against the other EVM networks
    // For a full list of supported networks and config options
    // see https://docs.subsquid.io/evm-indexing/
    archive: lookupArchive('eth-goerli'),

    // Must be set for RPC ingestion (https://docs.subsquid.io/evm-indexing/evm-processor/)
    // OR to enable contract state queries (https://docs.subsquid.io/evm-indexing/query-state/)
    chain: 'https://eth-goerli.g.alchemy.com/v2/demo',
  })
  .setFinalityConfirmation(75)
  .setFields({
    transaction: {
      from: true,
      value: true,
      hash: true,
    },
  })
  .setBlockRange({
    from: 2_086_621,
  })
  .addLog({
    address: [ENS_REGISTRY_CONTRACT],
    topic0: [
      EnsRegistryEvent.NewOwner.topic,
      EnsRegistryEvent.NewResolver.topic,
      EnsRegistryEvent.NewTTL.topic,
      EnsRegistryEvent.Transfer.topic,
    ],
  })
  .addLog({
    address: [ENS_REGISTRY_OLD_CONTRACT],
    topic0: [
      EnsRegistryEvent.NewOwner.topic,
      EnsRegistryEvent.NewResolver.topic,
      EnsRegistryEvent.NewTTL.topic,
      EnsRegistryEvent.Transfer.topic,
    ],
  })
  .addLog({
    topic0: [
      PublicResolverEvent.ABIChanged.topic,
      PublicResolverEvent.AddrChanged.topic,
      PublicResolverEvent.AddressChanged.topic,
      PublicResolverEvent.AuthorisationChanged.topic,
      PublicResolverEvent.ContenthashChanged.topic,
      PublicResolverEvent.InterfaceChanged.topic,
      PublicResolverEvent.NameChanged.topic,
      PublicResolverEvent.PubkeyChanged.topic,
      PublicResolverEvent['TextChanged(bytes32,string,string)'].topic,
      PublicResolverEvent['TextChanged(bytes32,string,string,string)'].topic,
      PublicResolverEvent.VersionChanged.topic,
    ],
    transaction: true,
  })
  .addLog({
    address: [ENS_BASE_REGISTRAR],
    topic0: [
      BaseRegistrarEvent.NameRegistered.topic,
      BaseRegistrarEvent.NameRenewed.topic,
      BaseRegistrarEvent.Transfer.topic,
    ],
  })
  .addLog({
    address: [ETH_REGISTRAR_CONTROLLER_OLD_CONTRACT],
    topic0: [
      EthRegistrarControllerOldEvent.NameRegistered.topic,
      EthRegistrarControllerOldEvent.NameRenewed.topic,
    ],
  })
  .addLog({
    address: [ETH_REGISTRAR_CONTROLLER_CONTRACT],
    topic0: [
      EthRegistrarControllerEvent.NameRegistered.topic,
      EthRegistrarControllerEvent.NameRenewed.topic,
    ],
  })
  .addLog({
    address: [NAME_WRAPPER],
    topic0: [
      NameWrapperEvent.NameWrapped.topic,
      NameWrapperEvent.NameUnwrapped.topic,
      NameWrapperEvent.FusesSet.topic,
      NameWrapperEvent.ExpiryExtended.topic,
      NameWrapperEvent.TransferSingle.topic,
      NameWrapperEvent.TransferBatch.topic,
    ],
  });

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;
