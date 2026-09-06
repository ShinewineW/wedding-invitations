# 一纸 · 余生

以照片封面、四张照片纸笺和扇形心意组成的交互请柬，最后提供日期、地点与邀请图片。设计与维护见 [DESIGN.md](DESIGN.md)。

## 运行

先按[仓库说明](../../README.md)安装依赖。在仓库根目录执行：

```sh
npm run build -- yusheng
cd themes/yusheng
npm run preview
```

打开 `http://127.0.0.1:4173/wedding/`。开发使用 `npm run dev`，地址以终端输出为准。默认照片由通用占位图生成；本地照片开发使用 `WEDDING_ASSETS=local npm run dev`。私人输入放置规则和根目录 `npm run build:local -- yusheng` 见仓库说明。

## 内容与保存

`lib/wedding.ts` 保存婚礼事实、照片顺序、替代文本和信件原文。`components/wedding/` 实现封面、读信、心意、地图和保存；`hooks/` 管理开场与阅读状态；`app/` 保存页面、元数据、样式和字体。

修改姓名、日期或地点后，同步检查封面、页脚、元数据、地图搜索文字与 PNG。地图按完整店名搜索，厅号独立显示。保存按钮按需生成 1080 × 1620 PNG；支持文件分享的浏览器在图片就绪后再次点击打开系统分享，其他环境提供预览或下载。实际系统保存表现需在目标手机上检查。

## 字体维护

常规构建使用已保存的 WOFF2。来源和授权见 [LXGW WenKai GB](assets/font-sources/lxgw-wenkai-gb/README.md) 和 [数字字体记录](assets/font-sources/wedding-numerals.json)。

中文文案需要补字时运行 `node scripts/subset-font.mjs`。脚本扫描 `app/`、`components/wedding/` 和 `lib/`，需要网络及支持 WOFF2 的 Python FontTools；`FONT_PYTHON` 可指定解释器。数字子集独立维护。更新后检查“喆”“囍”、换行和 PNG。

## 检查与部署

```sh
npm run typecheck
npm run lint
npx playwright install chromium webkit
TEST_URL=http://127.0.0.1:4173/wedding/ npm run test
```

浏览器测试前需另开终端保持预览运行。报告写入忽略的 `release/validation/`；这些是复查入口，不表示本次已执行全部浏览器测试。

静态部署上传整个 `dist/client/`，入口为 `/wedding/`。可选的 `scripts/package-pages.py --base <完整双路由归档>` 仅更新已有站点归档，独立部署不需要旧 ZIP。
