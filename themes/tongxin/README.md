# 一线 · 同心

红线从姓名下方出发，串起照片与对话，形成按住时局部显影的双股线、夜色中的结、日程旁的导轨和邀约圆环。

## 运行与部署

先按[仓库说明](../../README.md)安装依赖，在仓库根目录执行：

```sh
npm run build -- tongxin
cd themes/tongxin
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

打开 `http://127.0.0.1:4174/`。开发使用 `npm run dev -- --host 127.0.0.1`，地址以终端输出为准。构建包含 TypeScript 检查；静态检查使用 `npm run lint`。

独立部署上传整个 `dist/`，入口为 `/`。已有双路由站点的 `scripts/package-pages.py` 需要显式提供 `--base` 完整归档，普通构建不依赖旧 ZIP。

## 内容与结构

- [src/content.ts](src/content.ts)：婚礼事实、主要文案和照片路径。
- `index.html`：页面标题及摘要，信息修改后同步核对。
- [src/App.tsx](src/App.tsx)：开场、章节及页尾顺序。
- `src/components/`：章节、阅读箭头和触摸阅读。
- `src/line/`：形状、Verlet 模拟、Canvas 绘制及布局测量。
- `src/index.css`：字体、颜色和响应式布局。

照片在 `public/img/`，由根目录脚本准备。默认生成占位图；本地模式将完整清单文件放到根目录 `.local/photos/tongxin/`，运行 `npm run build:local -- tongxin`。本地照片开发使用 `WEDDING_ASSETS=local npm run dev`，详见仓库说明。

`public/fonts/` 保留 Cormorant、Instrument Sans、封面中文子集及授权。封面姓名使用 LXGW WenKai GB，邀请语使用 Ma Shan Zheng。修改这些文字时需更新子集并核对 `src/components/Overture.css` 的 Unicode 范围；其余中文使用系统回退字体。

## 阅读与维护

红线按真实章节和文字位置测量，逐帧模拟不依赖 React 重渲染。相引章节把牵绳限定在照片中央条带，条带外继续阅读。固定箭头每次前进约 0.88 个视口高度，到实际底部后可以回到顶部。手机单指滚动由阅读组件处理，链接和控件保留自身操作。

减少动态效果模式保留目标形状与静态清晰带，停止物理振荡和指针受力。叙事使用真实 DOM，Canvas 不承载正文；邀约没有回执表单。

修改后应复查窄屏比例、条带内外拖动、圆环与文字对齐、页底返回和减少动态效果。此主题没有独立 E2E npm 命令；生产构建不代替目标手机手势检查。
