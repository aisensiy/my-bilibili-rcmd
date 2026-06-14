# 隐私政策 · Privacy Policy

_Last updated: 2026-05-17_

> 中文版在前,English version below.

---

## 中文

「我的 Bilibili 推荐」(以下简称"本扩展")是一个开源的浏览器扩展,用于在
bilibili.com 页面上对推荐流进行本地过滤。本扩展由个人开发者维护,
**不运营任何服务器,不收集、不上传、不分享你的任何个人数据**。

### 1. 我们处理哪些数据

本扩展只在你本机的浏览器内处理以下数据:

- **你在 B 站的浏览行为**:你打开/点击/完播的视频标题、UP 主名称、视频时长、
  完播率,以及你手动点的"不感兴趣 / 不看 TA"记录。
- **你生成的兴趣画像**:标签、屏蔽 UP 列表、关键词、AI 生成的画像摘要。
- **扩展设置**:你选择的 LLM 服务商、模型名、以及你**自己**填入的 API Key。

这些数据**全部保存在 Chrome 本地存储 (`chrome.storage.local`) 中**,不会离开
你的设备,除以下"第三方调用"一节中明确说明的情况以外。

### 2. 第三方调用 (LLM 服务)

为了生成兴趣画像,本扩展会**用你自己提供的 API Key**,把你最近的观看摘要
(最多约 50 条标题/UP/完播率) 发送到你**主动选择**的 LLM 服务商:

- OpenRouter (https://openrouter.ai)
- 智谱 GLM (https://open.bigmodel.cn)
- DeepSeek (https://api.deepseek.com)

发送的内容**仅限于上述观看摘要**,不包含你的姓名、邮箱、IP、Cookie、B 站账号
或任何能够直接识别你身份的信息。该请求由 Chrome 浏览器直接发起,数据如何被
LLM 服务商处理,适用该服务商自己的隐私政策,本扩展无法控制。

如果你不想触发该请求,**不要在扩展中填写 API Key 即可**——所有 AI 相关功能
都会关闭,扩展仍可作为纯关键词过滤器使用。

### 3. 我们不做哪些事

- ❌ 没有任何服务器,扩展作者**完全无法看到**你的数据
- ❌ 不使用 Google Analytics 等任何统计/埋点工具
- ❌ 不投放广告,不进行任何 affiliate/推广跳转
- ❌ 不出售、不交易、不与任何第三方分享你的数据
- ❌ 不读取除 `bilibili.com` 之外页面的内容
- ❌ 不读取 cookies、不修改你的 B 站账号设置

### 4. 权限说明

`manifest.json` 中申请的权限,用途如下:

- `storage`:在本地存储画像、设置、观看记录
- `https://*.bilibili.com/*`:在 B 站页面上读取卡片、注入过滤 UI
- `https://openrouter.ai/*`、`https://open.bigmodel.cn/*`、
  `https://api.deepseek.com/*`:向你选择的 LLM 服务商发起 AI 分析请求

### 5. 数据删除

卸载本扩展即会清除其全部本地数据。你也可以在扩展内点击"清空数据",或在
`chrome://extensions` → 详情 → 清除存储 来手动清空。

### 6. 联系方式

如有疑问或意见,请通过 GitHub Issue 联系:
https://github.com/aisensiy/my-bilibili-rcmd/issues

---

## English

"My Bilibili Rcmd" (the "Extension") is an open-source browser extension that
filters Bilibili's recommendation feed locally on your machine. The Extension
is maintained by an individual developer. **There is no backend server. We do
not collect, transmit, or share any of your personal data.**

### 1. Data the Extension Processes

The Extension processes the following data locally in your browser only:

- **Your Bilibili viewing activity**: titles, uploader names, durations, and
  completion ratios of videos you open or click, plus any "Not interested" /
  "Don't show this uploader" feedback you give.
- **Your generated interest profile**: tags, blocked-uploader list, keywords,
  AI-generated summary.
- **Extension settings**: your chosen LLM provider, model, and the API key
  **you yourself enter**.

All of the above is stored exclusively in `chrome.storage.local` and never
leaves your device, except as described in section 2.

### 2. Third-Party LLM Calls

To generate your interest profile, the Extension uses **your own API key** to
send a summary of your recent viewing activity (up to ~50 entries of
title/uploader/completion-ratio) to the LLM provider you **explicitly
select**:

- OpenRouter (https://openrouter.ai)
- Zhipu GLM (https://open.bigmodel.cn)
- DeepSeek (https://api.deepseek.com)

Only the viewing summary above is sent. No name, email, IP, cookie, Bilibili
account ID, or other directly identifying information is included. The
request is made directly from your browser; how the LLM provider then handles
the data is governed by that provider's own privacy policy and is outside our
control.

If you do not want this request to occur, **simply do not enter an API key**.
All AI features will be disabled and the Extension will still work as a
keyword-only filter.

### 3. What We Do Not Do

- ❌ No backend — the author **literally cannot see** your data
- ❌ No analytics, telemetry, or tracking
- ❌ No ads, no affiliate links, no referral injection
- ❌ No selling, trading, or sharing of your data with any third party
- ❌ No reading of pages outside `bilibili.com`
- ❌ No reading cookies, no modifying your Bilibili account

### 4. Permissions

Permissions requested in `manifest.json` and why:

- `storage`: store your profile, settings, and viewing log locally
- `https://*.bilibili.com/*`: read recommendation cards and inject filtering
  UI on Bilibili pages
- `https://openrouter.ai/*`, `https://open.bigmodel.cn/*`,
  `https://api.deepseek.com/*`: send analysis requests to the LLM provider
  you chose

### 5. Data Deletion

Uninstalling the Extension removes all of its local data. You can also click
"Clear data" inside the Extension, or go to `chrome://extensions` → Details
→ Clear storage.

### 6. Contact

Questions or concerns? Please open an issue at
https://github.com/aisensiy/my-bilibili-rcmd/issues

## 可选功能：采集推荐流标题（默认关）

设置里有一个「采集推荐流标题（增强 AI 屏蔽词）」开关，**默认关闭**。

- 关闭时：行为与以往一致，只在 AI 分析时把最近行为摘要发给你自己配置的 LLM。
- 开启时：你在 B 站刷到的视频标题（B 站推送给你的推荐结果，不是你的主动行为）会被去重后存在本地（最多 150 条的滑动窗口），并在分析时随摘要一起发给**你自己配置的 LLM**，用于提取更准的屏蔽关键词。
- 仍然没有作者服务器、没有埋点；用的始终是你自己的 API Key。
- 关闭开关会立即清空已采集的本地标题窗口；「清除所有数据」也会清空。
