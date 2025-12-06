# Obsidian Git 插件

一个功能强大的 [Obsidian.md](Obsidian.md) 社区插件，将 Git 集成直接引入您的资料库。在 Obsidian 内自动提交、拉取、推送并查看您的更改。

## 📚 文档

所有设置说明（包括移动端）、常见问题、提示和高级配置都可以在📖 [完整文档](https://publish.obsidian.md/git-doc)中找到。

> 👉 移动端用户：该插件**极不稳定 ⚠️！** 请查看下面专门的 [移动端](#-移动端支持-%EF%B8%8F--experimental) 部分。

## ✨ 主要特性

- 🔁 **自动提交和同步**（按计划提交、拉取和推送）
- 📥 **Obsidian 启动时自动拉取**
- 📂 **子模块支持**用于管理多个仓库（仅限桌面端且需选择启用）
- 🔧 **源代码控制视图**用于暂存/取消暂存、提交和比较文件差异 - 使用 `打开源代码控制视图` 命令打开。
- 📜 **历史记录视图**用于浏览提交日志和更改的文件 - 使用 `打开历史记录视图` 命令打开。
- 🔍 **差异视图**用于查看文件中的更改 - 使用 `打开差异视图` 命令打开。
- 🔗 GitHub 集成，可在浏览器中打开文件和历史记录

> 🧩 对于详细的文件历史记录，请考虑将此插件与 [Version History Diff](obsidian://show-plugin?id=obsidian-version-history-diff) 插件配对使用。

## UI 预览

### 🔧 源代码控制视图

直接在 Obsidian 内管理文件更改，如暂存/取消暂存单个文件并提交它们。

![源代码控制视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/source-view.png)

### 📜 历史记录视图

显示仓库的提交历史记录。可以显示提交消息、作者、日期和更改的文件。如截图所示，作者和日期默认禁用，但可以在设置中启用。

![历史记录视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/history-view.png)

### 🔍 差异视图

通过清晰简洁的差异查看器比较版本。
从源代码控制视图或通过 `打开差异视图` 命令打开。

![差异视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/diff-view.png)

## ⚙️ 可用命令
> 并非详尽无遗 - 这些只是一些最常见的命令。完整列表请参见 Obsidian 中的命令面板。

- 🔄 更改
    - `列出更改的文件`：在模态框中列出所有更改
    - `打开差异视图`：为当前文件打开差异视图
    - `暂存当前文件`
    - `取消暂存当前文件`
    - `丢弃所有更改`：丢弃仓库中的所有更改
- ✅ 提交
    - `提交`：如果文件已暂存则只提交这些文件，否则只提交已暂存的文件
    - `使用特定消息提交`：同上，但使用自定义消息
    - `提交所有更改`：提交所有更改但不推送
    - `使用特定消息提交所有更改`：同上，但使用自定义消息
- 🔀 提交和同步
    - `提交和同步`：使用默认设置，将提交所有更改、拉取和推送
    - `使用特定消息提交和同步`：同上，但使用自定义消息
    - `提交和同步并关闭`：同 `提交和同步`，但如果在桌面端运行，将关闭 Obsidian 窗口。不会在移动端退出 Obsidian 应用。
- 🌐 远程
    - `推送`、`拉取`
    - `编辑远程仓库`：添加新远程仓库或编辑现有远程仓库
    - `删除远程仓库`
    - `克隆现有的远程仓库`：打开对话框，提示输入 URL 和身份验证以克隆远程仓库
    - `在 GitHub 上打开文件`：在浏览器窗口中打开当前文件的 GitHub 文件视图。注意：仅适用于桌面端
    - `在 GitHub 上打开文件历史记录`：在浏览器窗口中打开当前文件的 GitHub 文件历史记录。注意：仅适用于桌面端
- 🏠 管理本地仓库
    - `初始化新仓库`
    - `创建新分支`
    - `删除分支`
    - `警告：删除仓库`
- 🧪 其他
    - `打开源代码控制视图`：打开侧边栏显示[源代码控制视图](#sidebar-view)
    - `打开历史记录视图`：打开侧边栏显示[历史记录视图](#history-view)
    - `编辑 .gitignore`
    - `将文件添加到 .gitignore`：将当前文件添加到 `.gitignore`

## 💻 桌面端说明

### 🔐 身份验证

某些 Git 服务可能需要进一步设置 HTTPS/SSH 身份验证。请参考 [身份验证指南](https://publish.obsidian.md/git-doc/Authentication)

### Linux 上的 Obsidian

- ⚠️ 不支持 Snap，因为它受到沙箱限制。
- ⚠️ 不推荐使用 Flatpak，因为它无法访问所有系统文件。他们正在积极修复许多问题，但仍存在一些问题。特别是对于更高级的设置。
- ✅ 请使用 AppImage 或系统包管理器的完全访问安装方式代替 ([Linux 安装指南](https://publish.obsidian.md/git-doc/Installation#Linux))

## 📱 移动端支持 (⚠️ 实验性)

移动端的 Git 实现**非常不稳定**！我不建议在移动端使用此插件，请尝试其他同步服务。

其中一个替代方案是 [GitSync](https://github.com/ViscousPot/GitSync)，它在 Android 和 iOS 上都可用。它与此插件无关，但对于移动端用户来说可能是一个更好的选择。设置教程可以在[这里](https://viscouspotenti.al/posts/gitsync-all-devices-tutorial)找到。

> 🧪 Git 插件在移动端工作得益于 [isomorphic-git](https://isomorphic-git.org/)，这是一个基于 JavaScript 的 Git 重新实现 - 但它有严重的限制和问题。Obsidian 插件不可能在 Android 或 iOS 上使用原生 Git 安装。

### ❌ 移动端功能限制

- 不支持 **SSH 身份验证** ([isomorphic-git 问题](https://github.com/isomorphic-git/isomorphic-git/issues/231))
- 由于内存限制，仓库大小受限
- 不支持变基合并策略
- 不支持子模块

### ⚠️ 性能注意事项

> [!caution]
> 根据您的设备和可用空闲内存，Obsidian 可能会
>
> - 在克隆/拉取时崩溃
> - 创建缓冲区溢出错误
> - 无限期运行。
>
> 这是由移动端底层的 git 实现效率不高造成的。我不知道如何解决这个问题。如果是这种情况，我必须承认这个插件对您不起作用。所以评论任何问题或创建新问题都没有帮助。我很抱歉。

### 移动端使用提示：

如果您有一个大的仓库/资料库，我建议暂存单个文件并只提交已暂存的文件。

## 🙋 联系方式与致谢

- 行作者功能由 [GollyTicker](https://github.com/GollyTicker) 开发，因此任何问题最好向她咨询。
- 此插件最初由 [denolehov](https://github.com/denolehov) 开发。自 2021 年 3 月起，由我 [Vinzent03](https://github.com/Vinzent03) 继续开发此插件。这就是为什么 GitHub 仓库在 2024 年 7 月迁移到我的账户的原因。
- 如果您有任何反馈或问题，请随时通过 GitHub issues 联系。

## ☕ 支持

如果您觉得这个插件有用并希望支持其开发，您可以在 Ko-fi 上支持我。

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F195IQ5)
