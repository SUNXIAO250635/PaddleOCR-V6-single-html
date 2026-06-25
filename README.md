# PaddleOCR-V6 Single HTML Offline

这是一个基于 PaddleOCR.js + ONNX Runtime Web 的 PP-OCRv6 浏览器离线 OCR 工作台。项目提供两种交付方式：

- 本地目录版：`index.html + assets/`，通过本地 HTTP 服务运行，支持 `tiny` 和 `small` 两档模型。
- 单 HTML 版：把页面、SDK、ONNX wasm、模型全部内嵌到一个 HTML 文件中，可直接打开使用。

页面支持图片选择、拖拽上传、截图后 `Ctrl+V` 粘贴、粘贴后自动识别、Canvas 标框、文本复制、JSON 导出。

## 目录结构

```text
.
├── assets/
│   ├── models/
│   │   ├── PP-OCRv6_tiny_det_onnx_infer.tar
│   │   ├── PP-OCRv6_tiny_rec_onnx_infer.tar
│   │   ├── PP-OCRv6_small_det_onnx_infer.tar
│   │   └── PP-OCRv6_small_rec_onnx_infer.tar
│   └── vendor/
│       ├── ort-wasm-simd-threaded.jsep.wasm
│       ├── paddleocr-offline.bundle.mjs
│       └── paddleocr-v6-offline-api.mjs
├── dist/
│   ├── paddleocr-v6-offline-tiny.html
│   ├── paddleocr-v6-offline-small.html
│   └── paddleocr-v6-offline-final.html
├── tools/
│   ├── build-single-html.js
│   ├── node-empty-shim.js
│   └── serve.js
├── index.html
├── start.bat
├── package.json
└── offline-single-html-plan.md
```

## 从 0 开始运行

### 1. 安装基础工具

需要：

- Git
- Node.js 18 或更高版本
- Chrome 或 Edge

确认命令可用：

```bash
git --version
node --version
npm --version
```

### 2. 克隆项目

```bash
git clone https://github.com/SUNXIAO250635/PaddleOCR-V6-single-html.git
cd PaddleOCR-V6-single-html
```

### 3. 启动本地目录版

Windows 可以直接双击：

```text
start.bat
```

或使用命令：

```bash
npm start
```

然后打开：

```text
http://127.0.0.1:8765/
```

如果 `8765` 被占用，服务会自动尝试后续端口，并在终端输出实际地址。

### 4. 使用 OCR

1. 选择 `PP-OCRv6 tiny（快速）` 或 `PP-OCRv6 small（高精度/最终版）`。
2. 拖入图片、点击选择图片，或截图后直接按 `Ctrl+V`。
3. 默认开启“粘贴后自动识别”。
4. 识别后可复制纯文本或导出 JSON。

## 是否需要 npm install

运行现有项目和编译单 HTML 不需要 `npm install`，因为当前仓库已经包含浏览器运行所需的 SDK bundle、wasm 和模型文件。

只有当你要重新从 npm 包构建 `assets/vendor/paddleocr-offline.bundle.mjs` 时，才需要安装依赖：

```bash
npm install
```

## 编译成品

构建脚本位于：

```text
tools/build-single-html.js
```

它会读取：

- `index.html`
- `assets/vendor/paddleocr-offline.bundle.mjs`
- `assets/vendor/ort-wasm-simd-threaded.jsep.wasm`
- `assets/models/*.tar`

然后生成 `dist/*.html`。

### 编译 tiny 单模型版

tiny 版体积较小，适合快速分发：

```bash
npm run build:tiny
```

等价于：

```bash
npm run build:single
```

输出：

```text
dist/paddleocr-v6-offline-tiny.html
```

### 编译 small 单模型版

small 版识别质量更高，但体积更大：

```bash
npm run build:small
```

输出：

```text
dist/paddleocr-v6-offline-small.html
```

### 编译最终版

最终版同时内嵌 tiny 和 small，可在页面内切换：

```bash
npm run build:final
```

输出：

```text
dist/paddleocr-v6-offline-final.html
```

当前体积大约：

- tiny：约 53 MB
- small：约 85 MB
- final：约 93 MB

## 只编译单个模型

也可以直接调用脚本指定模型：

```bash
node tools/build-single-html.js --model=tiny
node tools/build-single-html.js --model=small
```

支持参数：

```text
--model=tiny   只内嵌 PP-OCRv6 tiny
--model=small  只内嵌 PP-OCRv6 small
--final        同时内嵌 tiny 和 small
--all          等价于 --final
```

