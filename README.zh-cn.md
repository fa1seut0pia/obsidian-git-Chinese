# Git

一个 [Obsidian.md](https://obsidian.md) 的社区插件，用于使用 Git 管理您的保险库。

## 文档

要求、安装步骤（包括移动设备设置）、提示和技巧、常见问题等可以在 [文档](https://publish.obsidian.md/git-doc) 中找到。

对于移动端用户，请参阅下面的 [Mobile](#mobile) 部分。

## 特点

- 按计划自动提交和同步（提交、拉取和推送）。
- 在 Obsidian 启动时从远程仓库拉取提交。
- 通过 Git 子模块管理不同的存储库（选择加入设置）（仅限 Desktop）。
- 通过 Source Control View 暂存、提交和比较单个文件。使用 'Open Source Control View' 命令打开它。
- 通过 History View 列出你的提交及其更改的文件（如 'git log'）。使用 'Open History View' 命令打开它。
- 要查看文件的详细历史记录，我强烈建议您使用[Version History Diff](obsidian://show-plugin?id=obsidian-version-history-diff) 插件。

### 文件源控制查看

此视图允许您暂存、取消暂存和提交单个文件。它还显示 Vault 中每个文件的状态。

![Source Control View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/source-view.png)

### 历史查看

此视图显示仓库的提交历史记录。您可以看到提交消息、作者、日期和更改的文件。默认情况下，作者和日期可以处于禁用状态，如屏幕截图所示，但可以在设置中启用。

![History View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/history-view.png)

### 差异查看

您可以从源代码控制视图或通过额外的命令打开 diff 视图。

![Diff View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/diff-view.png)

## 可用命令（并非详尽和完整）

- Changes
  - `List changed files`: 列出模态框中的所有更改
  - `Open diff view`: 打开当前文件的差异视图
  - `Stage current file`
  - `Unstage current file`
- Commit
  - `Commit all changes`: 仅提交所有更改而不推送
  - `Commit all changes with specific message`: 同上，但带有自定义消息
  - `Commit staged`: 仅提交已暂存的文件
  - `Commit staged with specific message`: 同上，但带有自定义消息
- Commit-and-sync
  - `Commit-and-sync`: 使用默认设置时，这将提交所有更改、拉取和推送
  - `Commit-and-sync with specific message`: 同上，但带有自定义消息
  - `Commit-and-sync and close`: Same as `Commit-and-sync`, 但如果在桌面上运行，将关闭 Obsidian 窗口。不会在移动设备上退出 Obsidian 应用程序。
- Remote
  - `Push`
  - `Pull`
  - `Edit remotes`
  - `Remove remote`
  - `Clone an existing remote repo`: 打开对话框，提示输入 URL 和身份验证以克隆远程存储库
  - `Open file on GitHub`: 在浏览器窗口中打开 GitHub 上当前文件的文件视图。注意：仅适用于桌面
  - `Open file history on GitHub`: 在浏览器窗口中打开 GitHub 上当前文件的文件历史记录。注意：仅适用于桌面
- Local
  - `Initialize a new repo`
  - `Create new branch`
  - `Delete branch`
  - `CAUTION: Delete repository`
- Source Control View
  - `Open source control view`: 打开侧窗格，显示 [Source control view](#sidebar-view)
  - `Edit .gitignore`
  - `Add file to .gitignore`: 将当前文件添加到 .gitignore

## 桌面端

## 身份验证

身份验证可能需要其他设置。看这 [Authentication documentation](https://publish.obsidian.md/git-doc/Authentication)

### 在 Linux 上使用 Obsidian

- ⚠ 不支持 Snap。
- ⚠ 不建议使用 Flatpak，因为它无法访问所有系统文件。

请改用 AppImage ([Linux installation guide](https://publish.obsidian.md/git-doc/Installation#Linux))

## 移动端

移动设备上的 git 实现**非常不稳定**！

### 限制

移动版支持 [isomorphic-git](https://isomorphic-git.org/), 这是 Git 在 JavaScript 中的重新实现，因为您无法在 Android 或 iOS 上使用原生 Git。

- 不支持 SSH 身份验证 ([isomorphic-git issue](https://github.com/isomorphic-git/isomorphic-git/issues/231))
- 由于内存限制，存储库大小受到限制
- 不支持 Rebase 合并策略
- 不支持子模块

### 移动端表现

> [!caution]
> 根据您的设备和可用的可用 RAM，Obsidian 可能会
>
> - clone/pull 时崩溃
> - 创建缓冲区溢出错误
> - run indefinitely.
>
> 这是由移动设备上的底层 git 实现引起的，效率不高。我不知道如何解决这个问题。如果你是这种情况，我不得不承认这个插件不适合您。因此，评论任何问题或创建新问题都无济于事。对不起。

**设置：** iPad Pro M1 配备 [repo](https://github.com/Vinzent03/obsidian-git-stress-test) 的 3000 个文件从 [10000 markdown files](https://github.com/Zettelkasten-Method/10000-markdown-files)

初始克隆耗时 0 分 25 秒。之后，最耗时的部分是检查整个工作目录的文件更改。在此设置中，检查所有文件是否对 stage 进行更改需要 03 分 40 秒。其他命令（如 pull、push 和 commit）非常快（1-5 秒）。

如果您有一个大型 repo/vault，那么在移动设备上工作的最快方法是暂存单个文件，并且只提交暂存文件。

## 联系

Line Authoring 功能由 [GollyTicker](https://github.com/GollyTicker), 所以任何问题都可以由他最好地回答。

如果您有任何类型的反馈或问题，请随时通过 GitHub 问题与我们联系 或 `vinzent3` 在 [Obsidian Discord server](https://discord.com/invite/veuWUTm).

该插件最初由 [denolehov](https://github.com/denolehov). 自 2021 年 3 月起, 是我 [Vinzent03](https://github.com/Vinzent03) 在开发这个插件。 这就是为什么 GitHub 存储库在 2024 年 7 月转移到我的帐户。

## 支持

如果您觉得此插件有用并希望支持其开发，您可以在 Ko-fi 上打赏我。

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F195IQ5)
