const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

const indexPath = path.join(root, "index.html");
const sdkPath = path.join(root, "assets", "vendor", "paddleocr-offline.bundle.mjs");
const wasmPath = path.join(root, "assets", "vendor", "ort-wasm-simd-threaded.jsep.wasm");
const tinyDetPath = path.join(root, "assets", "models", "PP-OCRv6_tiny_det_onnx_infer.tar");
const tinyRecPath = path.join(root, "assets", "models", "PP-OCRv6_tiny_rec_onnx_infer.tar");
const smallDetPath = path.join(root, "assets", "models", "PP-OCRv6_small_det_onnx_infer.tar");
const smallRecPath = path.join(root, "assets", "models", "PP-OCRv6_small_rec_onnx_infer.tar");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const modelArg = rawArgs.find((arg) => arg.startsWith("--model="))?.split("=")[1];
const finalBuild = args.has("--final") || args.has("--all");
const selectedModel = finalBuild ? "all" : modelArg || (args.has("--small") ? "small" : "tiny");
const outName = selectedModel === "all"
  ? "paddleocr-v6-offline-final.html"
  : `paddleocr-v6-offline-${selectedModel}.html`;
const outPath = path.join(distDir, outName);

if (!["tiny", "small", "all"].includes(selectedModel)) {
  throw new Error(`Unsupported model "${selectedModel}". Use --model=tiny, --model=small, or --final.`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readBase64(filePath) {
  return fs.readFileSync(filePath).toString("base64");
}

function makeBrowserSdkModule(source) {
  const globalSetter = [
    "",
    "globalThis.PaddleOCR = PaddleOCR;",
    "globalThis.PaddleOCRHelpers = { normalizeOcrPipelineConfig, parseOcrPipelineConfigText };",
    ""
  ].join("\n");

  if (!source.includes("export {\n  PaddleOCR,")) {
    throw new Error("Cannot find PaddleOCR export block in SDK bundle.");
  }

  return source.replace(/\nexport\s*\{\s*PaddleOCR,\s*normalizeOcrPipelineConfig,\s*parseOcrPipelineConfigText\s*\};/, `${globalSetter}$&`);
}

function injectBeforeAppModule(html, scripts) {
  const marker = '  <script type="module">\n    const EMBEDDED = globalThis.__PADDLEOCR_OFFLINE_EMBEDDED__';
  if (!html.includes(marker)) {
    throw new Error("Cannot find app module marker in index.html.");
  }
  return html.replace(marker, `${scripts}\n${marker}`);
}

function main() {
  fs.mkdirSync(distDir, { recursive: true });

  const embeddedConfig = {
    singleFile: true,
    ortWasmBase64: readBase64(wasmPath),
    models: {}
  };

  if (selectedModel === "tiny" || selectedModel === "all") {
    embeddedConfig.models["tiny:det"] = readBase64(tinyDetPath);
    embeddedConfig.models["tiny:rec"] = readBase64(tinyRecPath);
  }

  if (selectedModel === "small" || selectedModel === "all") {
    embeddedConfig.models["small:det"] = readBase64(smallDetPath);
    embeddedConfig.models["small:rec"] = readBase64(smallRecPath);
  }

  const sdkModule = makeBrowserSdkModule(readText(sdkPath));
  const scripts = [
    "  <script>",
    `    globalThis.__PADDLEOCR_OFFLINE_EMBEDDED__ = ${JSON.stringify(embeddedConfig)};`,
    "  </script>",
    "  <script type=\"module\">",
    sdkModule,
    "  </script>"
  ].join("\n");

  const html = injectBeforeAppModule(readText(indexPath), scripts);
  fs.writeFileSync(outPath, html, "utf8");

  const sizeMb = fs.statSync(outPath).size / 1024 / 1024;
  console.log(`Built ${path.relative(root, outPath)} (${sizeMb.toFixed(1)} MB)`);
}

main();
