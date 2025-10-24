export class CryptoMetrics {
  //Энтропия Шеннона
  static calculateEntropy(imageData) {
    const histogram = new Array(256).fill(0);
    const bytes = new Uint8Array(imageData.data.buffer);
    const totalBytes = bytes.length;

    // Считаем гистограмму
    for (let i = 0; i < totalBytes; i += 4) {
      // Учитываем только RGB, пропускаем Alpha
      histogram[bytes[i]]++; // R
      histogram[bytes[i + 1]]++; // G
      histogram[bytes[i + 2]]++; // B
    }

    // Вычисляем энтропию
    let entropy = 0;
    const totalPixels = (totalBytes / 4) * 3; // Только RGB компоненты

    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const probability = histogram[i] / totalPixels;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  //Корреляция соседних пикселей (горизонтальная, вертикальная, диагональная)
  static calculateCorrelation(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    let horizontalCorr = 0;
    let verticalCorr = 0;
    let diagonalCorr = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Горизонтальная корреляция
        if (x < width - 1) {
          const nextIdx = (y * width + x + 1) * 4;
          horizontalCorr += this.calculatePixelCorrelation(data, idx, nextIdx);
        }

        // Вертикальная корреляция
        if (y < height - 1) {
          const nextIdx = ((y + 1) * width + x) * 4;
          verticalCorr += this.calculatePixelCorrelation(data, idx, nextIdx);
        }

        // Диагональная корреляция
        if (x < width - 1 && y < height - 1) {
          const nextIdx = ((y + 1) * width + x + 1) * 4;
          diagonalCorr += this.calculatePixelCorrelation(data, idx, nextIdx);
        }

        count++;
      }
    }

    return {
      horizontal: horizontalCorr / count,
      vertical: verticalCorr / count,
      diagonal: diagonalCorr / count,
    };
  }

  static calculatePixelCorrelation(data, idx1, idx2) {
    const r1 = data[idx1],
      g1 = data[idx1 + 1],
      b1 = data[idx1 + 2];
    const r2 = data[idx2],
      g2 = data[idx2 + 1],
      b2 = data[idx2 + 2];

    const avg1 = (r1 + g1 + b1) / 3;
    const avg2 = (r2 + g2 + b2) / 3;

    return Math.abs(avg1 - avg2) / 255;
  }

  //NPCR (Number of Pixels Change Rate)
  //UACI (Unified Average Changing Intensity)
  static calculateNPCRUACI(enc1, enc2) {
    const data1 = new Uint8Array(enc1.data.buffer);
    const data2 = new Uint8Array(enc2.data.buffer);

    let changedPixels = 0;
    let totalDifference = 0;
    const totalPixels = data1.length / 4;

    for (let i = 0; i < data1.length; i += 4) {
      // Считаем только RGB каналы
      const r1 = data1[i],
        g1 = data1[i + 1],
        b1 = data1[i + 2];
      const r2 = data2[i],
        g2 = data2[i + 1],
        b2 = data2[i + 2];

      if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
        changedPixels++;
      }

      totalDifference +=
        Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    }

    const npcr = (changedPixels / totalPixels) * 100;
    const uaci = (totalDifference / (totalPixels * 3 * 255)) * 100;

    return { npcr, uaci };
  }

  //Гистограммы распределения цветов
  static calculateHistogram(imageData) {
    const histogram = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0),
    };

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }

    return histogram;
  }

  static drawHistogram(canvas, histogram, color) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Находим максимальное значение для масштабирования
    const max = Math.max(...histogram);

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = color;
    const barWidth = width / 256;

    for (let i = 0; i < 256; i++) {
      const barHeight = (histogram[i] / max) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  }
}
