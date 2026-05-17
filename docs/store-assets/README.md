# Store assets

Chrome Web Store 用的截图(1280×800)。

## 文件命名约定

- `promo-XXX.html` — 源文件,文案 + 样式都在里面
- `screenshot-XXX.png` — 渲染产物(由 `render.sh` 生成)

## 改文案 → 出图

```bash
# 1. 编辑你想改的 HTML(文案集中在文件上半段:headline / lead / feature-cards)
$EDITOR docs/store-assets/promo-history-insights.html

# 2. 渲染并自动压缩
cd docs/store-assets
./render.sh promo-history-insights.html
# ✓ screenshot-history-insights.png  (~200K, 1280×800)
```

`render.sh` 做的事:
1. 用无头 Chrome 以 1280×800 渲染 HTML
2. 直接输出到同名 `screenshot-*.png`
3. PIL 量化压缩到 256 色(可见质量无损,文件降到 ~200K-400K)

## 在哪里改文案

每个 `promo-*.html` 的结构都一样:

| 区域 | HTML 选择器 | 改什么 |
| --- | --- | --- |
| 顶部品牌行右侧小标 | `.top-badge` | 比如「本地隐私 · 自带 LLM Key」 |
| 大标题 | `.headline h1` | 三行主语,用 `<em>` 包高亮词 |
| 副标题一句 | `.headline p.lead` | 一句话说明 |
| 三张特性卡 | `.feature-cards .fcard` | 每张:`.title`(短)+ `.desc`(一两句) |
| 左/右 popup 里的演示数据 | `.popup.left` / `.popup.right` | 标题、UP 名、标签、AI 总结等 |

## 排版小提醒

- 中文文案使用**全角标点**(`,。?;()「」`)
- 数字、Latin 词与中文之间用半角空格
- 标签里的分类斜线保留半角(如 `Rust / 系统编程`)
- 列举用顿号(`、`)而不是斜线
