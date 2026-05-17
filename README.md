# 我的 Bilibili 推荐 · My Bilibili Rcmd

> 用 LLM 看你的 B 站观看行为，生成你的兴趣画像，自动过滤推荐流里你不想看的视频。

![画像 tab 截图](docs/screenshots/profile.png)

## 它能做什么

- 🤖 用 LLM（OpenRouter / 智谱 GLM / DeepSeek 任选）看你最近 50 条观看行为，自动生成兴趣画像
- 🎯 根据画像自动过滤推荐流里的不感兴趣内容
- ✋ 卡片 hover 出 "不感兴趣 / 不看 TA" 快捷按钮
- 🔑 手动添加关键词做硬规则屏蔽（AI 不动）
- 📊 完整的本地观看记录（含完播率统计）

![卡片按钮截图](docs/screenshots/card-buttons.png)

## 🔒 隐私

**不收集任何数据，没有服务器。**

- 观看记录、AI 画像、关键词、设置全部只存在你的 Chrome 本地存储
- AI 分析时，用你自己的 API Key 把最近 50 条行为摘要发给你选定的 LLM 提供商
- 卸载扩展即彻底删除所有数据

## 安装

### 从源码安装（暂未上架商店）

```bash
git clone https://github.com/aisensiy/my-bilibili-rcmd.git
cd my-bilibili-rcmd
npm install
npm run build
```

然后：
1. 打开 chrome://extensions
2. 右上角开"开发者模式"
3. "加载已解压的扩展程序" → 选 `dist/` 目录

## 配置

挑一家 LLM 提供商，拿 API Key：

- [OpenRouter](https://openrouter.ai/keys) — 国外，模型最全（GPT / Claude / Gemini 都有）
- [智谱 GLM](https://open.bigmodel.cn/usercenter/apikeys) — 国内，低延迟
- [DeepSeek](https://platform.deepseek.com/api_keys) — 国内，便宜

把 Key 填进 onboarding 或设置 tab，然后正常用 B 站。**看够 5 个视频**，AI 就会生成你的画像。

> 三家都是按量计费，每次分析消耗约 1-2k tokens（人民币几分钱）。

## 路线图

- **v1（当前）**：根据画像反推荐——过滤掉不想看的
- **v2**：根据画像正推荐——主动推荐可能想看的

## 其他特性

- **原生反馈桥**：扩展上的"不感兴趣 / 不看 TA"会同时帮你触发 B 站原生的"..."反馈菜单，让 B 站算法也收到信号
- **调试模式**（设置里）：被过滤的卡片不隐藏，标记显示命中原因，方便调试规则
- **画像可编辑**：AI 生成的标签都能手动改/删，画像 tab 的 "interests" 用于帮你判断 AI 理解是否准确

## 开发

```bash
npm install
npm run dev   # Vite dev mode（自动重载 dist/）
npm run build # 一次性构建
```

技术栈：Vite + CRXJS + React 18 + Tailwind CSS v3 + TypeScript。

## License

MIT
