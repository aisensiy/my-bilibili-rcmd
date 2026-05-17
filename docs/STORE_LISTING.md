# Chrome Web Store 上架材料

集中存放商店描述、隐私问卷答案、被拒申诉模板,直接复制粘贴用。

---

## 1. 基本信息

| 字段 | 值 |
| --- | --- |
| Extension name | 我的 Bilibili 推荐 |
| Short summary (≤132 字符) | 用 LLM 看你的 B 站观看行为生成兴趣画像,自动过滤推荐流里你大概率不想看的视频。 |
| Category | Productivity (生产力) |
| Language | 简体中文 (主); English (次) |

---

## 2. 详细描述 (Description, ≤16000 字符)

```
「我的 Bilibili 推荐」是一个本地运行的 Chrome 扩展,帮你过滤 B 站首页/侧边栏推荐流里不想看的内容。

它做了什么
─────────────
· 记录你在 B 站打开的视频(标题、UP 主、完播率),完全保存在浏览器本地
· 每隔 N 条交给你自选的 LLM 分析一次,生成一份"AI 看到的你"——
  一些 interests / disinterests 标签 + 一段中文总结
· 用这些 disinterest 标签 + 你手动加的关键词 + 屏蔽 UP 名单去过滤推荐卡片
· 卡片悬停出"不感兴趣 / 不看 TA"快捷按钮,既本地记下来,也帮你触发 B 站原生反馈
· 调试模式:被过滤的卡片不真隐藏,而是标记命中原因,看 AI 在过滤什么

支持的 LLM 服务
─────────────
挑一家就行,需要你自己去申请 API Key:
· OpenRouter — 国外,模型最全
· 智谱 GLM — 国内,低延迟
· DeepSeek — 国内,低延迟

每次分析大约 1-2k tokens,按最便宜档算下来一次几分钱。

隐私
─────────────
· 没有任何服务器,作者看不到你的任何数据
· 观看记录、画像、设置都只在 chrome.storage.local
· 仅在你主动配置 API Key 后,才会把观看摘要发给你选择的 LLM 服务商
· 不上报、不埋点、不投放广告

如果你不填 API Key,扩展会自动降级为纯关键词过滤器,所有 AI 功能关闭。

开源
─────────────
代码与隐私政策:https://github.com/aisensiy/my-bilibili-rcmd

—————

English

"My Bilibili Rcmd" is a local Chrome extension that filters Bilibili's
recommendation feed using an LLM-generated profile of your viewing habits.

· Logs the videos you open on Bilibili (title, uploader, completion ratio),
  stored entirely in chrome.storage.local
· Every N videos, sends a summary to the LLM provider YOU chose
  (OpenRouter / Zhipu GLM / DeepSeek), using YOUR own API key
· Generates an interest profile (tags + summary) you can edit
· Filters cards by AI-derived "disinterests" + your keywords + blocked
  uploader list
· No server, no analytics, no ads, no tracking

Source code & privacy policy:
https://github.com/aisensiy/my-bilibili-rcmd
```

---

## 3. Privacy practices 表单答案

在 Dashboard → Privacy practices 一节,逐条按下面勾。

### Single purpose

> 用 LLM 生成的兴趣画像,在本地过滤 Bilibili 推荐流中用户不想看的视频。

### Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Persist user's locally-generated interest profile, viewing log, and settings. |
| Host `*.bilibili.com` | Read recommendation cards from the Bilibili DOM and inject filtering UI. |
| Host `openrouter.ai`, `open.bigmodel.cn`, `api.deepseek.com` | Send the user's viewing summary to the LLM provider the user explicitly selected, using the user's own API key, to generate an interest profile. |
| Remote code | Not used. The extension does not load or execute any remote code; LLM responses are parsed as JSON only. |

### Data usage disclosure

只勾这几项:

- [x] **Web history** — 我们处理用户在 bilibili.com 上打开了哪些视频(标题/UP/完播率)。
- [x] **User activity** — "不感兴趣 / 不看 TA" 等用户在卡片上的点击。

