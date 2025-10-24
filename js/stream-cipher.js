import { CryptoUtils } from "./utils.js";

export class StreamCipher {
  constructor() {
    this.name = "Потоковый шифр (XOR)";
  }

  // Xorshift128+ PRNG - собственная реализация
  xorshift128(seed) {
    let x = seed[0];
    let y = seed[1];

    x ^= x << 23;
    x ^= x >> 17;
    x ^= y ^ (y >> 26);

    y = x;
    x = (x + y) | 0;

    return [x, y];
  }

  generateKeystream(length, key, iv) {
    const keystream = new Uint8Array(length);

    // Инициализация состояния из ключа и IV
    let state = new Uint32Array(4);
    for (let i = 0; i < Math.min(key.length, 8); i++) {
      state[Math.floor(i / 2)] ^= key[i] << ((i % 2) * 8);
    }
    for (let i = 0; i < Math.min(iv.length, 8); i++) {
      state[2 + Math.floor(i / 2)] ^= iv[i] << ((i % 2) * 8);
    }

    let position = 0;
    while (position < length) {
      // Генерация 4 байт за итерацию
      const [x, y] = this.xorshift128([state[0], state[1]]);
      state[0] = x;
      state[1] = y;

      // Извлекаем байты из сгенерированных чисел
      const bytes = new Uint8Array(4);
      bytes[0] = (x >>> 24) & 0xff;
      bytes[1] = (x >>> 16) & 0xff;
      bytes[2] = (x >>> 8) & 0xff;
      bytes[3] = x & 0xff;

      for (let i = 0; i < 4 && position < length; i++) {
        keystream[position++] = bytes[i];
      }
    }

    return keystream;
  }

  async encrypt(imageData, keyStr, iv) {
    const key = CryptoUtils.stringToKey(keyStr);
    const bytes = new Uint8Array(imageData.data.buffer);
    const keystream = this.generateKeystream(bytes.length, key, iv);

    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= keystream[i];
    }

    return imageData;
  }

  async decrypt(imageData, keyStr, iv) {
    // XOR обратим - используем ту же функцию
    return this.encrypt(imageData, keyStr, iv);
  }

  getMeta() {
    return {
      algo: "stream",
      iv: CryptoUtils.generateIV(),
      timestamp: Date.now(),
    };
  }
}
