# PaddleOCR-V6 离线浏览器版计划书

## 1. 目标

做一个开箱可用的 PaddleOCR-V6 浏览器 OCR 工具，优先满足：

- 离线可用，不依赖外网 CDN。
- 页面直接支持选择图片、拖拽图片、截图后 `Ctrl+V` 粘贴。
- 界面是工具型工作台，包含图片预览、识别框、结果列表、复制文本、导出 JSON。
- 交付两种形态：
  - 目录离线版：`index.html + assets/`，通过本地 HTTP 服务运行，支持 tiny/small 模型切换。
  - 单 HTML 版：`dist/paddleocr-v6-offline-tiny.html`，内嵌 SDK、tiny 模型和 ONNX wasm，可直接打开。
  - 最终单 HTML 版：`dist/paddleocr-v6-offline-final.html`，内嵌 SDK、tiny、small 和 ONNX wasm，可直接打开并切换高精度模型。

## 2. 当前交付状态

已完成：

- 页面文件：`index.html`
- 本地启动入口：`start.bat`
- 本地静态服务：`tools/serve.js`
- 单 HTML 构建脚本：`tools/build-single-html.js`
- 单 HTML 成品：`dist/paddleocr-v6-offline-tiny.html`
- 最终单 HTML 成品：`dist/paddleocr-v6-offline-final.html`
- PaddleOCR.js 本地 bundle：`assets/vendor/paddleocr-offline.bundle.mjs`
- ONNX Runtime Web wasm：`assets/vendor/ort-wasm-simd-threaded.jsep.wasm`
- PP-OCRv6 浏览器 ONNX 模型：
  - `assets/models/PP-OCRv6_tiny_det_onnx_infer.tar`
  - `assets/models/PP-OCRv6_tiny_rec_onnx_infer.tar`
  - `assets/models/PP-OCRv6_small_det_onnx_infer.tar`
  - `assets/models/PP-OCRv6_small_rec_onnx_infer.tar`

当前本地服务地址：

```text
http://127.0.0.1:8765/
```

## 3. 技术路线

浏览器端不直接运行 Python/PaddlePaddle 推理链路，采用官方 PaddleOCR.js + ONNX Runtime Web：

- PaddleOCR.js 负责 OCR 流程、前处理、后处理。
- PP-OCRv6 ONNX 模型负责检测和识别。
- ONNX Runtime Web 使用 wasm 后端执行模型。
- 页面层负责图片输入、Canvas 预览、识别结果展示和导出。

目录离线版通过本地 HTTP 服务读取 `assets/` 里的 SDK、wasm、模型文件。单 HTML 版把 tiny 模型和 wasm 以 base64 方式内嵌，运行时转成 `Uint8Array` 供 PaddleOCR.js 加载。

## 4. 关键约束

官方 PaddleOCR.js 默认要求 HTTP(S) 来源，直接用 `file://` 打开目录版会失败。因此：

- 目录离线版用 `start.bat` 启动本地服务。
- 单 HTML 版使用已补丁的本地 bundle，并内嵌资源，支持直接打开。

单 HTML 版分为两个构建目标：

- `paddleocr-v6-offline-tiny.html` 只内嵌 tiny，约 53 MB，适合快速打开和分发。
- `paddleocr-v6-offline-final.html` 内嵌 tiny + small，约 92.8 MB，适合作为完整离线最终版。
- 官方 PaddleOCR.js 当前公开的 PP-OCRv6 浏览器模型为 tiny 和 small；同路径探测 `PP-OCRv6_server_det_onnx_infer.tar` 和 `PP-OCRv6_server_rec_onnx_infer.tar` 返回 404。
- 因此当前把 `PP-OCRv6 small` 作为浏览器端“高精度/最终版”模型。

## 5. 使用方式

目录离线版：

1. 双击 `start.bat`。
2. 打开 `http://127.0.0.1:8765/`。
3. 选择 tiny 或 small。
4. 拖入图片、选择图片，或截图后直接 `Ctrl+V`。
5. 点击“识别”，复制文本或导出 JSON。

单 HTML 版：

1. 打开 `dist/paddleocr-v6-offline-tiny.html`。
2. 使用截图粘贴、拖拽或选择图片。
3. 使用内嵌 tiny 模型识别。

重新生成单 HTML：

```bash
npm run build:single
```

重新生成最终单 HTML：

```bash
npm run build:final
```

## 6. 界面与交互设计

页面采用工作台布局：

- 顶部：标题、资源模式、模型档位、预加载按钮。
- 左侧：图片输入区和 Canvas 预览区。
- 右侧：识别状态、耗时、图片尺寸、结果列表、复制和导出按钮。
- 底部：当前模型和运行状态。

截图粘贴逻辑：

- 页面监听 `paste` 事件。
- 从 `clipboardData.items` 查找 `image/*`。
- 读取为 `Blob/File` 后复用上传流程。
- 如果浏览器不允许主动读取剪贴板，仍可用系统粘贴事件或文件选择兜底。

## 7. 验收记录

已做的静态/资源检查：

- `tools/build-single-html.js` 语法检查通过。
- `tools/serve.js` 语法检查通过。
- `assets/vendor/paddleocr-offline.bundle.mjs` 语法检查通过。
- `npm run build:single` 成功生成 `dist/paddleocr-v6-offline-tiny.html`。
- `npm run build:final` 成功生成 `dist/paddleocr-v6-offline-final.html`。
- 本地 HTTP 服务首页返回 `200`。
- 本地 SDK、wasm、tiny/small 模型资源均可通过 `http://127.0.0.1:8765/` 读取。

后续建议的真实 OCR 验收：

- 用一张中文截图测试 tiny 模型识别。
- 用同一张截图切换 small 模型测试识别质量和耗时。
- 断网后重新打开本地服务验证无外网请求。
- 在 Chrome/Edge 中分别测试 `Ctrl+V` 粘贴截图。

## 8. 后续增强

可后续加入：

- 识别后自动复制纯文本开关。
- 多图批量识别。
- 结果搜索和高亮。
- 表格结构恢复。
- small 单 HTML 构建选项。
- 运行时进度拆分：加载 SDK、加载 wasm、加载检测模型、加载识别模型、推理中。
