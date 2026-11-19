# DeepSeek Chat Android App

简体中文 | [English](README.md)

基于官方开源项目 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)（MIT 协议）使用 Capacitor 封装并深度适配的安卓手机客户端。无需自建后端，手机端直接连接 DeepSeek API。

## 下载与安装（普通用户）

1. 打开本仓库右侧的 **[Releases](../../releases)** 页面。
2. 下载最新版本中的 `DeepSeek-Chat-v*.apk` 文件。
3. 在安卓手机上点击 APK 完成安装（如系统提示「未知来源应用」，允许安装即可）。
4. 首次打开 App 后，在 **设置 → 数据管理** 中输入你的 DeepSeek API Key 即可开始使用。

> 隐私说明：API Key、应用设置及全部聊天记录仅保存在你的手机本地，App 不包含任何第三方后端服务器。

## 功能特性

- **完整保留原版全部能力**：多会话管理与自动标题、流式输出、深度思考、智能联网搜索与来源引用、网页阅读、消息编辑/重生成/分支切换、图片与文档附件上传、语音输入与实时音频频谱、回复语音朗读、Markdown / 代码高亮 / KaTeX 数学公式 / Mermaid 图表、历史对话 ZIP 导入导出、浅色/深色/跟随系统主题、中英文切换。
- **新增独家实用功能（原版没有）**：
  - **自定义系统提示词与角色预设库**：支持全局系统提示词与**单会话独立覆盖**；内置 6 套常用角色预设（默认助手、编程专家、中英翻译、写作润色、学习导师、极简直答），支持自由保存与删除自定义预设；欢迎页与顶栏均可一键切换。
  - **增强语音输入与语音对话模式**：支持在 **DeepSeek 云端 ASR** 与 **系统实时语音识别（边说边出字）** 间切换；录音中支持一键取消；支持**语音识别后自动发送**以及**语音提问后自动朗读回复**。
  - **模型快速切换**：支持在 `DeepSeek Flash`（极速均衡）与 `DeepSeek V4 Pro`（旗舰推理）之间一键切换（顶栏与设置页均可操作）。
  - **自定义 API 地址**：支持在设置中配置兼容反代或自建网关地址，并可一键恢复官方默认地址。
  - **侧边栏搜索与置顶对话**：支持按标题实时检索历史对话，支持将常用对话置顶到列表顶部。
  - **原生分享与 Markdown 导出**：每条 AI 回复支持一键调起安卓系统分享面板；支持将当前会话导出为结构清晰的 `.md` 文件。
  - **字体大小调节与 Token 用量展示**：支持小/标准/大三档字号实时缩放，回复底部可选展示模型与输入/输出/缓存 Token 用量。
  - **欢迎页灵感起手式**：首页提供快捷角色切换与常用提问模板，手机端一点即填。
- **安卓原生适配增强**：
  - 适配全面屏、刘海屏、手势导航栏与输入法弹出布局（Capacitor 8 `SystemBars` + `adjustResize`）。
  - 系统状态栏与导航栏图标自动跟随 App 浅色/深色主题切换。
  - 原生安卓物理/手势返回键体验：依次关闭弹窗、搜索结果、侧边抽屉，主页连按两次退出。
  - 导出聊天记录 ZIP 与查看本地附件时调用安卓原生系统分享/保存面板。
  - 外部链接与搜索引用使用系统浏览器 / Chrome Custom Tabs 打开，不中断对话。
  - 已配置麦克风权限以支持语音输入，并适配流式语音朗读播放。
  - 定制独立应用图标、自适应图标与明暗双色启动页（应用包名 `io.chatdemo.deepseek`，可与官方 App 共存）。

## 本地开发与自行打包

需要 Node.js 22.12+、pnpm 12+，编译 APK 需要 JDK 21 与 Android SDK：

```sh
pnpm install
pnpm dev            # 网页端开发调试 (http://localhost:8090)
pnpm android:sync   # 编译前端并同步到 android/ 原生工程
pnpm android:open   # 用 Android Studio 打开安卓工程
```

使用 Gradle 命令行打包 APK：

```sh
cd android
./gradlew assembleRelease
```

生成的 APK 位于 `android/app/build/outputs/apk/release/`。

## GitHub Actions 自动发布

仓库已内置 `.github/workflows/android-release.yml`：

- 推送到 `main` 分支：自动执行类型检查、Lint、前端构建、Capacitor 同步和 Android APK 编译，并将 APK 上传到 Actions Artifacts。
- 推送版本标签（例如 `git tag v1.0.0 && git push origin v1.0.0`）或在 Actions 页面手动运行并填写 `release_tag`：自动编译并发布到 GitHub **Releases**。
- 如需使用固定正式签名密钥，可在仓库 Secrets 中配置 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`；未配置时会自动使用调试签名，确保生成的 APK 仍可直接安装。

## 开源致谢与许可

本项目基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 修改并打包，遵循原项目 [MIT 许可证](LICENSE)。
