import { NameWrapperInterface } from '../interfaces';
import {
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

export async function handleNameWrapped(
  data: NameWrapperInterface.INameWrapped,
): Promise<void> {
  const {
    name: inputName,
    node,
    expiry,
    fuses,
    blockNumber,
    hash,
    owner,
    ctx,
    logIndex,
  } = data;
  let decoded = decodeName(inputName);
  let label: string | null = null;
  let name: string | null = null;
  if (decoded !== null) {
    label = decoded[0];
    name = decoded[1];
  }
  let account = await createOrLoadAccount(ctx, owner);
  let domain = await createOrLoadDomain(ctx, node);

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
  await ctx.store.save(domain);

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

  await ctx.store.save(wrappedDomain);
  await ctx.store.save(nameWrappedEvent);
}

export async function handleNameUnwrapped(
  data: NameWrapperInterface.INameUnwrapped,
): Promise<void> {
  const { node, owner, blockNumber, hash, logIndex, ctx } = data;

  const account = await createOrLoadAccount(ctx, owner);

  const domain = await createOrLoadDomain(ctx, node);

  domain.wrappedOwner = null;
  if (domain.expiryDate && domain.parent && domain.parent.id !== ETH_NODE) {
    domain.expiryDate = null;
  }
  await ctx.store.save(domain);

  const eventId = createEventID(blockNumber, logIndex);

  let nameUnwrappedEvent = new NameUnwrapped({
    id: eventId,
    domain,
    unwrappedOwner: account,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
  });

  await ctx.store.save(nameUnwrappedEvent);
  await ctx.store.remove(WrappedDomain, node);
}

export async function handleFusesSet(
  data: NameWrapperInterface.IFusesSet,
): Promise<void> {
  const { ctx, node, fuses, blockNumber, logIndex, hash } = data;

  const wrappedDomain = await ctx.store.findOneBy(WrappedDomain, { id: node });
  const domain = await createOrLoadDomain(ctx, node);
  if (wrappedDomain) {
    wrappedDomain.fuses = fuses;
    await ctx.store.save(wrappedDomain);
    if (wrappedDomain.expiryDate && checkPccBurned(wrappedDomain.fuses)) {
      if (!domain.expiryDate || wrappedDomain.expiryDate > domain.expiryDate!) {
        domain.expiryDate = wrappedDomain.expiryDate;
        await ctx.store.save(domain);
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

  await ctx.store.save(fusesBurnedEvent);
}

export async function handleExpiryExtended(
  data: NameWrapperInterface.IExpiryExtended,
): Promise<void> {
  const { ctx, node, expiry, blockNumber, hash, logIndex } = data;
  const wrappedDomain = await ctx.store.findOneBy(WrappedDomain, { id: node });
  const domain = await createOrLoadDomain(ctx, node);
  if (wrappedDomain) {
    wrappedDomain.expiryDate = expiry;
    await ctx.store.save(wrappedDomain);

    if (checkPccBurned(wrappedDomain.fuses)) {
      if (!domain.expiryDate || expiry > domain.expiryDate!) {
        domain.expiryDate = expiry;
        await ctx.store.save(domain);
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

  await ctx.store.save(expiryExtendedEvent);
}

export async function handleTransferSingle(
  data: NameWrapperInterface.ITransferSingle,
): Promise<void> {
  const { ctx, to, id: node, blockNumber, logIndex, hash } = data;
  const _to = await createOrLoadAccount(ctx, to);
  const namehash = '0x' + node.toString().slice(2).padStart(64, '0');
  const domain = await createOrLoadDomain(ctx, namehash);

  const wrappedDomain = await ctx.store.findOneBy(WrappedDomain, {
    id: namehash,
  });

  // new registrations emit the Transfer` event before the NameWrapped event
  // so we need to create the WrappedDomain entity here
  if (!wrappedDomain) {
    const newWrappedDomain = new WrappedDomain({ id: namehash });
    newWrappedDomain.domain = domain;

    // placeholders until we get the NameWrapped event
    newWrappedDomain.expiryDate = BIG_INT_ZERO;
    newWrappedDomain.fuses = 0;
    newWrappedDomain.owner = _to;
    await ctx.store.save(newWrappedDomain);
  } else {
    wrappedDomain.owner = _to;
    await ctx.store.save(wrappedDomain);
  }

  domain.wrappedOwner = _to;
  await ctx.store.save(domain);

  const eventId = createEventID(blockNumber, logIndex);
  const wrappedTransfer = new WrappedTransfer({
    id: eventId,
    domain,
    blockNumber,
    transactionID: hexStringToUint8Array(hash),
    wrappedTransferOwner: _to,
  });
  await ctx.store.save(wrappedTransfer);
}

export async function handleTransferBatch(
  data: NameWrapperInterface.ITransferBatch,
): Promise<void> {
  const { ids, ctx, to, blockNumber, logIndex, hash } = data;

  for (let i = 0; i < ids.length; i++) {
    await handleTransferSingle({
      ctx,
      to,
      id: ids[i],
      blockNumber,
      logIndex,
      hash,
    });
  }
}
