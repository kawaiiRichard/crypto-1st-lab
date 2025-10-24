export class CryptoUtils {
  static stringToKey(str, length = 16) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    // Простой хэш для увеличения длины ключа
    let hash = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      hash[i] = data[i % data.length] ^ (i * 7);
    }

    return hash;
  }

  static generateIV(length = 16) {
    const iv = new Uint8Array(length);
    crypto.getRandomValues(iv);
    return iv;
  }

  static async hashData(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(data)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  static saveImage(canvas, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();
  }

  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  static getImageData(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  }

  static putImageData(canvas, imageData) {
    const ctx = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }

  static flipBit(key, bitIndex) {
    const newKey = new Uint8Array(key);
    const byteIndex = Math.floor(bitIndex / 8);
    const bitInByte = bitIndex % 8;
    newKey[byteIndex] ^= 1 << bitInByte;
    return newKey;
  }
}
