export type InflateOptions = {
  /** Maximum decompressed output bytes allowed. */
  maxOutputBytes?: number;
  /** Maximum internal decode operations before aborting. */
  maxDecodeOps?: number;
};

/**
 * Decompresses a zlib- or gzip-compressed byte array (auto-detects format).
 * @param bytes - Compressed input (zlib or gzip).
 * @param buf - Optional pre-allocated output buffer, or `null` to auto-allocate.
 * @param options - Optional safety quotas for decoding work and output size.
 * @returns Decompressed bytes.
 * @throws If format is unsupported or data is malformed.
 */
export function inflate(
  bytes: Uint8Array,
  buf: Uint8Array | null,
  options?: InflateOptions,
): Uint8Array {
  if (bytes.length < 2) {
    throw new Error(`Inflate: Input is too short (len=${bytes.length})`);
  }

  const payload =
    bytes[0] === GZIP_ID1 && bytes[1] === GZIP_ID2
      ? parseGzipPayload(bytes)
      : parseZlibPayload(bytes);

  return inflateRaw(
    byteSubarray(payload.bytes, payload.offset, payload.length),
    buf,
    options,
  );
}

/**
 * Decompresses raw DEFLATE data (no zlib/gzip header).
 * @param data - Raw DEFLATE compressed bytes.
 * @param buf - Optional pre-allocated output buffer, or `null` to auto-allocate.
 * @param options - Optional safety quotas for decoding work and output size.
 * @returns Decompressed bytes.
 * @throws If DEFLATE stream is malformed.
 */
export function inflateRaw(
  data: Uint8Array,
  buf: Uint8Array | null,
  options?: InflateOptions,
): Uint8Array {
  const state = new InflateState(data, buf, options);
  state.inflateBlocks();
  return state.finish();
}

type CompressedPayload = {
  bytes: Uint8Array;
  offset: number;
  length: number;
};

type HuffmanTable = {
  entries: Uint32Array;
  mask: number;
  maxBits: number;
};

const DEFLATE_COMPRESSION_METHOD = 8;
const GZIP_ID1 = 0x1f;
const GZIP_ID2 = 0x8b;
const GZIP_FLAG_FTEXT = 0x01;
const GZIP_FLAG_FHCRC = 0x02;
const GZIP_FLAG_FEXTRA = 0x04;
const GZIP_FLAG_FNAME = 0x08;
const GZIP_FLAG_FCOMMENT = 0x10;
const GZIP_FLAG_RESERVED = 0xe0;
const ZLIB_PRESET_DICTIONARY_FLAG = 0x20;
const DEFLATE_MAX_CODE_BITS = 15;
const DEFLATE_MAX_CODE_LENGTH_BITS = 7;
const DEFLATE_END_OF_BLOCK = 256;
const INFLATE_DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

const LENGTH_BASES = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
  83, 99, 115, 131, 163, 195, 227, 258,
];

const LENGTH_EXTRA_BITS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
  5, 5, 0,
];

const DISTANCE_BASES = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769,
  1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];

const DISTANCE_EXTRA_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
  11, 12, 12, 13, 13,
];

const CODE_LENGTH_ALPHABET_ORDER = [
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
];

const FIXED_LITERAL_LENGTH_TABLE = createFixedLiteralLengthTable();
const FIXED_DISTANCE_TABLE = createFixedDistanceTable();

class InflateState {
  private readonly bitReader: DeflateBitReader;
  private readonly maxDecodeOps: number;
  private readonly maxOutputBytes: number;
  private readonly callerProvidedOutput: boolean;
  private output: Uint8Array;
  private outputOffset = 0;
  private decodeOps = 0;

