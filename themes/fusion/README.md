# 一线 · 同心 · 融合主题

将展信与五封照片纸笺融入连续红线叙事，经过暮色与绳结、两页心意、完整圆环，走到正式邀请。设计与维护见 [DESIGN.md](DESIGN.md)。

## 运行

先按[仓库说明](../../README.md)安装依赖。在仓库根目录执行：

```sh
npm run build -- fusion
cd themes/fusion
npm run preview
```

打开 `http://127.0.0.1:4175/wedding2/`。开发使用 `npm run dev`，本地照片开发使用 `WEDDING_ASSETS=local npm run dev`，地址以终端输出为准。

## 内容与照片

`lib/wedding.ts` 保存婚礼信息、照片顺序、取景与纸笺原文；相系婚讯在 `components/red-thread/content.ts`。修改后同步检查封面、元数据、地图、正式邀请与 PNG。`components/wedding/`、`hooks/` 管理展信与阅读；`components/red-thread/` 实现章节与连线。

素材清单为根目录 [assets/photo-map.json](../../assets/photo-map.json)。默认生成占位图。本地模式把完整输入按清单路径放入根目录 `.local/photos/fusion/`，运行 `npm run build:local -- fusion`；清单包括画廊原图、封面及 WebP 文件。

主题内 `npm run prepare:photos` 先准备清单素材，再从 `assets/photo-originals/` 生成响应式 WebP 和 `assets/photo-variants.json`；构建自动执行此步骤。竖图宽度为 768、1280、1920px，横图另有 2560px；质量 86、effort 5，不放大超过输入宽度。封面 JPG 独立于画廊。照片目录和变体清单均不纳入 Git。

## 字体维护

普通构建使用已有字体。补充中文子集使用 `node scripts/subset-font.mjs`，扫描 `app/`、`components/wedding/`、`lib/`，需要网络及支持 WOFF2 的 Python FontTools；`FONT_PYTHON` 可指定解释器。红线章节额外文案、封面毛笔字范围和数字子集需单独核对。来源和授权见 [LXGW WenKai GB](assets/font-sources/lxgw-wenkai-gb/README.md) 和 [数字字体记录](assets/font-sources/wedding-numerals.json)。

## 检查与部署

```sh
npm run typecheck
npm run lint
npx playwright install chromium webkit
TEST_URL=http://127.0.0.1:4175/wedding2/ npm run test
```

测试前需另开终端运行预览。以上是复查入口，不表示本次已执行全部浏览器测试。上传完整 `dist/client/`，入口为 `/wedding2/`。可选的 `scripts/package-pages.py --base <完整双路由归档>` 更新已有归档，不负责发布。独立的 `hunbei` 主题固定了设计快照，此处变化不会自动复制过去。
