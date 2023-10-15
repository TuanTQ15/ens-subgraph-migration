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

export async function handleNameRegistered(
  data: EthRegistrarInterface.INameRegistered,
  domainLabels: Map<string, string>,
): Promise<void> {
  const { ctx, blockNumber, logIndex, hash, id, owner, expires, timestamp } =
    data;

  let account = new Account({
    id: owner,
  });

  await ctx.store.save(account);

  const label = uint256ToUint8Array(id);

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = await ctx.store.findOneBy(Domain, {
    id: domainId,
  });

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
  const registrationEvent = new NameRegistered({
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    registrant: account,
    expiryDate: expires,
  });

  await Promise.all([
    ctx.store.save(domain),
    ctx.store.save(registration),
    ctx.store.save(registrationEvent),
  ]);
}

async function setNamePreimage(
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
  name: string,
  label: string,
  cost: bigint,
): Promise<void> {
  if (!checkValidLabel(name)) {
    return;
  }

  const domainId = keccak256(
    concatUint8Arrays(rootNode, hexStringToUint8Array(label)),
  );

  const domain = await ctx.store.findOneBy(Domain, { id: domainId });
  if (domain && domain.labelName !== name) {
    domain.labelName = name;
    domain.name = name + '.eth';
    await ctx.store.save(domain);
  }

  const registration = await ctx.store.findOneBy(Registration, { id: label });
  if (registration == null) return;
  registration.labelName = name;
  registration.cost = cost;
  await ctx.store.save(registration);
}

export async function handleNameRegisteredByControllerOld(
  data: EthRegistrarInterface.INameRegisteredOld,
): Promise<void> {
  const { ctx, name, label, cost } = data;
  await setNamePreimage(ctx, name, label, cost);
}

export async function handleNameRegisteredByController(
  data: EthRegistrarInterface.INameRegisteredByController,
): Promise<void> {
  const { name, label, owner, baseCost, premium, expires, ctx } = data;
  const totalConst = baseCost + premium;
  await setNamePreimage(ctx, name, label, totalConst);
}

export async function handleNameRenewedByController(
  data: EthRegistrarInterface.INameRenewedByController,
): Promise<void> {
  const { ctx, name, label, cost } = data;
  await setNamePreimage(ctx, name, label, cost);
}

export async function handleNameRenewed(
  data: EthRegistrarInterface.INameRenewed,
): Promise<void> {
  const { blockNumber, ctx, expires, hash, id, logIndex } = data;
  const label = uint256ToUint8Array(id);
  const registrationId = uint8ArrayToHexString(label);
  const registration = await ctx.store.findOneBy(Registration, {
    id: registrationId,
  });

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = await ctx.store.findOneBy(Domain, { id: domainId })!;

  if (registration) registration.expiryDate = expires;
  if (domain) domain.expiryDate = expires + GRACE_PERIOD_SECONDS;

  const eventId = createEventID(blockNumber, logIndex);
  const registrationEvent = new NameRenewed({
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    expiryDate: expires,
  });

  await Promise.all([
    ctx.store.save(registrationEvent),
    domain && ctx.store.save(domain),
    registration && ctx.store.save(registration),
  ]);
}

export async function handleNameTransferred(
  data: EthRegistrarInterface.ITransfer,
): Promise<void> {
  const { to, ctx, blockNumber, hash, logIndex, tokenId } = data;
  let account = new Account({
    id: to,
  });

  // let label = uint256ToByteArray(event.params.tokenId);
  const label = uint256ToUint8Array(tokenId);

  const registration = await ctx.store.findOneBy(Registration, {
    id: uint8ArrayToHexString(label),
  });
  if (registration == null) return;

  const domainId = keccak256(concatUint8Arrays(rootNode, label));
  const domain = await ctx.store.findOneBy(Domain, { id: domainId });

  if (registration) registration.registrant = account;
  if (domain) domain.registrant = account;

  const eventId = createEventID(blockNumber, logIndex);
  const transferEvent = new NameTransferred({
    id: eventId,
    registration,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    newOwner: account,
  });

  await ctx.store.save(account);
  await ctx.store.save(transferEvent);
  if (domain) await ctx.store.save(domain);
  if (registration) await ctx.store.save(registration);
}
