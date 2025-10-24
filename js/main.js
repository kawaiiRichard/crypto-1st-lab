import { CryptoUtils } from "./utils.js";
import { CryptoMetrics } from "./metrics.js";
import { StreamCipher } from "./stream-cipher.js";
import { PermutationCipher } from "./permutation-cipher.js";

// import { StreamCipher } from "./stream-cipher";

class CryptoPicApp {
  constructor() {
    this.currentImage = null;
    this.currentImageData = null;
    this.encryptedImageData = null;
    this.currentMeta = null;

    this.streamCipher = new StreamCipher();
    this.permutationCipher = new PermutationCipher();

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.getElementById("imageInput").addEventListener("change", (e) => {
      this.loadImageFromFile(e.target.files[0]);
    });

    document.getElementById("encryptBtn").addEventListener("click", () => {
      this.encrypt();
    });

    document.getElementById("decryptBtn").addEventListener("click", () => {
      this.decrypt();
    });

    document.getElementById("analyzeBtn").addEventListener("click", () => {
      this.analyzeMetrics();
    });

    document.getElementById("sensitivityBtn").addEventListener("click", () => {
      this.testKeySensitivity();
    });
  }

  async loadImageFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.displayImage(img, "originalCanvas");
        this.currentImageData = CryptoUtils.getImageData(img);
        this.updateImageInfo("originalInfo", img);
        this.clearResults();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  displayImage(img, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  }

  displayImageData(imageData, canvasId) {
    const canvas = document.getElementById(canvasId);
    CryptoUtils.putImageData(canvas, imageData);
  }

  updateImageInfo(infoId, img) {
    const infoDiv = document.getElementById(infoId);
    infoDiv.innerHTML = `
          <p>Размер: ${img.width} × ${img.height}</p>
          <p>Формат: ${img.src.split(";")[0].split("/")[1]}</p>
      `;
  }

  clearResults() {
    this.encryptedImageData = null;
    this.currentMeta = null;

    const resultCanvas = document.getElementById("resultCanvas");
    const ctx = resultCanvas.getContext("2d");
    ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

    document.getElementById("resultInfo").innerHTML = "";
    document.getElementById("metricsResults").innerHTML = "";
  }

  async encrypt() {
    if (!this.currentImageData) {
      alert("Пожалуйста, загрузите изображение сначала");
      return;
    }

    const algorithm = document.getElementById("algorithm").value;
    const key = document.getElementById("key").value;
    const iterations = parseInt(document.getElementById("iterations").value);

    if (!key) {
      alert("Пожалуйста, введите ключ");
      return;
    }

    try {
      let result;
      let meta;

      if (algorithm === "stream") {
        meta = this.streamCipher.getMeta();
        result = await this.streamCipher.encrypt(
          new ImageData(
            new Uint8ClampedArray(this.currentImageData.data),
            this.currentImageData.width,
            this.currentImageData.height
          ),
          key,
          meta.iv
        );
      } else {
        meta = this.permutationCipher.getMeta();
        result = await this.permutationCipher.encrypt(
          new ImageData(
            new Uint8ClampedArray(this.currentImageData.data),
            this.currentImageData.width,
            this.currentImageData.height
          ),
          key,
          meta.iv,
          iterations
        );
      }

      this.encryptedImageData = result;
      this.currentMeta = meta;

      this.displayImageData(result, "resultCanvas");
      document.getElementById("resultInfo").innerHTML = `
              <p>Алгоритм: ${
                algorithm === "stream" ? "Потоковый" : "Перестановочный"
              }</p>
              <p>IV: ${Array.from(meta.iv)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
                .substring(0, 16)}...</p>
          `;

      // Сохраняем метаданные
      this.saveMeta(meta);
    } catch (error) {
      console.error("Ошибка шифрования:", error);
      alert("Ошибка при шифровании: " + error.message);
    }
  }

  async decrypt() {
    if (!this.encryptedImageData || !this.currentMeta) {
      alert("Пожалуйста, сначала зашифруйте изображение");
      return;
    }

    const algorithm = document.getElementById("algorithm").value;
    const key = document.getElementById("key").value;
    const iterations = parseInt(document.getElementById("iterations").value);

    try {
      let result;

      if (algorithm === "stream") {
        result = await this.streamCipher.decrypt(
          new ImageData(
            new Uint8ClampedArray(this.encryptedImageData.data),
            this.encryptedImageData.width,
            this.encryptedImageData.height
          ),
          key,
          this.currentMeta.iv
        );
      } else {
        result = await this.permutationCipher.decrypt(
          new ImageData(
            new Uint8ClampedArray(this.encryptedImageData.data),
            this.encryptedImageData.width,
            this.encryptedImageData.height
          ),
          key,
          this.currentMeta.iv,
          iterations
        );
      }

      this.displayImageData(result, "resultCanvas");
      document.getElementById("resultInfo").innerHTML =
        "<p>Расшифрованное изображение</p>";

      // Проверка обратимости
      this.verifyReversibility(result);
    } catch (error) {
      console.error("Ошибка дешифрования:", error);
      alert("Ошибка при дешифровании: " + error.message);
    }
  }

