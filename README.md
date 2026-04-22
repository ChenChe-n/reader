# MD 阅读器

基于 Vue 3 + TypeScript 的本地 Markdown/文档阅读器，保留原 `md-reader.html` 的核心体验：

- 选择本地文件夹并浏览目录。
- 预览 Markdown、HTML、JSON、纯文本、图片、音频和视频。
- 支持 Markdown/HTML 内相对资源和相对文档链接。
- 支持文本复制、当前文件下载、侧栏折叠、预览最大化和拖拽调整宽度。

## 命令

```bash
npm install
npm run dev
npm run build
```

构建产物输出到 `build/index.html`，已通过 `vite-plugin-singlefile` 内联为单文件页面。
