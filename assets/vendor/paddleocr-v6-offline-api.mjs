import { PaddleOCR } from "./paddleocr-offline.bundle.mjs";

export const OCR_V6_MODELS = {
  tiny: {
    label: "PP-OCRv6 tiny（快速）",
    detName: "PP-OCRv6_tiny_det",
    recName: "PP-OCRv6_tiny_rec",
    detUrl: new URL("../models/PP-OCRv6_tiny_det_onnx_infer.tar", import.meta.url).href,
    recUrl: new URL("../models/PP-OCRv6_tiny_rec_onnx_infer.tar", import.meta.url).href
  },
  small: {
    label: "PP-OCRv6 small（高精度/最终版）",
    detName: "PP-OCRv6_small_det",
    recName: "PP-OCRv6_small_rec",
    detUrl: new URL("../models/PP-OCRv6_small_det_onnx_infer.tar", import.meta.url).href,
    recUrl: new URL("../models/PP-OCRv6_small_rec_onnx_infer.tar", import.meta.url).href
  }
};

export async function createPaddleOCRV6(options = {}) {
  const model = resolveModel(options.model || "tiny", options);
  return await PaddleOCR.create({
    lang: options.lang || "ch",
    ocrVersion: "PP-OCRv6",
    worker: options.worker || false,
    initialize: options.initialize !== false,
    fetch: options.fetch,
    ortOptions: {
      backend: "wasm",
      simd: true,
      numThreads: 1,
      proxy: false,
      ...(options.ortOptions || {})
    },
    textDetectionModelName: model.detName,
    textRecognitionModelName: model.recName,
    textDetectionModelAsset: { url: model.detUrl },
    textRecognitionModelAsset: { url: model.recUrl }
  });
}

export async function recognizeImage(image, options = {}) {
  const ocr = await createPaddleOCRV6(options);
  try {
    const output = await ocr.predict(image, options.params || {});
    return normalizeOcrResult(output);
  } finally {
    await disposeOcr(ocr);
  }
}

export function normalizeOcrResult(output) {
  const result = Array.isArray(output) ? output[0] : output;
  const items = result?.items || [];
  return {
    text: items.map((item) => item.text).filter(Boolean).join("\n"),
    items: items.map((item, index) => ({
      index: index + 1,
      text: item.text || "",
      score: typeof item.score === "number" ? item.score : null,
      poly: item.poly || item.points || item.box || []
    })),
    raw: output
  };
}

export async function disposeOcr(ocr) {
  if (ocr?.dispose) return await ocr.dispose();
  if (ocr?.destroy) return await ocr.destroy();
}

function resolveModel(modelName, options) {
  const preset = OCR_V6_MODELS[modelName];
  if (!preset) {
    throw new Error(`Unknown PP-OCRv6 model preset: ${modelName}`);
  }
  return {
    ...preset,
    detUrl: options.detUrl || preset.detUrl,
    recUrl: options.recUrl || preset.recUrl
  };
}