  constructor(
    compressedBytes: Uint8Array,
    outputBuffer: Uint8Array | null,
    options: InflateOptions | undefined,
  ) {
    this.bitReader = new DeflateBitReader(compressedBytes);
    this.maxDecodeOps =
      options?.maxDecodeOps ?? Math.max(1024, compressedBytes.length * 64);
    this.maxOutputBytes =
      options?.maxOutputBytes ?? INFLATE_DEFAULT_MAX_OUTPUT_BYTES;
    this.callerProvidedOutput = outputBuffer !== null;
    this.output =
      outputBuffer ??
      new Uint8Array(Math.max(1024, compressedBytes.length * 2));
  }

  inflateBlocks(): void {
    let isFinalBlock = false;

    while (!isFinalBlock) {
      this.countDecodeOp();
      isFinalBlock = this.bitReader.readBits(1) === 1;
      const blockType = this.bitReader.readBits(2);

      if (blockType === 0) {
        this.inflateStoredBlock();
      } else if (blockType === 1) {
        this.inflateCompressedBlock(
          FIXED_LITERAL_LENGTH_TABLE,
          FIXED_DISTANCE_TABLE,
        );
      } else if (blockType === 2) {
        const dynamicTables = this.readDynamicHuffmanTables();
        this.inflateCompressedBlock(
          dynamicTables.literalLengthTable,
          dynamicTables.distanceTable,
        );
      } else {
        throw new Error("InflateRaw: Reserved DEFLATE block type");
      }
    }
  }

  finish(): Uint8Array {
    return this.output.length === this.outputOffset
      ? this.output
      : this.output.slice(0, this.outputOffset);
  }

  private inflateStoredBlock(): void {
    this.bitReader.alignToByte();

    const storedLength = this.bitReader.readUint16LittleEndian();
    const storedLengthOnesComplement = this.bitReader.readUint16LittleEndian();
    if (((storedLength ^ storedLengthOnesComplement) & 0xffff) !== 0xffff) {
      throw new Error("InflateRaw: Stored block length check failed");
    }

    this.ensureOutputCapacity(this.outputOffset + storedLength);
    const storedBytes = this.bitReader.readBytes(storedLength);
    this.output.set(storedBytes, this.outputOffset);
    this.outputOffset += storedLength;
  }

  private inflateCompressedBlock(
    literalLengthTable: HuffmanTable,
    distanceTable: HuffmanTable,
  ): void {
    while (true) {
      this.countDecodeOp();

      const literalLengthSymbol = this.bitReader.readSymbol(literalLengthTable);
      if (literalLengthSymbol < 256) {
        this.writeLiteralByte(literalLengthSymbol);
        continue;
      }
      if (literalLengthSymbol === DEFLATE_END_OF_BLOCK) {
        return;
      }
      if (literalLengthSymbol > 285) {
        throw new Error("InflateRaw: Invalid literal/length symbol");
      }

      const lengthIndex = literalLengthSymbol - 257;
      const matchLength =
        getTableValue(LENGTH_BASES, lengthIndex, "length base") +
        this.bitReader.readBits(
          getTableValue(LENGTH_EXTRA_BITS, lengthIndex, "length extra bits"),
        );

      const distanceSymbol = this.bitReader.readSymbol(distanceTable);
      if (distanceSymbol >= DISTANCE_BASES.length) {
        throw new Error("InflateRaw: Invalid distance symbol");
      }

      const matchDistance =
        getTableValue(DISTANCE_BASES, distanceSymbol, "distance base") +
        this.bitReader.readBits(
          getTableValue(
            DISTANCE_EXTRA_BITS,
            distanceSymbol,
            "distance extra bits",
          ),
        );

      this.copyPreviousBytes(matchLength, matchDistance);
    }
  }

