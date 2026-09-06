# 婚礼电子请柬 · Wedding Invitations

四种可直接浏览的婚礼电子请柬主题，供网页制作、网站制作和婚礼邀请设计参考。四个主题独立维护文案和部署；公开源码保留婚礼信息、交互、字体及授权和纸纹，照片由通用 SVG 占位图生成，也可以在本机换入私人素材。

**[打开在线样例馆 · View live demos](https://shinewinew.github.io/wedding-invitations/)** — 无需安装，点击下方预览即可体验对应主题。

| 一纸余生 · Yusheng | 一线同心 · Tongxin |
| :---: | :---: |
| [<img src="https://shinewinew.github.io/wedding-invitations/previews/yusheng.webp" alt="一纸余生婚礼电子请柬手机预览" width="240">](https://shinewinew.github.io/wedding-invitations/yusheng/) | [<img src="https://shinewinew.github.io/wedding-invitations/previews/tongxin.webp" alt="一线同心婚礼电子请柬手机预览" width="240">](https://shinewinew.github.io/wedding-invitations/tongxin/) |
| **融合 · Fusion** | **婚贝静态长页 · Hunbei** |
| [<img src="https://shinewinew.github.io/wedding-invitations/previews/fusion.webp" alt="融合婚礼电子请柬手机预览" width="240">](https://shinewinew.github.io/wedding-invitations/fusion/) | [<img src="https://shinewinew.github.io/wedding-invitations/previews/hunbei.webp" alt="婚贝静态长页婚礼电子请柬手机预览" width="240">](https://shinewinew.github.io/wedding-invitations/hunbei/) |

预览图来自占位图演示页面，由 GitHub Actions 生成并随站点发布；不包含本地私人照片，也不把截图文件提交到源码仓库。

## 主题与本地入口

| 主题 | 阅读方式 | 静态部署根目录 | 预览入口 |
| --- | --- | --- | --- |
| [yusheng · 一纸余生](themes/yusheng/README.md) | 展信封面、四张照片与纸笺 | `themes/yusheng/dist/client/` | `http://127.0.0.1:4173/wedding/` |
| [tongxin · 一线同心](themes/tongxin/README.md) | 红线叙事、牵绳与婚礼日程 | `themes/tongxin/dist/` | `http://127.0.0.1:4174/` |
| [fusion · 融合](themes/fusion/README.md) | 展信、五张照片纸笺与连续红线 | `themes/fusion/dist/client/` | `http://127.0.0.1:4175/wedding2/` |
| [hunbei · 婚贝静态长页](themes/hunbei/README.md) | 固定手机排版，可捕获并切成图片 | `themes/hunbei/dist/` | `http://127.0.0.1:4176/` |

主题在 `themes/` 下平级，各有依赖锁文件。部分内部路由和素材目录仍叫 `wedding`、`wedding2`，用于保持资源引用兼容，不表示主题版本。

## 安装与构建

需要 Node.js 22.13.0 或更新版本及 npm。在仓库根目录执行：

```sh
npm ci
npm run setup
npm run build
```

根目录依赖提供图片生成工具；`setup` 在四个主题中分别执行 `npm ci`；`build` 依次构建全部主题。也可选择主题：

```sh
npm run setup -- fusion
npm run build -- fusion
```

根目录 `npm run build` 强制使用占位图，即使外部设置了 `WEDDING_ASSETS=local`。构建会重新生成清单指定的照片目录。进入主题目录运行 `npm run dev` 可开发；`predev` 先准备照片，默认也是占位图。生产预览命令见各主题说明。

## 样例馆构建与浏览器检查

完成上面的依赖安装后，在仓库根目录执行：

```sh
npm run build:demo
(cd themes/fusion && npx playwright install chromium)
npm run test:demo
npm run preview:demo
```

打开 `http://127.0.0.1:4188/wedding-invitations/`。`build:demo` 强制重新构建四个占位图主题，再将路由适配到样例馆的四个子目录，产物集中在 `site/`；主题各自的 `dist/` 仍使用上表中的本地路由和部署结构。即使之前执行了真实照片构建，样例馆也只使用占位图。

`test:demo` 使用 `fusion` 依赖中的 Playwright 和已安装的 Chromium，自行启动临时预览服务，以 390 × 844 手机视口检查四个页面的加载、图片解码和浏览器错误，并检查 `yusheng`、`fusion` 的展信、继续阅读及邀请图片交互。它生成 `site/previews/<theme>.webp` 和结果文件 `site/demo-checks.json`。目前四个占位图演示均通过这些本地检查。`site/` 整体不纳入 Git。

## 本地照片

[assets/photo-map.json](assets/photo-map.json) 列出各主题所需文件的相对路径及占位尺寸。公开仓库中的照片源只有 [通用 SVG](assets/placeholders/photo.svg)，生成照片及真实原片均不纳入 Git。字体、授权和 SVG 纸纹单独保留。

将所选主题清单中的每个文件按原相对路径放入 `.local/photos/<theme>/`，例如：

```text
.local/photos/yusheng/public/images/together-1280.webp
.local/photos/fusion/assets/photo-originals/5A8A5952.jpg
.local/photos/hunbei/public/wedding2/images/5A8A5952.jpg
```

本地模式要求该主题的完整清单，缺文件会报告路径。照片准备会替换清单中的整个生成目录，应把私人素材保存在 `.local/photos/`。在根目录明确选择本地构建：

```sh
npm run build:local -- fusion
npm run build:local
```

第二条构建全部主题，要求四份素材齐全。开发时，在主题目录运行 `WEDDING_ASSETS=local npm run dev`。`build:local` 的产物包含本地照片；回到根目录运行 `npm run build` 可恢复公开占位图产物。`fusion` 还会从画廊输入重新生成响应式 WebP。

## 部署与公开检查

样例馆由 [GitHub Pages 工作流](.github/workflows/pages.yml) 在推送到 `main` 后自动构建、检查并部署，也支持手动触发。工作流运行公开源码检查、`build:demo` 和 `test:demo`，全部通过后发布 `site/`，包括在线样例馆、四个主题和 README 预览图。部署状态以仓库 Actions 中的实际运行结果为准。

每个主题独立部署，上传表中的整个部署根目录并保留控制文件。`yusheng` 入口是 `/wedding/`，`fusion` 入口是 `/wedding2/`，这两者根路径没有请柬首页。另两个主题从 `/` 开始。普通静态构建不需要旧站点 ZIP。

部分主题保留 `scripts/package-pages.py`，用于更新已有 `/wedding/`、`/wedding2/` 双路由归档。它要求显式提供 `--base` 完整基线，不负责发布，也不用于合并四个主题。

准备提交公开源码时，在根目录执行：

```sh
git add .
npm run check:public
```

检查器读取 Git 暂存区将提交的文件和字节，检查照片、归档、生成目录、个人请柬链接、绝对用户目录路径及已知敏感文本模式。它不会扫描整台电脑。`.local/`、依赖、构建产物、导出图片和验证证据均已忽略。

各主题说明提供独立开发、预览及进一步复查的入口。上述浏览器检查针对占位图样例馆；本地照片构建和各主题单独部署仍按各自说明操作。仓库不自动上传婚贝。

旧工作区资料完整归档保存在本机 `.local/legacy-workspaces/`，除可重装的 `node_modules` 外，包含旧源码、真实照片、发布包、婚贝导出图及验证记录。这些归档不进入 Git，保留私人素材时也应保留 `.local/`。
