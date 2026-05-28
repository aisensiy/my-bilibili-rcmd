# 我的 Bilibili 推荐 · My Bilibili Rcmd

一个本地运行的 B 站推荐管理扩展。用 LLM 帮你构建你的个人画像。

![画像 tab 截图](docs/screenshots/profile.png)

## 这是什么

B 站推荐流刷久了越来越糟，原生「不感兴趣」感觉点了也没用。所以试着写了这个扩展自用，做两件事：

1. **规则明确的推荐管理工具**：手输关键词屏蔽、一键屏蔽 UP、卡片上的快捷按钮，你说屏蔽就屏蔽，不会和你对着干。
2. **让 LLM 帮你看自己**：每攒几条观看行为交给 LLM 分析一次，生成“AI 看到的你”，包括一些标签和一段总结，然后用标签帮你过滤内容。

## 它能帮你做什么

- **手输关键词屏蔽**：标题包含就隐藏，立即生效。比如不想刷到某个人的各种直播和切片。
- **一键屏蔽 UP**：卡片 hover 出“不看TA”，那个 UP 以后的视频都不再出现。
- **顺手的“不感兴趣”按钮**：当前卡片立刻隐藏，bvid 记进本地，之后再刷出来也不会显示；同时帮你触发 B 站原生「内容不感兴趣」反馈。
- **动态页热搜「屏蔽话题」**：动态页（t.bilibili.com）右侧 bilibili 热搜 hover 出“屏蔽”，点一下该热搜立即从列表消失并记下这次屏蔽（刷新后仍隐藏）。被屏蔽的话题会作为不感兴趣信号进入 AI 画像分析，顺带影响推荐流过滤。
- **本地观看记录**：保留最近看了什么、看了多久、完播率多少，这些内容是兴趣画像的基础。
- **可编辑的兴趣画像**：AI 给的标签都能手动改删；改了之后，下次分析会把你的编辑作为参考喂回 LLM。
- **调试模式**：设置里打开后，被过滤的卡片不隐藏，改为标记命中原因，方便看看到底是什么规则在起作用。

![卡片按钮截图](docs/screenshots/card-buttons.png)

## 怎么安装

三种方式，按你方便挑一个。

**1. Chrome 应用商店（最省事）**