  private readDynamicHuffmanTables(): {
    literalLengthTable: HuffmanTable;
    distanceTable: HuffmanTable;
  } {
    const literalLengthCodeCount = this.bitReader.readBits(5) + 257;
    const distanceCodeCount = this.bitReader.readBits(5) + 1;
    const codeLengthCodeCount = this.bitReader.readBits(4) + 4;

    if (literalLengthCodeCount > 286 || distanceCodeCount > 30) {
      throw new Error("InflateRaw: Invalid dynamic Huffman table size");
    }

    const codeLengthCodeLengths = new Uint8Array(19);
    for (let i = 0; i < codeLengthCodeCount; i++) {
      codeLengthCodeLengths[CODE_LENGTH_ALPHABET_ORDER[i]!] =
        this.bitReader.readBits(3);
    }

    const codeLengthTable = buildHuffmanTable(
      codeLengthCodeLengths,
      DEFLATE_MAX_CODE_LENGTH_BITS,
      "code length",
    );
    const combinedCodeLengths = this.readDynamicCodeLengths(
      codeLengthTable,
      literalLengthCodeCount + distanceCodeCount,
    );

    const literalLengthCodeLengths = combinedCodeLengths.slice(
      0,
      literalLengthCodeCount,
    );
    const distanceCodeLengths = combinedCodeLengths.slice(
      literalLengthCodeCount,
    );

    if (literalLengthCodeLengths[DEFLATE_END_OF_BLOCK] === 0) {
      throw new Error("InflateRaw: Dynamic table missing end-of-block code");
    }

    return {
      literalLengthTable: buildHuffmanTable(
        literalLengthCodeLengths,
        DEFLATE_MAX_CODE_BITS,
        "literal/length",
      ),
      distanceTable: buildHuffmanTable(
        distanceCodeLengths,
        DEFLATE_MAX_CODE_BITS,
        "distance",
      ),
    };
  }

  private readDynamicCodeLengths(
    codeLengthTable: HuffmanTable,
    expectedCodeLengthCount: number,
  ): Uint8Array {
    const codeLengths = new Uint8Array(expectedCodeLengthCount);
    let codeLengthOffset = 0;

    while (codeLengthOffset < expectedCodeLengthCount) {
      this.countDecodeOp();

      const codeLengthSymbol = this.bitReader.readSymbol(codeLengthTable);
      if (codeLengthSymbol <= 15) {
        codeLengths[codeLengthOffset] = codeLengthSymbol;
        codeLengthOffset++;
      } else if (codeLengthSymbol === 16) {
        if (codeLengthOffset === 0) {
          throw new Error(
            "InflateRaw: Repeat code length has no previous code",
          );
        }
        const repeatCount = this.bitReader.readBits(2) + 3;
        const previousCodeLength = codeLengths[codeLengthOffset - 1]!;
        codeLengthOffset = fillRepeatedCodeLength(
          codeLengths,
          codeLengthOffset,
          repeatCount,
          previousCodeLength,
        );
      } else if (codeLengthSymbol === 17) {
        const repeatCount = this.bitReader.readBits(3) + 3;
        codeLengthOffset = fillRepeatedCodeLength(
          codeLengths,
          codeLengthOffset,
          repeatCount,
          0,
        );
      } else if (codeLengthSymbol === 18) {
        const repeatCount = this.bitReader.readBits(7) + 11;
        codeLengthOffset = fillRepeatedCodeLength(
          codeLengths,
          codeLengthOffset,
          repeatCount,
          0,
        );
      } else {
        throw new Error("InflateRaw: Invalid code length symbol");
      }
    }

    return codeLengths;
  }

  private writeLiteralByte(literalByte: number): void {
    this.ensureOutputCapacity(this.outputOffset + 1);
    this.output[this.outputOffset] = literalByte;
    this.outputOffset++;
  }

  private copyPreviousBytes(matchLength: number, matchDistance: number): void {
    if (matchDistance <= 0 || matchDistance > this.outputOffset) {
      throw new Error("InflateRaw: Invalid match distance");
    }

    const copyEndOffset = this.outputOffset + matchLength;
    this.ensureOutputCapacity(copyEndOffset);
    while (this.outputOffset < copyEndOffset) {
      this.output[this.outputOffset] =
        this.output[this.outputOffset - matchDistance]!;
      this.outputOffset++;
    }
  }