## 在其他工程中调用

如果不使用完整页面，只想把 OCR 能力嵌入其他前端工程，可以使用：

```text
assets/vendor/paddleocr-v6-offline-api.mjs
```

需要一起复制：

```text
assets/vendor/paddleocr-v6-offline-api.mjs
assets/vendor/paddleocr-offline.bundle.mjs
assets/vendor/ort-wasm-simd-threaded.jsep.wasm
assets/models/PP-OCRv6_tiny_det_onnx_infer.tar
assets/models/PP-OCRv6_tiny_rec_onnx_infer.tar
assets/models/PP-OCRv6_small_det_onnx_infer.tar
assets/models/PP-OCRv6_small_rec_onnx_infer.tar
```

简单调用：

```js
import { recognizeImage } from "./assets/vendor/paddleocr-v6-offline-api.mjs";

const result = await recognizeImage(file, { model: "tiny" });
console.log(result.text);
console.log(result.items);
```

复用 OCR 引擎：

```js
import { createPaddleOCRV6, normalizeOcrResult } from "./assets/vendor/paddleocr-v6-offline-api.mjs";

const ocr = await createPaddleOCRV6({ model: "small" });
const raw = await ocr.predict(file);
const result = normalizeOcrResult(raw);

console.log(result.text);
```

注意：目录资源版建议通过 HTTP 服务访问，不建议用 `file://` 直接引用模块和模型。

## 重新构建 PaddleOCR SDK bundle

一般不需要这一步。只有更新 `@paddleocr/paddleocr-js` 或重新打包 SDK 时才需要。

安装依赖：

```bash
npm install
```

重新打包：

```bash
npx esbuild ./node_modules/@paddleocr/paddleocr-js/dist/index.mjs ^
  --bundle ^
  --format=esm ^
  --platform=browser ^
  --alias:fs=./tools/node-empty-shim.js ^
  --alias:path=./tools/node-empty-shim.js ^
  --outfile=./assets/vendor/paddleocr-offline.bundle.mjs
```

PowerShell 单行写法：

```powershell
.\node_modules\.bin\esbuild .\node_modules\@paddleocr\paddleocr-js\dist\index.mjs --bundle --format=esm --platform=browser --alias:fs=./tools/node-empty-shim.js --alias:path=./tools/node-empty-shim.js --outfile=.\assets\vendor\paddleocr-offline.bundle.mjs
```

当前 bundle 做了两个离线补丁：

- 允许单 HTML / 本地资源场景绕过官方 `file://` 限制。
- 允许通过 `ortOptions.wasmBinary` 传入内嵌 ONNX Runtime wasm。

如果重新打包 SDK，需要重新确认这两个补丁仍然存在。

## 模型说明

当前官方 PaddleOCR.js 公开的 PP-OCRv6 浏览器 ONNX 模型包括：

- `PP-OCRv6_tiny_det`
- `PP-OCRv6_tiny_rec`
- `PP-OCRv6_small_det`
- `PP-OCRv6_small_rec`

同源路径探测 `PP-OCRv6_server_det_onnx_infer.tar` 和 `PP-OCRv6_server_rec_onnx_infer.tar` 返回 404，因此本项目把 `PP-OCRv6 small` 作为浏览器端高精度/最终版模型。

## 常见问题

### 直接双击 index.html 为什么不建议

目录版需要浏览器通过 HTTP 读取 ESM、wasm 和模型 tar。直接 `file://` 打开会遇到浏览器资源加载限制。

解决方式：

```bash
npm start
```

或双击：

```text
start.bat
```

### 单 HTML 可以直接打开吗

可以。使用：

```text
dist/paddleocr-v6-offline-tiny.html
dist/paddleocr-v6-offline-small.html
dist/paddleocr-v6-offline-final.html
```

### 为什么 final 文件很大

final 同时内嵌：

- 页面代码
- PaddleOCR.js bundle
- ONNX Runtime wasm
- PP-OCRv6 tiny 检测模型
- PP-OCRv6 tiny 识别模型
- PP-OCRv6 small 检测模型
- PP-OCRv6 small 识别模型

这些二进制资源会转成 base64 放进 HTML，所以文件体积会明显增大。

## 开发检查

检查页面脚本：

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const m=html.match(/<script type=\"module\">([\\s\\S]*?)<\\/script>/); new Function(m[1]); console.log('ok')"
```

检查构建脚本：

```bash
node --check tools/build-single-html.js
node --check tools/serve.js
node --check assets/vendor/paddleocr-v6-offline-api.mjs
```
