# 一线同心 · 婚贝静态长页

将融合主题的照片、字体、信纸、文字和红线排成固定手机长页，便于捕获图片后用于婚贝。照片背面的信、心意与红线各阶段直接展开；音乐和真实地图可在目标平台另行配置。

## 运行与部署

先按[仓库说明](../../README.md)安装依赖，在仓库根目录执行：

```sh
npm run build -- hunbei
cd themes/hunbei
npm run preview
```

打开 `http://127.0.0.1:4176/`。开发使用 `npm run dev`；本地照片开发使用 `WEDDING_ASSETS=local npm run dev`。完整私人素材按清单放入根目录 `.local/photos/hunbei/`，本地构建使用根目录 `npm run build:local -- hunbei`。

部署上传整个 `dist/`，入口为 `/`。照片目录保留 `public/wedding2/images/`，这是内部资源兼容路径。

## 独立快照

[source-manifest.json](source-manifest.json) 固定 37 个本地设计文件的 SHA-256。`vendor-source/` 保存组件、样式、字体与红线引擎；`../fusion` 只记录来源，构建不读取上游目录或机器绝对路径，私人照片单独准备。

[scripts/prepare-source.mjs](scripts/prepare-source.mjs) 校验本地快照，按 375 × 812 视口展开样式，生成 `src/source-mobile.css` 和 `src/motifs.ts`，随后执行 TypeScript 检查和 Vite 构建。不一致时报告 `Snapshot drift`。更新设计需明确更新快照文件和清单哈希，再构建并检查排版；融合主题变化不会自动复制过来。

[src/main.tsx](src/main.tsx)、[src/export.css](src/export.css) 排列封面、扉页、引言、五组照片与书信、暮色、成结、心意、圆满、敬邀。[src/threads.ts](src/threads.ts) 在字体、照片和版面就绪后绘制静态红线。单段预览可使用 `?panel=tie-night`；段名由页面 `#export-manifest` 提供。

## 图片导出

构建不会捕获长图。仓库仅保留切图助手，浏览器捕获和上传需要单独完成：

1. 用 375 × 812 CSS px、2 倍像素密度打开完整页面，等待 `document.documentElement.dataset.exportReady === 'true'`。
2. 读取 `#export-manifest`，把 `width`、`panels` 和 `totalHeight` 存入 `exports/layout.json`，将 `totalHeight` 改名为 `height`。
3. 捕获各段，按页面坐标拼成 `exports/complete-mobile.png`；像素边界使用 `round(y * 2)` 与 `round((y + height) * 2)`，避免缝隙。
4. 在主题目录运行 `node scripts/assemble-exports.mjs`，生成分段 PNG/JPG、完整 JPG、联系表和 `exports/manifest.json`。

助手要求 2 倍截图，并检查高度与布局一致。`hunbeiPlacement` 提供放置尺寸与坐标；上传后需检查平台实际尺寸与顺序。`exports/` 和 `evidence/` 都是忽略的本地目录，公开仓库不带截图或旧平台证据。

`scripts/split-invitation.mjs` 要求已有 `exports/panels/13-invitation.png` 且尺寸为 750 × 2166，按固定坐标拆分末页并增加地图留白。重新排版后不能直接沿用其坐标。`scripts/verify-hunbei-assets.mjs` 需要另备下载图片和证据清单，仅比较本地文件。

脚本不上传、不保存平台编辑器状态，也不把原生地图绘入图片。平台压缩、音乐、地图和相册效果需要在实际发布流程中验证。
