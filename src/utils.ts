import { Account, Domain } from './model';

export function createEventID(blockNumber: number, logIndex: number): string {
  return blockNumber.toString().concat('-').concat(logIndex.toString());
}

export function int32ToBigInt(int32Value: number) {
  if (typeof int32Value !== 'number' || int32Value % 1 !== 0) {
    throw new Error('Input must be a valid 32-bit integer');
  }

  return BigInt(int32Value);
}

export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i];
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j];
  }
  // return out as ByteArray
  return out;
}

export function concatUint8Arrays(arr1: Uint8Array, arr2: Uint8Array) {
  const concatenatedArray = new Uint8Array(arr1.length + arr2.length);
  concatenatedArray.set(arr1, 0); // Copy the elements from arr1 to the beginning of concatenatedArray
  concatenatedArray.set(arr2, arr1.length); // Copy the elements from arr2 after arr1 in concatenatedArray
  return concatenatedArray;
}

export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  const hexArray = Array.from(uint8Array, (byte) => {
    return byte.toString(16).padStart(2, '0');
  });
  return '0x' + hexArray.join('');
}

export function hexStringToUint8Array(hexString: string) {
  // Remove the '0x' prefix if present
  hexString = hexString.replace(/^0x/i, '');

  // Create a new Uint8Array with half the length of the hex string
  const uint8Array = new Uint8Array(hexString.length / 2);

  // Iterate over the hex string, converting each pair of characters to a byte
  for (let i = 0; i < hexString.length; i += 2) {
    uint8Array[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }

  return uint8Array;
}

export function byteArrayFromHex(s: string) {
  if (s.length % 2 !== 0) {
    throw new TypeError('Hex string must have an even number of characters');
  }
  let out = new Uint8Array(s.length / 2);
  for (var i = 0; i < s.length; i += 2) {
    out[i / 2] = parseInt(s.substring(i, i + 2), 16);
  }
  return out;
}

export function uint256ToUint8Array(bigintValue: bigint) {
  if (bigintValue < 0n) {
    throw new Error('BigInt value must be non-negative.');
  }

  let hexString = bigintValue.toString(16);
  const byteLength = Math.ceil(hexString.length / 2);

  const uint8Array = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i++) {
    const byte = parseInt(hexString.slice(-2), 16);
    uint8Array[byteLength - 1 - i] = byte;
    hexString = hexString.slice(0, -2);
  }

  return uint8Array;
}

export function checkValidLabel(name: string): boolean {
  for (let i = 0; i < name.length; i++) {
    let c = name.charCodeAt(i);
    if (c === 0) {
      console.warn("Invalid label '{}' contained null byte. Skipping.", [name]);
      return false;
    } else if (c === 46) {
      console.warn(
        "Invalid label '{}' contained separator char '.'. Skipping.",
        [name],
      );
      return false;
    }
  }

  return true;
}

export async function createOrLoadAccount(
  ctx: any,
  address: string,
): Promise<Account> {
  const account = await ctx.store.findOneBy(Account, { id: address });
  if (!account) {
    const newAccount = new Account({ id: address });
    await ctx.store.save(newAccount);
    return newAccount;
  }

  return account;
}

export async function createOrLoadDomain(
  ctx: any,
  node: string,
): Promise<Domain> {
  const domain = await ctx.store.findOneBy(Domain, { id: node });
  if (!domain) {
    const newDomain = new Domain({ id: node });
    await ctx.store.save(newDomain);
  }

  return domain;
}
