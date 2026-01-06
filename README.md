# YouTube Channel Location（显示频道国家/地区）

在 YouTube 页面给频道名旁边加一个小徽标（pill），显示该频道在「关于 / About」页公开的国家/地区（Location/Country）。

> 本脚本为 `arsxrs/YouTubeChannelLocation` 的 Fork，感谢上游作者的贡献与思路。

## 功能

- 在多个页面类型显示频道国家/地区：`watch`、首页、频道页、搜索结果、订阅、Trending/Explore、Shorts
- 懒加载 + 并发限制（默认最多 4 个请求并发），尽量减少对页面性能的影响
- 本地缓存（可选）：减少重复请求；支持一键清空缓存
- 可配置「未知国家/地区」的占位文本（默认：`❓`）
- 支持 YouTube SPA 路由跳转（监听 `yt-navigate-finish` 等事件自动刷新）

## 安装

1. 安装脚本管理器（任选其一）：
   - Chrome/Edge：Tampermonkey 或 Violentmonkey
   - Firefox：Violentmonkey 或 Greasemonkey
2. 打开脚本文件 `./[YouTube] Channel Location [20260106] v1.0.0.user.js`
3. 在 GitHub 页面点击 `Raw`，由脚本管理器弹出安装页后确认安装

## 使用

- 安装后访问 `https://www.youtube.com/`，在频道名右侧会出现国家/地区徽标（例如：`US`、`JP` 等）
- 若频道未公开填写国家/地区，则显示占位符（默认：`❓`）

## 设置（Settings）

脚本会在脚本管理器菜单中注册 `Settings`：

- **显示范围**：按页面类型开关（`watch`/首页/频道页/搜索/订阅/Trending/Shorts）
- **未知占位符**：自定义「频道未填写国家/地区时显示的文本」
- **缓存**：
  - `Cache location info`：开启/关闭本地缓存
  - `Reset cache`：清空缓存
  - 显示当前缓存条目数

## 工作原理（简述）

- 对频道链接（`/@...`、`/channel/...`、`/c/...`、`/user/...`）进行扫描，并在合适位置插入徽标
- 将频道 URL 规范化为对应的 `.../about` 页面，并通过 `fetch(..., { credentials: 'include' })` 拉取 HTML
- 从 About 页 HTML 中解析国家/地区字段并显示；结果可写入本地缓存（GM 存储或 `localStorage`）

## 常见问题

- **看不到徽标？**
  - 确认脚本已启用，并且 Settings 中对应页面类型开关为开启
  - YouTube 频繁改版，若页面结构变化导致失效，可在 Issues 里反馈（附页面链接与截图更容易定位）
- **显示 `❓`？**
  - 通常表示频道没有在 About 页公开国家/地区信息，或该字段无法从页面中解析到

## 许可协议

MIT License

## 致谢

- Upstream：`arsxrs/YouTubeChannelLocation`
