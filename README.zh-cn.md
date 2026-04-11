# Obsidian Git 插件

一个强大的社区插件，为 [Obsidian.md](Obsidian.md) 带来了 Git 集成功能。可以在 Obsidian 中自动提交、拉取、推送和查看更改——一切都在 Obsidian 内完成。

## 📚 文档

所有设置说明（包括移动端）、常见问题、技巧和高级配置可以在 📖 [完整文档](https://publish.obsidian.md/git-doc) 中找到。

> 移动端用户：该插件 **非常不稳定 ⚠️！** 请查看下方的 [移动端](#-%E7%A7%BB%E5%8A%A8%E7%AB%AF%E6%94%AF%E6%8C%81-%EF%B8%8F--%E5%AE%9E%E9%AA%8C%E6%80%A7) 部分。

## 主要功能

- 🔁 按计划自动 commit-and-sync（提交、拉取和推送）
- 📥 在 Obsidian 启动时自动拉取
- 📂 支持子模块来管理多个仓库（仅限桌面端，需手动开启）
- 🔧 **源代码控制视图** 用于暂存/取消暂存、提交和查看文件差异 - 使用 `打开源代码控制视图` 命令打开
- 📜 **历史视图** 用于浏览提交日志和更改的文件 - 使用 `打开历史视图` 命令打开
- 🔍 **差异视图** 用于查看文件中的更改 - 使用 `打开差异视图` 命令打开
- 📝 在编辑器中显示标记，指示添加、修改和删除的行/块（仅限桌面端）
- GitHub 集成，可在浏览器中打开文件和历史记录

> 对于详细的文件历史记录，可以考虑将此插件与 [Version History Diff](obsidian://show-plugin?id=obsidian-version-history-diff) 插件配合使用。

## 界面预览

### 🔧 源代码控制视图

_直接在 Obsidian 内管理文件更改，例如暂存/取消暂存单个文件并提交。_

![源代码控制视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/source-view.png)

### 📜 历史视图

显示仓库的提交历史。可以显示提交信息、作者、日期和更改的文件。如截图所示，作者和日期默认禁用，但可以在设置中启用。

![历史视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/history-view.png)

### 🔍 差异视图

使用清晰简洁的差异查看器比较版本。
可以从源代码控制视图或通过 `打开差异视图` 命令打开。

![差异视图](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/diff-view.png)

### 📝 编辑器中的标记

直接在编辑器中逐行查看更改，使用添加、修改和删除的行/块指示器。你可以直接从标记中暂存和重置更改。还有命令可以在块之间导航以及暂存/重置光标下的块。需要在插件设置中启用。

![标记](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/signs.png)

## 可用命令
> 并非详尽无遗 - 这些只是一些最常用的命令。完整列表请参阅 Obsidian 中的命令面板。

- 🔄 更改
    - `列出更改的文件`：在弹窗中列出所有更改
    - `打开差异视图`：打开当前文件的差异视图
    - `暂存当前文件`
    - `取消暂存当前文件`
    - `放弃所有更改`：放弃仓库中的所有更改
- ✅ 提交
    - `提交`：仅当文件已暂存时提交，否则仅提交已暂存的文件
    - `使用特定消息提交`：与上述相同，但使用自定义消息
    - `提交所有更改`：提交所有更改但不推送
    - `使用特定消息提交所有更改`：与上述相同，但使用自定义消息
- 🔀 Commit-and-sync
    - `Commit-and-sync`：使用默认设置时，这将提交所有更改、拉取并推送
    - `使用特定消息进行 commit-and-sync`：与上述相同，但使用自定义消息
    - `Commit-and-sync 并关闭`：与 `Commit-and-sync` 相同，但如果在桌面端运行，将关闭 Obsidian 窗口。不会在移动端退出 Obsidian 应用
- 🌐 远程
    - `推送`、`拉取`
    - `编辑远程仓库`：添加新远程仓库或编辑现有远程仓库
    - `移除远程仓库`
    - `克隆现有远程仓库`：打开对话框，提示输入 URL 和身份验证以克隆远程仓库
    - `在 GitHub 上打开文件`：在浏览器中打开 GitHub 上当前文件的视图。注意：仅适用于桌面端
    - `在 GitHub 上打开文件历史`：在浏览器中打开 GitHub 上当前文件的历史记录。注意：仅适用于桌面端
- 🏠 管理本地仓库
    - `初始化新仓库`
    - `创建新分支`
    - `删除分支`
    - `注意：删除仓库`
- 🧪 其他
    - `打开源代码控制视图`：打开侧边栏，显示 [源代码控制视图](#sidebar-view)
    - `打开历史视图`：打开侧边栏，显示 [历史视图](#history-view)
    - `编辑 .gitignore`
    - `将文件添加到 .gitignore`：将当前文件添加到 `.gitignore`

## 💻 桌面端说明

### 🔐 身份验证

某些 Git 服务可能需要额外的 HTTPS/SSH 身份验证设置。请参阅 [身份验证指南](https://publish.obsidian.md/git-doc/Authentication)

### Linux 上的 Obsidian

- ⚠️  由于其沙盒限制，不支持 Snap
- ⚠️  不推荐使用 Flatpak，因为它无法访问所有系统文件。他们正在积极修复许多问题，但仍存在问题。特别是在更高级的设置中
- ✅ 请使用 AppImage 或系统包管理器的完全访问安装（[Linux 安装指南](https://publish.obsidian.md/git-doc/Installation#Linux)）

## 📱 移动端支持（⚠️  实验性）

移动端的 Git 实现 **非常不稳定**！我不建议在移动端使用此插件，而是尝试其他同步服务。

一个这样的替代方案是 [GitSync](https://github.com/ViscousPot/GitSync)，它可在 Android 和 iOS 上使用。它与此插件无关，但可能是移动端用户的更好选择。可以在此处找到设置教程 [这里](https://viscouspotenti.al/posts/gitsync-all-devices-tutorial)。

> 🧪 多亏了 [isomorphic-git](https://isomorphic-git.org/)，一个基于 JavaScript 的 Git 重新实现，Git 插件才能在移动端工作——但它带来了严重的限制和问题。Obsidian 插件无法在 Android 或 iOS 上使用原生 Git 安装。

### ❌ 移动端功能限制

- 无 **SSH 身份验证**（[isomorphic-git 问题](https://github.com/isomorphic-git/isomorphic-git/issues/231)）
- 由于内存限制，仓库大小受限
- 无 rebase 合并策略
- 无子模块支持

### ⚠️ 性能问题

> [!caution]
> 根据您的设备和可用内存，Obsidian 可能
>
> - 在克隆/拉取时崩溃
> - 产生缓冲区溢出错误
> - 无限期运行
>
> 这是由移动端底层 git 实现引起的，效率不高。我不知道如何解决这个问题。如果这对您来说是个问题，我必须承认此插件不适用于您。因此，在任何问题上发表评论或创建新问题都无济于事。我很抱歉。

### 移动端使用提示：

如果您有大型仓库/库，我建议暂存单个文件并仅提交已暂存的文件。

## 🙋 联系方式与致谢

- 行作者功能由 [GollyTicker](https://github.com/GollyTicker) 开发，因此任何问题可能最好由她来回答
- 此插件最初由 [denolehov](https://github.com/denolehov) 开发。自 2021 年 3 月起，是我 [Vinzent03](https://github.com/Vinzent03) 在开发此插件。这就是为什么 GitHub 仓库在 2024 年 7 月移到了我的账户
- 如果您有任何反馈或问题，请随时通过 GitHub Issues 联系

## ☕ 支持

如果您觉得此插件有用并想支持其开发，您可以在 Ko-fi 上支持我。

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F195IQ5)
