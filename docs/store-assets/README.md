# Store assets

Chrome Web Store 用的截图（1280×800）。

## 文件命名约定

- `src/promo/scenes/XXX.tsx` — 源 scene（React 组件）
- `screenshot-XXX.png` — 渲染产物（由 `render.sh` 生成）

## 改一张图 → 出图

1. **改 scene**：编辑 `src/promo/scenes/<name>.tsx`
2. **改数据**（可选）：`src/ui/fixtures/actions.ts`、`src/ui/fixtures/stats.ts` 等
3. **实时调样式**：在仓库根跑 `pnpm dev:promo`，浏览器打开 `http://localhost:5173/?scene=<name>`，devtools device toolbar 把视口缩到 1280×800
4. **出图**：
   ```bash
   cd docs/store-assets
   ./render.sh <name>
   # ✓ screenshot-<name>.png  (~200K, 1280×800)
   ```

`render.sh` 做的事：
1. 跑 `pnpm build:promo` 出 `dist-promo/`
2. 用无头 Chrome 以 1280×800 渲染 `?scene=<name>`
3. PIL 量化压缩到 256 色

## 加新 scene

1. 在 `src/promo/scenes/` 新建 `<name>.tsx`，import `ui/` 真实组件 + fixtures
2. 在 `src/promo/main.tsx` 的 `SCENES` 字典里注册
3. 跑 `pnpm dev:promo?scene=<name>` 视觉调
4. 出图同上

### 现有 scene 列表

| scene id | 源文件 | 截图 | 主题 |
|---|---|---|---|
| `history-insights` | `scenes/history-insights.tsx` | `screenshot-history-insights.png` | 观看历史留痕与完播统计 |
| `filter-recommendations` | `scenes/filter-recommendations.tsx` | `screenshot-filter-recommendations.png` | 屏蔽不想看的推荐内容（兴趣画像驱动） |
| `popular-coverage` | `scenes/popular-coverage.tsx` | `screenshot-popular-coverage.png` | 覆盖热门页：过滤与不感兴趣/不看TA 作用于 /v/popular/all |

## 规则

- 中文文案使用**全角标点**（`，。？；（）「」`）
- 数字、Latin 词与中文之间用半角空格
- popup 里展示的功能必须**真实存在**——promo 直接渲染 `src/ui/` 的扩展组件，凭空捏造的功能会立刻被发现