**不要勾**:Personally identifiable information / Health / Financial /
Authentication / Personal communications / Location。

三项保证全勾上:

- [x] I do not sell or transfer user data to third parties for purposes
      unrelated to the item's single purpose.
- [x] I do not use or transfer user data for purposes that are unrelated
      to the item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or
      for lending purposes.

### Privacy policy URL

```
https://github.com/aisensiy/my-bilibili-rcmd/blob/master/docs/PRIVACY.md
```

(也可以开 GitHub Pages 用更短的 URL,比如
`https://aisensiy.github.io/my-bilibili-rcmd/privacy`)

---

## 4. 截图清单 (至少 1 张,推荐 3-5 张, 1280×800)

要的截图:

1. **画像 tab** — 已存在 `docs/screenshots/profile.png`,可能要重新拍 1280×800
2. **卡片 hover 出"不感兴趣 / 不看 TA"按钮** — 已存在
   `docs/screenshots/card-buttons.png`
3. **设置页 / 引导填 API Key**
4. **调试模式:命中原因标注**
5. **关键词管理**

文件要求:PNG/JPEG, 1280×800 或 640×400, 单文件 ≤ 1MB。

---

## 5. 如果被拒,通用申诉模板

Chrome Web Store 拒信里常见的几种理由 + 回复:

### A. "Excessive permissions" / "Broad host permissions"

```
Hello reviewer,

Thanks for the review. All host permissions in the manifest are scoped to
the minimum required for the extension's single purpose (filtering the
Bilibili recommendation feed locally):

- https://*.bilibili.com/*  — required to read the recommendation cards
  in the DOM and inject the local filtering UI.
- https://openrouter.ai/*, https://open.bigmodel.cn/*,
  https://api.deepseek.com/*  — three specific LLM provider endpoints the
  user must explicitly choose between. The user supplies their own API
  key; without a key, these endpoints are never contacted.

We do not use <all_urls>, do not request `tabs`, `webRequest`, `cookies`,
or any broader permission. Please let us know if a narrower scope is
expected.
```

### B. "Privacy policy missing" / "Data usage disclosure mismatch"

```
Hello reviewer,

The privacy policy is published at:
https://github.com/aisensiy/my-bilibili-rcmd/blob/master/docs/PRIVACY.md

It explicitly discloses:
1. That the extension processes the user's Bilibili viewing activity
   (titles, uploaders, completion ratios) locally in chrome.storage.local.
2. That when — and only when — the user has voluntarily configured an
   API key, a summary of the recent viewing activity is sent directly
   from the user's browser to the LLM provider the user selected.
3. That no backend server is involved, no analytics or telemetry is
   used, and no data is sold or shared with any party other than the
   LLM provider the user picked.

The "Web history" and "User activity" boxes are checked in the data
usage disclosure to reflect (1) and (2). Please let us know which
specific disclosure needs adjustment.
```

### C. "Modifying third-party content"

```
Hello reviewer,

The extension operates only on bilibili.com (matched explicitly in the
manifest) and modifies the page strictly to support its single purpose:
filtering the Bilibili recommendation feed for the user who installed
it. All modifications are local and visible only in the user's own
browser — no content is altered for other Bilibili users, no traffic is
redirected, no affiliate or ad links are injected, and no content is
republished elsewhere.

This is functionally analogous to ad-blockers or content filters that
have been accepted on the store. We are happy to add a clearer note in
the description if that helps users understand the scope.
```

### D. "Remote code execution"

```
Hello reviewer,

The extension does not load or execute any remote code. All JavaScript
is bundled at build time. The HTTPS requests to OpenRouter / Zhipu /
DeepSeek send a JSON request and receive a JSON response, which is
parsed with JSON.parse and used as structured data only — never eval'd,
never injected into the page as script. We are happy to point to the
specific source files if that would help.
```
