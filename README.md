# 我的 Bilibili 推荐 · My Bilibili Rcmd

一个尝试：让 LLM 看自己的 B 站观看行为，给推荐流做点过滤。

![画像 tab 截图](docs/screenshots/profile.png)

## 这是什么

B 站推荐流刷久了越来越糟，原生「不感兴趣」感觉点了也没用。所以试着写了这个扩展自用：

记录看了什么（标题、UP、完播率），每攒够几条交给 LLM 分析一次，生成一份"AI 看到的你"——一些标签和一段总结。然后用这些标签去过滤后续推荐里那些你大概率不想看的。

**它就是个个人项目，不保证效果有多好，也不知道适不适合你的口味。** 截图给朋友看的时候有几个人说想要，所以把它扔上来，仅供尝试。

## 目前做了哪些事

- 用 LLM 看你最近 50 条观看行为，生成兴趣画像（interests / disinterests / blockedUps + 一段中文总结）
- 用画像里的"不感兴趣"标签 + "屏蔽 UP" 名单去过滤推荐流卡片
- 卡片 hover 出"不感兴趣 / 不看 TA"快捷按钮，点了既本地记下来、也帮你触发 B 站原生的反馈
- 手动加关键词做硬规则屏蔽（AI 不动这部分，立即生效）
- 本地观看记录（含完播率统计）

![卡片按钮截图](docs/screenshots/card-buttons.png)

目前支持三个渠道，挑一家就行：

- [OpenRouter](https://openrouter.ai) — 国外，模型最全
- [智谱 GLM](https://open.bigmodel.cn) — 国内，低延迟
- [DeepSeek](https://platform.deepseek.com) — 国内，低延迟

每次分析大概 1-2k tokens，按三家最便宜档算下来几分钱。

## 隐私

没有服务器，不上报任何东西。

- 观看记录、画像、关键词、设置都只在你的 Chrome 本地存储里
- AI 分析时，用你自己的 API Key 把最近 50 条行为摘要发给你选的那家 LLM
- 卸载扩展数据就没了

## 安装

```bash
git clone https://github.com/aisensiy/my-bilibili-rcmd.git
cd my-bilibili-rcmd
npm install
npm run build
```

然后 chrome://extensions → 开开发者模式 → 加载已解压的扩展 → 选 `dist/`。

打开扩展会有个引导页让你填 Key 和模型。填完去 B 站正常用，看够 5 个视频 AI 就会自动分析一次。也可以在画像 tab 手动点"立即分析"。

## 想试的下一步

现在只做了「反推荐」——根据画像过滤掉不想看的。如果效果还行，想试试「正推荐」——根据画像主动把可能感兴趣的推到前面，但 B 站推荐流是后端给的，前端想做主动推荐挺难，得想想。

## 其他细节

- **调试模式**（设置里）：被过滤的卡片不隐藏，标记命中原因，方便看 AI / 关键词到底在过滤什么
- **画像可编辑**：AI 给的标签都能手动改删，画像 tab 里的 "interests"（喜欢的内容）主要用来让你判断 AI 理解你的程度对不对，不影响过滤
- **「不感兴趣」/「不看TA」点了之后**：
  - 「不感兴趣」：当前这张卡片立刻隐藏，bvid 记进本地，之后再刷出来也不会再显示；同时帮你触发 B 站原生「内容不感兴趣」反馈
  - 「不看TA」：当前页该 UP 的**所有**卡片一起消失，UP 名加入永久屏蔽名单，后续推荐流里再出现也会被过滤；同时触发 B 站原生「不想看此UP主」反馈
  - 两者都会算进 action 计数，攒够阈值时 background 重新跑一次 LLM 分析画像
- **卡片按钮的实现**：B 站右侧推荐栏的 Vue 树对 DOM 插入比较敏感（直接 append 子节点会触发某个 layout 监听导致顶部导航被卸载），所以侧栏按钮用 body 上的 portal 定位，不直接 append 进卡片。代码注释里有详情。

## 开发

```bash
npm install
npm run dev   # Vite dev mode
npm run build # 一次构建
```

技术栈：Vite + CRXJS + React 18 + Tailwind v3 + TypeScript。

## License

MIT