  async analyzeMetrics() {
    if (!this.currentImageData || !this.encryptedImageData) {
      alert("Пожалуйста, сначала зашифруйте изображение");
      return;
    }

    const originalEntropy = CryptoMetrics.calculateEntropy(
      this.currentImageData
    );
    const encryptedEntropy = CryptoMetrics.calculateEntropy(
      this.encryptedImageData
    );

    const originalCorr = CryptoMetrics.calculateCorrelation(
      this.currentImageData
    );
    const encryptedCorr = CryptoMetrics.calculateCorrelation(
      this.encryptedImageData
    );

    const { npcr, uaci } = CryptoMetrics.calculateNPCRUACI(
      this.currentImageData,
      this.encryptedImageData
    );

    // Отображаем гистограммы
    const originalHistogram = CryptoMetrics.calculateHistogram(
      this.currentImageData
    );
    const encryptedHistogram = CryptoMetrics.calculateHistogram(
      this.encryptedImageData
    );

    CryptoMetrics.drawHistogram(
      document.getElementById("originalHistogram"),
      originalHistogram.r,
      "#ff0000"
    );
    CryptoMetrics.drawHistogram(
      document.getElementById("resultHistogram"),
      encryptedHistogram.r,
      "#ff0000"
    );

    // Отображаем метрики
    const metricsDiv = document.getElementById("metricsResults");
    metricsDiv.innerHTML = `
          <div class="metric-item">
              <h4>Энтропия исходного</h4>
              <div class="metric-value">${originalEntropy.toFixed(4)} бит</div>
          </div>
          <div class="metric-item">
              <h4>Энтропия зашифрованного</h4>
              <div class="metric-value">${encryptedEntropy.toFixed(4)} бит</div>
          </div>
          <div class="metric-item">
              <h4>NPCR</h4>
              <div class="metric-value">${npcr.toFixed(2)}%</div>
          </div>
          <div class="metric-item">
              <h4>UACI</h4>
              <div class="metric-value">${uaci.toFixed(2)}%</div>
          </div>
          <div class="metric-item">
              <h4>Корреляция (H/V/D) исходного</h4>
              <div class="metric-value">${originalCorr.horizontal.toFixed(
                4
              )} / ${originalCorr.vertical.toFixed(
      4
    )} / ${originalCorr.diagonal.toFixed(4)}</div>
          </div>
          <div class="metric-item">
              <h4>Корреляция (H/V/D) зашифрованного</h4>
              <div class="metric-value">${encryptedCorr.horizontal.toFixed(
                4
              )} / ${encryptedCorr.vertical.toFixed(
      4
    )} / ${encryptedCorr.diagonal.toFixed(4)}</div>
          </div>
      `;
  }

  //Чувствительность к ключу
  async testKeySensitivity() {
    if (!this.currentImageData) {
      alert("Пожалуйста, загрузите изображение сначала");
      return;
    }

    const algorithm = document.getElementById("algorithm").value;
    const key = document.getElementById("key").value;
    const iterations = parseInt(document.getElementById("iterations").value);

    // Шифруем с оригинальным ключом
    let meta, encrypted1, encrypted2;

    if (algorithm === "stream") {
      meta = this.streamCipher.getMeta();
      encrypted1 = await this.streamCipher.encrypt(
        new ImageData(
          new Uint8ClampedArray(this.currentImageData.data),
          this.currentImageData.width,
          this.currentImageData.height
        ),
        key,
        meta.iv
      );

      // Шифруем с ключом, отличающимся на 1 бит
      const modifiedKey = key + "x"; // Изменяем ключ
      encrypted2 = await this.streamCipher.encrypt(
        new ImageData(
          new Uint8ClampedArray(this.currentImageData.data),
          this.currentImageData.width,
          this.currentImageData.height
        ),
        modifiedKey,
        meta.iv
      );
    } else {
      meta = this.permutationCipher.getMeta();
      encrypted1 = await this.permutationCipher.encrypt(
        new ImageData(
          new Uint8ClampedArray(this.currentImageData.data),
          this.currentImageData.width,
          this.currentImageData.height
        ),
        key,
        meta.iv,
        iterations
      );

      const modifiedKey = key + "x";
      encrypted2 = await this.permutationCipher.encrypt(
        new ImageData(
          new Uint8ClampedArray(this.currentImageData.data),
          this.currentImageData.width,
          this.currentImageData.height
        ),
        modifiedKey,
        meta.iv,
        iterations
      );
    }

    const { npcr, uaci } = CryptoMetrics.calculateNPCRUACI(
      encrypted1,
      encrypted2
    );

    alert(
      `Чувствительность к ключу:\nNPCR: ${npcr.toFixed(
        2
      )}%\nUACI: ${uaci.toFixed(
        2
      )}%\n\nОжидаемые значения:\nNPCR ≈ 99.6%, UACI ≈ 33.4%`
    );
  }

  verifyReversibility(decryptedImageData) {
    const original = new Uint8Array(this.currentImageData.data);
    const decrypted = new Uint8Array(decryptedImageData.data);

    let differences = 0;
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== decrypted[i]) {
        differences++;
      }
    }

    if (differences === 0) {
      alert(
        "✅ Обратимость проверена: исходное и дешифрованное изображения идентичны!"
      );
    } else {
      alert(`⚠️ Обнаружены различия: ${differences} пикселей отличаются`);
    }
  }

  saveMeta(meta) {
    const metaStr = JSON.stringify(
      {
        ...meta,
        iv: Array.from(meta.iv)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      },
      null,
      2
    );

    // В реальном приложении можно сохранить в файл
    console.log("Метаданные шифрования:", metaStr);
  }
}

// Инициализация приложения при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  new CryptoPicApp();
});
