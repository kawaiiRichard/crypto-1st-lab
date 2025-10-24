import { CryptoUtils } from "./utils.js";

export class PermutationCipher {
  constructor() {
    this.name = "Перестановочный шифр";
  }

  // Fisher-Yates shuffle с использованием PRNG
  fisherYatesShuffle(array, key, iv) {
    const shuffled = [...array];
    const seed = this.generateSeed(key, iv);

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.prng(seed) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  generateSeed(key, iv) {
    let seed = 0;
    for (let i = 0; i < key.length; i++) {
      seed = (seed * 31 + key[i]) | 0;
    }
    for (let i = 0; i < iv.length; i++) {
      seed = (seed * 17 + iv[i]) | 0;
    }
    return seed;
  }

  prng(seed) {
    // Линейный конгруэнтный генератор
    seed = (seed * 1664525 + 1013904223) | 0;
    return Math.abs(seed);
  }

  // Перестановка блоков 8x8
  permuteBlocks(imageData, key, iv, iterations, encrypt = true) {
    const width = imageData.width;
    const height = imageData.height;
    const blockSize = 8;

    const blocksW = Math.floor(width / blockSize);
    const blocksH = Math.floor(height / blockSize);

    // Создаем массив индексов блоков
    let blockIndices = Array.from({ length: blocksW * blocksH }, (_, i) => i);

    // Перемешиваем индексы
    for (let iter = 0; iter < iterations; iter++) {
      blockIndices = this.fisherYatesShuffle(
        blockIndices,
        key,
        new Uint8Array([iter])
      );
    }

    if (!encrypt) {
      // Для дешифрования обращаем перестановку
      const inverseIndices = new Array(blockIndices.length);
      blockIndices.forEach((newPos, oldPos) => {
        inverseIndices[newPos] = oldPos;
      });
      blockIndices = inverseIndices;
    }

    const result = new ImageData(width, height);

    for (let by = 0; by < blocksH; by++) {
      for (let bx = 0; bx < blocksW; bx++) {
        const oldIndex = by * blocksW + bx;
        const newIndex = blockIndices[oldIndex];

        const newBx = newIndex % blocksW;
        const newBy = Math.floor(newIndex / blocksW);

        // Копируем блок
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const srcX = bx * blockSize + x;
            const srcY = by * blockSize + y;
            const destX = newBx * blockSize + x;
            const destY = newBy * blockSize + y;

            if (
              srcX < width &&
              srcY < height &&
              destX < width &&
              destY < height
            ) {
              const srcIdx = (srcY * width + srcX) * 4;
              const destIdx = (destY * width + destX) * 4;

              if (encrypt) {
                // При шифровании добавляем подстановку (XOR)
                result.data[destIdx] =
                  imageData.data[srcIdx] ^ key[srcIdx % key.length];
                result.data[destIdx + 1] =
                  imageData.data[srcIdx + 1] ^ key[(srcIdx + 1) % key.length];
                result.data[destIdx + 2] =
                  imageData.data[srcIdx + 2] ^ key[(srcIdx + 2) % key.length];
                result.data[destIdx + 3] = imageData.data[srcIdx + 3]; // Alpha не меняем
              } else {
                // При дешифровании обращаем подстановку
                result.data[destIdx] =
                  imageData.data[srcIdx] ^ key[srcIdx % key.length];
                result.data[destIdx + 1] =
                  imageData.data[srcIdx + 1] ^ key[(srcIdx + 1) % key.length];
                result.data[destIdx + 2] =
                  imageData.data[srcIdx + 2] ^ key[(srcIdx + 2) % key.length];
                result.data[destIdx + 3] = imageData.data[srcIdx + 3];
              }
            }
          }
        }
      }
    }

    return result;
  }

  async encrypt(imageData, keyStr, iv, iterations = 10) {
    const key = CryptoUtils.stringToKey(keyStr);
    return this.permuteBlocks(imageData, key, iv, iterations, true);
  }

  async decrypt(imageData, keyStr, iv, iterations = 10) {
    const key = CryptoUtils.stringToKey(keyStr);
    return this.permuteBlocks(imageData, key, iv, iterations, false);
  }

  getMeta() {
    return {
      algo: "permutation",
      iv: CryptoUtils.generateIV(),
      timestamp: Date.now(),
    };
  }
}
