# ui/ — 双端共享的纯展示层

供 `src/extension/` 和 `src/promo/` 共用；未来 `remotion/` 视频项目也会 import 这里的组件。

## 纪律

1. **props-driven**：无 `chrome.*` 副作用，无 `storage` 调用，无 `fetch` 调用
2. **useState 只用于纯展示性 UI 状态**（折叠/展开、表单本地输入），数据状态全部从 props 进
3. **callback 全部可选**：不传则按钮 disabled（而不是隐藏），保持视觉一致
4. **不写 barrel `index.ts`**：强制深路径 import，让 rollup tree-shaking 可靠剔除 fixtures
5. **fixtures/ 仅 promo/ 和未来 remotion/ 可引**：extension/background/content 引就是 bug；CI 用 grep 强校验

## 编辑指引

- 改组件的 props 形状时，搜全仓 import 路径同步更新
- 新增组件先想清楚是否真的双端共用；只有 promo 用的组件应放 `src/promo/components/`
