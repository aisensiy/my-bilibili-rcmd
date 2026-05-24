# 我的 Bilibili 推荐 · My Bilibili Rcmd

一个 B 站推荐管理扩展，附带一个让 LLM 观察自身观看行为的实验。

![画像 tab 截图](docs/screenshots/profile.png)

## 这是什么

B 站推荐流的质量随使用时间下降，原生「不感兴趣」反馈的体感效果有限。这个扩展是自用的尝试，主要做两件事：

1. **规则明确的推荐管理工具**：手动关键词屏蔽、一键屏蔽 UP、卡片上的快捷操作按钮，所有动作即时生效。
2. **让 LLM 观察自身行为的实验**：累积一定量观看行为后交给 LLM 分析，生成一份"AI 看到的你"，包含若干标签和一段总结。

**需要说明：当前真正参与推荐过滤的主要是 #1 的手动信号**（点击、屏蔽、关键词）。#2 的 AI 画像目前更接近一面镜子，呈现 LLM 对近期观看的解读；其生成的标签偶尔能命中标题（子串匹配），但概念级标签（如"营销号内容"）与具体标题之间命中率有限。

更准确的定位：**一个好用的过滤器，加一个 AI 自我观察实验**。

## 已经可用的功能

- **关键词屏蔽**：标题命中关键词即隐藏，立即生效，适合临时屏蔽某类话题。
- **一键屏蔽 UP**：卡片 hover 出现"不看 TA"按钮，该 UP 的后续视频不再出现。
- **"不感兴趣"按钮**：点击后同步触发 B 站原生「内容不感兴趣」反馈，本地记录与官方算法同时更新。
- **本地观看记录**：保留近期观看的视频、时长、完播率（B 站自身的 history 不展示完播率）。

![卡片按钮截图](docs/screenshots/card-buttons.png)

## 实验部分

基于最近 50 条观看行为，由 LLM 生成一份**画像**：

- **interests**：模型推断的兴趣标签
- **disinterests**：模型推断的非兴趣标签
- **blockedUps**：来自"不看 TA"行为的屏蔽名单
- **analysis**：一段中文总结

画像 tab 展示以上四项。**目前的主要价值是呈现 LLM 对你的解读**，更接近一个自我观察工具。disinterests 标签也会参与标题过滤，但因偏概念化（如"营销号内容"），实际命中率较低，不能替代手动屏蔽。

支持以下三家 LLM 服务，任选其一：

- [OpenRouter](https://openrouter.ai)：国外，模型选择最全
- [智谱 GLM](https://open.bigmodel.cn)：国内，低延迟
- [DeepSeek](https://platform.deepseek.com)：国内，低延迟

每次分析约消耗 1-2k tokens，按最低档计费成本可忽略。

## 隐私

无服务器，不上报任何数据。

- 观看记录、画像、关键词、设置仅保存在本地 Chrome 存储
- AI 分析使用用户自有 API Key，将近 50 条行为摘要发送至所选 LLM
- 卸载扩展后数据随之清除

## 安装

三种安装方式，任选其一。

**1. Chrome 应用商店（推荐）**

直接安装：[我的 Bilibili 推荐 · Chrome 应用商店](https://chromewebstore.google.com/detail/%E6%88%91%E7%9A%84-bilibili-%E6%8E%A8%E8%8D%90/fbjfocpchadnanfkiecekebmopfjlpee?utm_source=item-share-cb)

**2. 从 Release 下载 zip**

在 [Releases](https://github.com/aisensiy/my-bilibili-rcmd/releases) 下载最新 zip 并解压，然后 chrome://extensions → 启用开发者模式 → 加载已解压的扩展 → 选择解压后的文件夹。

**3. 本地构建**

需要 Node.js 与 pnpm（未安装 pnpm 可执行 `npm i -g pnpm`）。

```bash
git clone https://github.com/aisensiy/my-bilibili-rcmd.git
cd my-bilibili-rcmd
pnpm install
pnpm build
```

随后 chrome://extensions → 启用开发者模式 → 加载已解压的扩展 → 选择 `dist/`。

---

首次打开扩展会进入引导页，填写 API Key 与模型。完成后正常使用 B 站，累计 5 个视频后 AI 会自动分析一次，也可在画像 tab 手动触发"立即分析"。

## 局限

- **仅支持桌面浏览器**：本质是 Chrome 扩展，依赖在 B 站网页注入脚本与修改 DOM。手机 App、平板、移动浏览器均不适用。考虑到多数用户在移动端浏览 B 站，这是一个实际存在的局限。
- **过滤限于前端**：推荐流由 B 站后端返回，扩展只能在浏览器内隐藏不需要的卡片。在桌面屏蔽的 UP，在手机端仍会出现。
- **画像数据不跨设备同步**：画像与观看记录仅存于本地 Chrome，更换设备无法迁移。

## 想尝试的下一步

让 AI 画像**真正驱动**过滤乃至推荐，是项目最希望验证、但目前尚未实现的方向：

- 引导 LLM 生成更易匹配的标签（不只是概念，也包含可能出现在标题中的关键词），提升命中率
- 或换一条路径：由 LLM 直接判断"新推荐与已有画像的契合度"，而非依赖字符串匹配
- **正向推荐**：根据画像主动将可能感兴趣的视频置顶或高亮（推荐流由后端控制，前端实现主动推荐有一定难度，方案待探索）

若使用后对某个方向感兴趣，欢迎在 issue 中讨论。

## 其他细节

- **调试模式**（设置中开启）：不隐藏被过滤卡片，改为标注命中原因，便于查看过滤逻辑。
- **画像可编辑**：AI 生成的标签均可手动修改或删除，编辑结果会在下次分析时作为参考传回 LLM。
- **「不感兴趣」/「不看 TA」的行为**：
  - 「不感兴趣」：当前卡片立即隐藏，bvid 写入本地，后续不再展示；同时触发 B 站原生「内容不感兴趣」反馈。
  - 「不看 TA」：当前页该 UP 的**所有**卡片一并隐藏，UP 名加入永久屏蔽名单；同时触发 B 站原生「不想看此 UP 主」反馈。
  - 两类操作均计入 action 计数，达到阈值时由 background 触发一次新的 LLM 分析。
- **卡片按钮实现**：B 站右侧推荐栏的 Vue 树对 DOM 插入敏感（直接 append 子节点会触发某个 layout 监听，导致顶部导航被卸载），因此侧栏按钮使用挂载在 body 上的 portal 定位。详见代码注释。

## 开发

```bash
pnpm install
pnpm dev    # Vite dev mode
pnpm build  # 构建
```

技术栈：Vite + CRXJS + React 18 + Tailwind v4 + TypeScript。

## 发版流程

版本号维护在 `manifest.json` 与 `package.json` 两处。发版前先提升版本号并提交，再打 tag 触发 CI 构建。

```bash
./scripts/bump.sh 0.1.2     # 修改两处版本号，提交，并打 v0.1.2 tag
git push --follow-tags      # 推送至远端，CI 自动构建并发布至 Chrome Web Store
```

CI（`.github/workflows/release.yml`）内有从 tag 同步版本的兜底逻辑，但规范上以源码为准，CI 只负责构建产物，需保持两处一致。

## License

MIT
