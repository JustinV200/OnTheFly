/* Decodes unsigned LEB128 varints (7 bits per byte, high bit set when more bytes follow) into a Uint32Array.
   Matches encode_varints in frontend/scripts/flybrain-data/connectome_encoding.py. */

/** Decode exactly expectedCount values; throws when the bytes hold fewer or more than that. */
export function decodeVarints(bytes: Uint8Array, expectedCount: number): Uint32Array {
  const values = new Uint32Array(expectedCount);
  let valueIndex = 0;
  let current = 0;
  let shift = 0;

  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    const byte = bytes[byteIndex];
    // Multiplication rather than << keeps values above 2^31 positive; every stored value fits in 32 bits.
    current += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      if (valueIndex >= expectedCount) {
        throw new Error('The brain data file is damaged: a section holds more values than its header says.');
      }
      values[valueIndex] = current;
      valueIndex += 1;
      current = 0;
      shift = 0;
    } else {
      shift += 7;
    }
  }
  if (valueIndex !== expectedCount || shift !== 0) {
    throw new Error('The brain data file is damaged: a section holds fewer values than its header says.');
  }
  return values;
}