  private ensureOutputCapacity(requiredLength: number): void {
    if (requiredLength > this.maxOutputBytes) {
      throw new Error(
        `InflateRaw: Output exceeds maxOutputBytes (${this.maxOutputBytes})`,
      );
    }
    if (requiredLength <= this.output.length) {
      return;
    }
    if (this.callerProvidedOutput) {
      throw new Error("InflateRaw: Output buffer is too small");
    }

    let nextLength = this.output.length;
    while (nextLength < requiredLength) {
      nextLength = Math.max(nextLength * 2, 1024);
    }
    const grownOutput = new Uint8Array(nextLength);
    grownOutput.set(this.output, 0);
    this.output = grownOutput;
  }

  private countDecodeOp(): void {
    this.decodeOps++;
    if (this.decodeOps > this.maxDecodeOps) {
      throw new Error("InflateRaw: Too many decode operations");
    }
  }
}

class DeflateBitReader {
  private readonly bytes: Uint8Array;
  private bitBuffer = 0;
  private bitCount = 0;
  private byteOffset = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  readBits(bitLength: number): number {
    if (bitLength === 0) {
      return 0;
    }
    if (bitLength < 0 || bitLength > 16) {
      throw new Error(`InflateRaw: Invalid bit read length (${bitLength})`);
    }
    this.ensureBits(bitLength, false);
    const value = this.bitBuffer & ((1 << bitLength) - 1);
    this.dropBits(bitLength);
    return value;
  }

  readSymbol(table: HuffmanTable): number {
    this.ensureBits(table.maxBits, true);
    const entry = table.entries[this.bitBuffer & table.mask]!;
    if (entry === 0) {
      throw new Error("InflateRaw: Invalid Huffman code");
    }

    const bitLength = entry & 0x1f;
    const symbol = entry >>> 5;
    if (this.remainingBits() < bitLength) {
      throw new Error("InflateRaw: Truncated Huffman code");
    }
    this.dropBits(bitLength);
    return symbol;
  }

  alignToByte(): void {
    const unalignedBitCount = this.bitCount & 7;
    if (unalignedBitCount !== 0) {
      this.dropBits(unalignedBitCount);
    }
  }

  readUint16LittleEndian(): number {
    const low = this.readByte();
    const high = this.readByte();
    return low | (high << 8);
  }

  readBytes(byteLength: number): Uint8Array {
    if (this.bitCount !== 0) {
      throw new Error("InflateRaw: Byte read while bit buffer is not aligned");
    }
    if (this.byteOffset + byteLength > this.bytes.length) {
      throw new Error("InflateRaw: Truncated stored block");
    }
    const startOffset = this.byteOffset;
    this.byteOffset += byteLength;
    return this.bytes.subarray(startOffset, startOffset + byteLength);
  }

  private readByte(): number {
    if (this.bitCount !== 0) {
      throw new Error("InflateRaw: Byte read while bit buffer is not aligned");
    }
    if (this.byteOffset >= this.bytes.length) {
      throw new Error("InflateRaw: Unexpected end of input");
    }
    const value = this.bytes[this.byteOffset]!;
    this.byteOffset++;
    return value;
  }

  private ensureBits(requiredBitCount: number, allowEndPadding: boolean): void {
    while (this.bitCount < requiredBitCount) {
      if (this.byteOffset >= this.bytes.length) {
        if (allowEndPadding) {
          this.bitCount = requiredBitCount;
          return;
        }
        throw new Error("InflateRaw: Unexpected end of input");
      }

      this.bitBuffer |= this.bytes[this.byteOffset]! << this.bitCount;
      this.byteOffset++;
      this.bitCount += 8;
    }
  }

  private dropBits(bitLength: number): void {
    this.bitBuffer >>>= bitLength;
    this.bitCount -= bitLength;
  }

  private remainingBits(): number {
    return this.bitCount + (this.bytes.length - this.byteOffset) * 8;
  }
}