直接装：[我的 Bilibili 推荐 · Chrome 应用商店](https://chromewebstore.google.com/detail/%E6%88%91%E7%9A%84-bilibili-%E6%8E%A8%E8%8D%90/fbjfocpchadnanfkiecekebmopfjlpee?utm_source=item-share-cb)

**2. 从 Release 下载 zip**

去 [Releases](https://github.com/aisensiy/my-bilibili-rcmd/releases) 下最新的 zip 解压，然后 `chrome://extensions` → 开启开发者模式 → 加载已解压的扩展 → 选解压出来的文件夹。

**3. 自己构建**

需要 Node.js 和 pnpm（没装 pnpm 的话 `npm i -g pnpm`）。

```bash
git clone https://github.com/aisensiy/my-bilibili-rcmd.git
cd my-bilibili-rcmd
pnpm install
pnpm build
```

然后 `chrome://extensions` → 开启开发者模式 → 加载已解压的扩展 → 选 `dist/`。

## 怎么使用

装完打开扩展，会有个引导页让你填 API Key、选择 LLM 服务商和模型。填完之后去 B 站正常用，看够 5 个视频 AI 就会自动分析一次；也可以在画像 tab 手动点 “立即分析”。

日常用法主要是这几件事：

- 在关键词 tab 里加不想看的词，标题命中后会被隐藏。
- 在推荐卡片上点“不感兴趣”，当前视频会被本地记录并隐藏，同时触发 B 站原生反馈。
- 在推荐卡片上点“不看TA”，当前页这个 UP 的卡片会一起消失，UP 名加入永久屏蔽名单，同时触发 B 站原生“不想看此UP主”反馈。
- 在动态页右侧热搜上点“屏蔽”，该话题立即从热搜列表消失（刷新后仍隐藏）并记入观看记录；它会作为不感兴趣信号进入下一次 AI 画像分析，由画像顺带过滤推荐流里的同类内容。
- 在画像 tab 看 AI 总结出来的 interests、disinterests 和分析文字，不准的标签可以直接改掉。

“不感兴趣”“不看TA”和“屏蔽话题”都会算进行为计数，攒够阈值时 background 会重新跑一次 LLM 分析。

## AI 画像怎么工作

根据最近 50 条本地观看行为，定期生成一份**画像**：

- **interests**：AI 觉得你喜欢的内容类型（标签）
- **disinterests**：AI 觉得你不感兴趣的（标签）
- **blockedUps**：从“不看TA”行为里整理的屏蔽名单（这就是一五一十的记录你的屏蔽行为）
- **analysis**：一段中文总结

分析要接 LLM，内置三家，也支持自定义 OpenAI 兼容接口：

- [OpenRouter](https://openrouter.ai)，国外，模型最全
- [智谱 GLM](https://open.bigmodel.cn)，国内，低延迟
- [DeepSeek](https://platform.deepseek.com)，国内，低延迟
- **自定义**：填 base URL 和模型 id，longcat、Ollama、自部署等都行

模型 id 各家文档里查，自己填。每次分析约 1-2k tokens，按最便宜档算下来几分钱。

如果你不填 API Key，它就退化成纯关键词和手动屏蔽工具，AI 相关功能不会发请求。

## 隐私

没有服务器，不上报任何东西。

- 观看记录、画像、关键词、设置都只在你的 Chrome 本地存储里
- AI 分析时，用你自己的 API Key 把最近 50 条行为摘要发给你选的那家 LLM
- 作者看不到你的数据，也没有埋点、广告或后端服务
- 卸载扩展数据就没了

## 功能边界

- **只在桌面浏览器工作**：本质是 Chrome 扩展，靠在 B 站网页上注入脚本、改 DOM 来做事。手机端的 B 站 App、平板、移动浏览器都用不上，大多数人刷 B 站其实在手机上，这个限制挺真实
- **过滤是前端的**：推荐流是 B 站后端返回的，扩展只能在浏览器里把不想要的卡片藏起来。意味着你在桌面屏蔽掉某个 UP，去手机刷还是会看到
- **AI 画像短期不会同步到手机**：画像、观看记录都只在你本地 Chrome 里，换电脑也带不走
- **AI 标签还不够聪明**：现在主要是用标签命中标题。后面更想做的是让 LLM 生成更可匹配的关键词，或者直接判断“这条新推荐和我已有画像有多契合”，而不是只依赖字符串匹配

## 开发与发版

### 本地开发

技术栈：Vite + CRXJS + React 18 + Tailwind v4 + TypeScript。

```bash
pnpm install
pnpm dev    # Vite dev mode
pnpm build  # 一次构建
```

构建后在 `chrome://extensions` → 开启开发者模式 → 加载已解压的扩展 → 选 `dist/`。

### 关键实现说明

- **卡片按钮注入**：B 站右侧推荐栏的 Vue 树对 DOM 插入比较敏感，直接 append 子节点会触发某个 layout 监听导致顶部导航被卸载，所以侧栏按钮用 body 上的 portal 定位。代码注释里有详情。
- **行为触发分析**：“不感兴趣”“不看TA”和“屏蔽话题”都会算进行为计数，攒够阈值时 background 重新跑一次 LLM 分析。
- **调试过滤**：调试模式不会隐藏卡片，只标记命中原因，用来确认关键词、UP 屏蔽和画像标签到底怎么命中。

### 发版流程

版本号是 `manifest.json` 和 `package.json` 两处。发版前先 bump 写进 git，再打 tag 触发 CI 构建。

```bash
./scripts/bump.sh 0.1.2     # 改两个文件，commit，打 v0.1.2 tag
git push --follow-tags      # 推到远端，CI 自动构建并发到 Chrome Web Store
```

CI（`.github/workflows/release.yml`）里也有从 tag 同步版本的兜底步骤，但流程上 source 是源码，CI 只是建产物。别让两边脱钩。

## License

MIT