function parseZlibPayload(bytes: Uint8Array): CompressedPayload {
  if (bytes.length < 6) {
    throw new Error("Inflate: Truncated zlib payload");
  }

  const compressionMethodAndFlags = bytes[0]!;
  const compressionFlags = bytes[1]!;
  const compressionMethod = compressionMethodAndFlags & 0x0f;
  const compressionInfo = compressionMethodAndFlags >>> 4;
  const headerCheck = (compressionMethodAndFlags << 8) + compressionFlags;

  if (compressionMethod !== DEFLATE_COMPRESSION_METHOD) {
    throw new Error("Inflate: Unsupported zlib compression method");
  }
  if (compressionInfo > 7) {
    throw new Error("Inflate: Invalid zlib window size");
  }
  if (headerCheck % 31 !== 0) {
    throw new Error("Inflate: Invalid zlib header check");
  }
  if ((compressionFlags & ZLIB_PRESET_DICTIONARY_FLAG) !== 0) {
    throw new Error("Inflate: Preset zlib dictionaries are not supported");
  }

  return {
    bytes,
    offset: 2,
    length: bytes.length - 6,
  };
}

function parseGzipPayload(bytes: Uint8Array): CompressedPayload {
  if (bytes.length < 10) {
    throw new Error("Inflate: Truncated gzip header");
  }
  if (bytes[2] !== DEFLATE_COMPRESSION_METHOD) {
    throw new Error("Inflate: Unsupported gzip compression method");
  }

  const flags = bytes[3]!;
  if ((flags & GZIP_FLAG_RESERVED) !== 0) {
    throw new Error("Inflate: Invalid gzip flags");
  }

  let payloadOffset = 10;
  if ((flags & GZIP_FLAG_FEXTRA) !== 0) {
    payloadOffset = skipGzipExtraField(bytes, payloadOffset);
  }
  if ((flags & GZIP_FLAG_FNAME) !== 0) {
    payloadOffset = skipZeroTerminatedGzipField(
      bytes,
      payloadOffset,
      "filename",
    );
  }
  if ((flags & GZIP_FLAG_FCOMMENT) !== 0) {
    payloadOffset = skipZeroTerminatedGzipField(
      bytes,
      payloadOffset,
      "comment",
    );
  }
  if ((flags & GZIP_FLAG_FHCRC) !== 0) {
    payloadOffset = checkedAdd(payloadOffset, 2, bytes.length, "gzip header");
  }
  if ((flags & GZIP_FLAG_FTEXT) !== 0) {
    // FTEXT is advisory only. The payload is still DEFLATE-compressed bytes.
  }
  if (payloadOffset + 8 > bytes.length) {
    throw new Error("Inflate: Truncated gzip payload");
  }

  return {
    bytes,
    offset: payloadOffset,
    length: bytes.length - payloadOffset - 8,
  };
}

function skipGzipExtraField(bytes: Uint8Array, offset: number): number {
  if (offset + 2 > bytes.length) {
    throw new Error("Inflate: Truncated gzip extra field");
  }
  const extraLength = bytes[offset]! | (bytes[offset + 1]! << 8);
  return checkedAdd(offset + 2, extraLength, bytes.length, "gzip extra field");
}

function skipZeroTerminatedGzipField(
  bytes: Uint8Array,
  offset: number,
  fieldName: "filename" | "comment",
): number {
  while (offset < bytes.length) {
    if (bytes[offset] === 0) {
      return offset + 1;
    }
    offset++;
  }
  throw new Error(`Inflate: Unterminated gzip ${fieldName}`);
}

function checkedAdd(
  offset: number,
  length: number,
  limit: number,
  label: string,
): number {
  const endOffset = offset + length;
  if (endOffset > limit) {
    throw new Error(`Inflate: Truncated ${label}`);
  }
  return endOffset;
}

function byteSubarray(
  bytes: Uint8Array,
  offset: number,
  length: number,
): Uint8Array {
  return new Uint8Array(bytes.buffer, bytes.byteOffset + offset, length);
}

function buildHuffmanTable(
  codeLengths: Uint8Array,
  maximumAllowedBits: number,
  tableName: string,
): HuffmanTable {
  const bitLengthCounts = new Uint16Array(maximumAllowedBits + 1);
  let maximumUsedBits = 0;
  let usedSymbolCount = 0;

  for (const codeLength of codeLengths) {
    if (codeLength > maximumAllowedBits) {
      throw new Error(`InflateRaw: Invalid ${tableName} code length`);
    }
    if (codeLength !== 0) {
      bitLengthCounts[codeLength] = (bitLengthCounts[codeLength] ?? 0) + 1;
      maximumUsedBits = Math.max(maximumUsedBits, codeLength);
      usedSymbolCount++;
    }
  }

  if (usedSymbolCount === 0) {
    throw new Error(`InflateRaw: Empty ${tableName} Huffman table`);
  }

  let remainingCodeSpace = 1;
  for (let bitLength = 1; bitLength <= maximumAllowedBits; bitLength++) {
    remainingCodeSpace <<= 1;
    remainingCodeSpace -= bitLengthCounts[bitLength]!;
    if (remainingCodeSpace < 0) {
      throw new Error(`InflateRaw: Oversubscribed ${tableName} Huffman table`);
    }
  }

  const tableSize = 1 << maximumUsedBits;
  const entries = new Uint32Array(tableSize);
  const nextCodeByBitLength = new Uint16Array(maximumAllowedBits + 1);
  let nextCode = 0;

  for (let bitLength = 1; bitLength <= maximumAllowedBits; bitLength++) {
    nextCode = (nextCode + bitLengthCounts[bitLength - 1]!) << 1;
    nextCodeByBitLength[bitLength] = nextCode;
  }

  for (let symbol = 0; symbol < codeLengths.length; symbol++) {
    const bitLength = codeLengths[symbol]!;
    if (bitLength === 0) {
      continue;
    }

    const canonicalCode = nextCodeByBitLength[bitLength]!;
    nextCodeByBitLength[bitLength] = canonicalCode + 1;

    const reversedCode = reverseLeastSignificantBits(canonicalCode, bitLength);
    const tableStep = 1 << bitLength;
    const entry = (symbol << 5) | bitLength;
    for (
      let tableIndex = reversedCode;
      tableIndex < tableSize;
      tableIndex += tableStep
    ) {
      entries[tableIndex] = entry;
    }
  }

  return {
    entries,
    mask: tableSize - 1,
    maxBits: maximumUsedBits,
  };
}

function fillRepeatedCodeLength(
  codeLengths: Uint8Array,
  offset: number,
  repeatCount: number,
  codeLength: number,
): number {
  const endOffset = offset + repeatCount;
  if (endOffset > codeLengths.length) {
    throw new Error("InflateRaw: Code length repeat exceeds table size");
  }
  codeLengths.fill(codeLength, offset, endOffset);
  return endOffset;
}

function createFixedLiteralLengthTable(): HuffmanTable {
  const codeLengths = new Uint8Array(288);
  codeLengths.fill(8, 0, 144);
  codeLengths.fill(9, 144, 256);
  codeLengths.fill(7, 256, 280);
  codeLengths.fill(8, 280, 288);
  return buildHuffmanTable(
    codeLengths,
    DEFLATE_MAX_CODE_BITS,
    "fixed literal/length",
  );
}

function createFixedDistanceTable(): HuffmanTable {
  const codeLengths = new Uint8Array(32);
  codeLengths.fill(5);
  return buildHuffmanTable(
    codeLengths,
    DEFLATE_MAX_CODE_BITS,
    "fixed distance",
  );
}

function reverseLeastSignificantBits(value: number, bitLength: number): number {
  let reversedValue = 0;
  for (let i = 0; i < bitLength; i++) {
    reversedValue = (reversedValue << 1) | (value & 1);
    value >>>= 1;
  }
  return reversedValue;
}

function getTableValue(
  table: ReadonlyArray<number>,
  index: number,
  tableName: string,
): number {
  const value = table[index];
  if (value === undefined) {
    throw new Error(`InflateRaw: Invalid ${tableName} index`);
  }
  return value;
}
