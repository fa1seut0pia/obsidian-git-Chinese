import type { App, RGB } from "obsidian";
import { moment, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import {
    DATE_TIME_FORMAT_SECONDS,
    DEFAULT_SETTINGS,
    GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH,
} from "src/constants";
import { IsomorphicGit } from "src/gitManager/isomorphicGit";
import { SimpleGit } from "src/gitManager/simpleGit";
import { previewColor } from "src/lineAuthor/lineAuthorProvider";
import type {
    LineAuthorDateTimeFormatOptions,
    LineAuthorDisplay,
    LineAuthorFollowMovement,
    LineAuthorSettings,
    LineAuthorTimezoneOption,
} from "src/lineAuthor/model";
import type ObsidianGit from "src/main";
import type {
    ObsidianGitSettings,
    ShowAuthorInHistoryView,
    SyncMethod,
} from "src/types";
import { convertToRgb, rgbToString, formatMinutes } from "src/utils";

const FORMAT_STRING_REFERENCE_URL =
    "https://momentjs.com/docs/#/parsing/string-format/";
const LINE_AUTHOR_FEATURE_WIKI_LINK =
    "https://publish.obsidian.md/git-doc/Line+Authoring";

export class ObsidianGitSettingsTab extends PluginSettingTab {
    lineAuthorColorSettings: Map<"oldest" | "newest", Setting> = new Map();
    constructor(
        app: App,
        private plugin: ObsidianGit
    ) {
        super(app, plugin);
    }

    private get settings() {
        return this.plugin.settings;
    }

    display(): void {
        const { containerEl } = this;
        const plugin: ObsidianGit = this.plugin;

        let commitOrSync: string;
        if (plugin.settings.differentIntervalCommitAndPush) {
            commitOrSync = " 提交 ";
        } else {
            commitOrSync = " 提交并推送 ";
        }

        const gitReady = plugin.gitReady;

        containerEl.empty();
        if (!gitReady) {
            containerEl.createEl("p", {
                text: "Git is not ready. When all settings are correct you can configure commit-sync, etc.",
            });
            containerEl.createEl("br");
        }

        let setting: Setting;
        if (gitReady) {
            new Setting(containerEl).setName("自动提交和同步").setHeading();
            new Setting(containerEl)
                .setName("为自动提交和推送设置独立定时器")
                .setDesc("允许为提交和推送使用不同的间隔时间。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(
                            plugin.settings.differentIntervalCommitAndPush
                        )
                        .onChange(async (value) => {
                            plugin.settings.differentIntervalCommitAndPush =
                                value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit", "push");
                            this.display();
                        })
                );

            new Setting(containerEl)
                .setName(`自动${commitOrSync}间隔 (分钟)`)
                .setDesc(
                    `${
                        plugin.settings.differentIntervalCommitAndPush
                            ? "提交"
                            : "提交和推送"
                    }每 X 分钟执行一次。设置为 0（默认）表示禁用。（请参阅下面的设置以进行进一步配置！）`
                )
                .addText((text) =>
                    text
                        .setValue(String(plugin.settings.autoSaveInterval))
                        .onChange(async (value) => {
                            if (!isNaN(Number(value))) {
                                plugin.settings.autoSaveInterval =
                                    Number(value);
                                await plugin.saveSettings();

                                plugin.automaticsManager.reload("commit");
                                if (plugin.settings.autoSaveInterval > 0) {
                                    new Notice(
                                        `自动${commitOrSync}已启用! 每 ${formatMinutes(
                                            plugin.settings.autoSaveInterval
                                        )}执行一次。`
                                    );
                                } else if (
                                    plugin.settings.autoSaveInterval <= 0
                                ) {
                                    new Notice(`自动${commitOrSync}已禁用!`);
                                }
                            } else {
                                new Notice("请填写一个有效的数字。");
                            }
                        })
                );

            setting = new Setting(containerEl)
                .setName(`文件停止编辑后自动${commitOrSync}`)
                .setDesc(
                    `要求${commitOrSync}间隔不为0。
                        如果打开，会在文件停止编辑后每隔${formatMinutes(
                            plugin.settings.autoSaveInterval
                        )}自动执行${commitOrSync}。
                       这也可以防止编辑文件时自动${commitOrSync}。如果关闭，它将独立于上次的文件编辑。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoBackupAfterFileChange)
                        .onChange(async (value) => {
                            plugin.settings.autoBackupAfterFileChange = value;
                            this.display();
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.setLastSaveToLastCommit
            );

            setting = new Setting(containerEl)
                .setName(`最后一次提交后自动${commitOrSync}`)
                .setDesc(
                    `启用后，会将最后一个自动${commitOrSync}的时间戳设置为最新提交时间戳。这会减少手动提交时自动${commitOrSync}的频率。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.setLastSaveToLastCommit)
                        .onChange(async (value) => {
                            plugin.settings.setLastSaveToLastCommit = value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                            this.display();
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.autoBackupAfterFileChange
            );

            setting = new Setting(containerEl)
                .setName(`自动推送间隔（分钟）`)
                .setDesc("每 X 分钟推送一次提交。设置为 0（默认）表示禁用。")
                .addText((text) =>
                    text
                        .setValue(String(plugin.settings.autoPushInterval))
                        .onChange(async (value) => {
                            if (!isNaN(Number(value))) {
                                plugin.settings.autoPushInterval =
                                    Number(value);
                                await plugin.saveSettings();

                                if (plugin.settings.autoPushInterval > 0) {
                                    plugin.automaticsManager.reload("push");
                                    new Notice(
                                        `自动推送已启用！每 ${formatMinutes(
                                            plugin.settings.autoPushInterval
                                        )}执行一次。`
                                    );
                                } else if (
                                    plugin.settings.autoPushInterval <= 0
                                ) {
                                    new Notice("自动推送已禁用！");
                                }
                            } else {
                                new Notice("请填写一个有效的数字。");
                            }
                        })
                );
            this.mayDisableSetting(
                setting,
                !plugin.settings.differentIntervalCommitAndPush
            );

            new Setting(containerEl)
                .setName("自动拉取间隔（分钟）")
                .setDesc("每 X 分钟拉取一次更改。设置为 0（默认）表示禁用。")
                .addText((text) =>
                    text
                        .setValue(String(plugin.settings.autoPullInterval))
                        .onChange(async (value) => {
                            if (!isNaN(Number(value))) {
                                plugin.settings.autoPullInterval =
                                    Number(value);
                                await plugin.saveSettings();

                                if (plugin.settings.autoPullInterval > 0) {
                                    plugin.automaticsManager.reload("pull");
                                    new Notice(
                                        `自动拉取已启用！每${formatMinutes(
                                            plugin.settings.autoPullInterval
                                        )}执行一次。`
                                    );
                                } else if (
                                    plugin.settings.autoPullInterval <= 0
                                ) {
                                    new Notice("自动拉取已禁用！");
                                }
                            } else {
                                new Notice("请填写一个有效的数字。");
                            }
                        })
                );

            new Setting(containerEl)
                .setName(`在自动${commitOrSync}上指定自定义提交消息`)
                .setDesc("弹出窗口来填写提交消息。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.customMessageOnAutoBackup)
                        .onChange(async (value) => {
                            plugin.settings.customMessageOnAutoBackup = value;
                            await plugin.saveSettings();
                            this.display();
                        })
                );

            setting = new Setting(containerEl)
                .setName(`自动提交消息 ${commitOrSync}`)
                .setDesc(
                    "可用占位符：{{date}}" +
                        "（见下文）、{{hostname}}（见下文）、{{numFiles}}（提交中更改的文件数）和 {{files}}（提交消息中更改的文件）。"
                )
                .addTextArea((text) =>
                    text
                        .setPlaceholder("vault backup: {{date}}")
                        .setValue(plugin.settings.autoCommitMessage)
                        .onChange(async (value) => {
                            plugin.settings.autoCommitMessage = value;
                            await plugin.saveSettings();
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.customMessageOnAutoBackup
            );

            new Setting(containerEl).setName("提交消息").setHeading();

            new Setting(containerEl)
                .setName("手动提交时的提交消息")
                .setDesc(
                    "可用占位符：{{date}}" +
                        "（见下文）、{{hostname}}（见下文）、{{numFiles}}（提交中更改的文件数）和 {{files}}（提交消息中更改的文件）。"
                )
                .addTextArea((text) =>
                    text
                        .setPlaceholder("vault 备份：{{date}}")
                        .setValue(
                            plugin.settings.commitMessage
                                ? plugin.settings.commitMessage
                                : ""
                        )
                        .onChange(async (value) => {
                            plugin.settings.commitMessage = value;
                            await plugin.saveSettings();
                        })
                );

            const datePlaceholderSetting = new Setting(containerEl)
                .setName("{{date}} 占位符格式")
                .addMomentFormat((text) =>
                    text
                        .setDefaultFormat(plugin.settings.commitDateFormat)
                        .setValue(plugin.settings.commitDateFormat)
                        .onChange(async (value) => {
                            plugin.settings.commitDateFormat = value;
                            await plugin.saveSettings();
                        })
                );
            datePlaceholderSetting.descEl.innerHTML = `
            自定义日期格式。 例如: "${DATE_TIME_FORMAT_SECONDS}"。 这里有更多的格式: <a href="https://momentjs.com">Moment.js</a> 。`;

            new Setting(containerEl)
                .setName("{{hostname}} 占位符替换")
                .setDesc("为每个设备指定自定义主机名。")
                .addText((text) =>
                    text
                        .setValue(plugin.localStorage.getHostname() ?? "")
                        .onChange((value) => {
                            plugin.localStorage.setHostname(value);
                        })
                );

            new Setting(containerEl)
                .setName("预览提交消息")
                .addButton((button) =>
                    button.setButtonText("预览").onClick(async () => {
                        const commitMessagePreview =
                            await plugin.gitManager.formatCommitMessage(
                                plugin.settings.commitMessage
                            );
                        new Notice(`${commitMessagePreview}`);
                    })
                );

            new Setting(containerEl)
                .setName("列出提交正文中受提交影响的文件名")
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.listChangedFilesInMessageBody)
                        .onChange(async (value) => {
                            plugin.settings.listChangedFilesInMessageBody =
                                value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl).setName("拉取").setHeading();

            if (plugin.gitManager instanceof SimpleGit)
                new Setting(containerEl)
                    .setName("合并策略")
                    .setDesc("决定如何将远程分支的提交集成到本地分支。")
                    .addDropdown((dropdown) => {
                        const options: Record<SyncMethod, string> = {
                            merge: "Merge",
                            rebase: "Rebase",
                            reset: "其他同步服务（只更新 HEAD，不影响工作目录）。",
                        };
                        dropdown.addOptions(options);
                        dropdown.setValue(plugin.settings.syncMethod);

                        dropdown.onChange(async (option: SyncMethod) => {
                            plugin.settings.syncMethod = option;
                            await plugin.saveSettings();
                        });
                    });

            new Setting(containerEl)
                .setName("启动时拉取")
                .setDesc("Obsidian 启动时自动拉取提交。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoPullOnBoot)
                        .onChange(async (value) => {
                            plugin.settings.autoPullOnBoot = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("提交并同步")
                .setDesc(
                    "使用默认设置提交并同步意味着暂存所有内容 -> 提交 -> 拉取 -> 推送。理想情况下，这是您定期执行的单个操作，以保持本地和远程存储库同步。"
                )
                .setHeading();

            setting = new Setting(containerEl)
                .setName("推送提交并同步")
                .setDesc(
                    `大多数时候你想在提交后推送。关闭此功能会把提交并推送操作转变为提交${plugin.settings.pullBeforePush ? "并拉取" : ""}。它仍然执行提交并推送。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(!plugin.settings.disablePush)
                        .onChange(async (value) => {
                            plugin.settings.disablePush = !value;
                            this.display();
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("提交并同步以及拉取")
                .setDesc(
                    `在提交和推送时，也拉取提交。关闭此功能会将提交并同步操作转变为只提交${plugin.settings.disablePush ? "" : "并推送 "}。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.pullBeforePush)
                        .onChange(async (value) => {
                            plugin.settings.pullBeforePush = value;
                            this.display();
                            await plugin.saveSettings();
                        })
                );

            if (plugin.gitManager instanceof SimpleGit) {
                new Setting(containerEl).setName("每行的作者信息").setHeading();

                this.addLineAuthorInfoSettings();
            }
        }

        new Setting(containerEl).setName("历史视图").setHeading();

        new Setting(containerEl)
            .setName("显示作者")
            .setDesc("在历史视图中显示提交的作者。")
            .addDropdown((dropdown) => {
                const options: Record<ShowAuthorInHistoryView, string> = {
                    hide: "隐藏",
                    full: "全称",
                    initials: "缩写",
                };
                dropdown.addOptions(options);
                dropdown.setValue(plugin.settings.authorInHistoryView);
                dropdown.onChange(async (option: ShowAuthorInHistoryView) => {
                    plugin.settings.authorInHistoryView = option;
                    await plugin.saveSettings();
                    await plugin.refresh();
                });
            });

        new Setting(containerEl)
            .setName("显示日期")
            .setDesc(
                "在历史视图中显示提交日期。 {{date}} 占位符格式用于显示日期。"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.dateInHistoryView)
                    .onChange(async (value) => {
                        plugin.settings.dateInHistoryView = value;
                        await plugin.saveSettings();
                        await plugin.refresh();
                    })
            );

        new Setting(containerEl).setName("源代码控制视图").setHeading();

        new Setting(containerEl)
            .setName("自动刷新文件更改的源代码控制视图")
            .setDesc(
                "在速度较慢的机器上，这可能会导致延迟。如果是这样，只需禁用此选项即可。"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.refreshSourceControl)
                    .onChange(async (value) => {
                        plugin.settings.refreshSourceControl = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("源代码管理视图刷新间隔")
            .setDesc("文件更改后刷新源代码管理视图之前等待的毫秒数。")
            .addText((toggle) =>
                toggle
                    .setValue(
                        plugin.settings.refreshSourceControlTimer.toString()
                    )
                    .setPlaceholder("7000")
                    .onChange(async (value) => {
                        plugin.settings.refreshSourceControlTimer = Math.max(
                            parseInt(value),
                            500
                        );
                        await plugin.saveSettings();
                        plugin.setRefreshDebouncer();
                    })
            );
        new Setting(containerEl).setName("杂项").setHeading();

        new Setting(containerEl)
            .setName("禁用通知")
            .setDesc(
                "禁用 git 操作的通知以最大程度地减少干扰（请参阅状态栏了解更新）。即使您启用此设置，错误仍会显示为通知。"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.disablePopups)
                    .onChange(async (value) => {
                        plugin.settings.disablePopups = value;
                        this.display();
                        await plugin.saveSettings();
                    })
            );

        if (!plugin.settings.disablePopups)
            new Setting(containerEl)
                .setName("隐藏通知不发生任何变化")
                .setDesc("当没有要提交或推送的更改时，不显示通知。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.disablePopupsForNoChanges)
                        .onChange(async (value) => {
                            plugin.settings.disablePopupsForNoChanges = value;
                            await plugin.saveSettings();
                        })
                );

        new Setting(containerEl)
            .setName("显示状态栏")
            .setDesc("必须重新启动 Obsidian 才能使更改生效。")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("在文件菜单中显示暂存/取消暂存按钮。")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showFileMenu)
                    .onChange(async (value) => {
                        plugin.settings.showFileMenu = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("显示分支状态栏")
            .setDesc("必须重新启动 Obsidian 才能使更改生效。")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showBranchStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showBranchStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("在状态栏中显示修改文件的数量")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.changedFilesInStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.changedFilesInStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        if (plugin.gitManager instanceof IsomorphicGit) {
            new Setting(containerEl)
                .setName("身份验证/Commit author")
                .setHeading();
        } else {
            new Setting(containerEl).setName("提交作者").setHeading();
        }

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName("git 服务器上的用户名。例如。您在 GitHub 上的用户名")
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getUsername() ?? "");
                    cb.onChange((value) => {
                        plugin.localStorage.setUsername(value);
                    });
                });

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName("Password/个人 access token")
                .setDesc("输入您的密码。你将无法再看到它。")
                .addText((cb) => {
                    cb.inputEl.autocapitalize = "off";
                    cb.inputEl.autocomplete = "off";
                    cb.inputEl.spellcheck = false;
                    cb.onChange((value) => {
                        plugin.localStorage.setPassword(value);
                    });
                });

        if (plugin.gitReady)
            new Setting(containerEl)
                .setName("提交的作者姓名")
                .addText(async (cb) => {
                    cb.setValue(await plugin.gitManager.getConfig("user.name"));
                    cb.onChange(async (value) => {
                        await plugin.gitManager.setConfig(
                            "user.name",
                            value == "" ? undefined : value
                        );
                    });
                });

        if (plugin.gitReady)
            new Setting(containerEl)
                .setName("用于提交的作者电子邮件")
                .addText(async (cb) => {
                    cb.setValue(
                        await plugin.gitManager.getConfig("user.email")
                    );
                    cb.onChange(async (value) => {
                        await plugin.gitManager.setConfig(
                            "user.email",
                            value == "" ? undefined : value
                        );
                    });
                });

        new Setting(containerEl)
            .setName("高级")
            .setDesc("这些设置通常不需要更改，但特殊设置可能需要更改。")
            .setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName("更新子模块")
                .setDesc(
                    "“提交并推送”和“拉取”负责子模块。缺少的功能：冲突文件、拉取/推送/提交文件的计数。需要为每个子模块设置跟踪分支。"
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.updateSubmodules)
                        .onChange(async (value) => {
                            plugin.settings.updateSubmodules = value;
                            await plugin.saveSettings();
                        })
                );
            if (plugin.settings.updateSubmodules) {
                new Setting(containerEl)
                    .setName("子模块资源 checkout/switch")
                    .setDesc(
                        "每当在根存储库上发生签出时，都会在子模块上递归签出（如果分支存在）。"
                    )
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.submoduleRecurseCheckout)
                            .onChange(async (value) => {
                                plugin.settings.submoduleRecurseCheckout =
                                    value;
                                await plugin.saveSettings();
                            })
                    );
            }
        }

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("自定义 Git 二进制路径")
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getGitPath() ?? "");
                    cb.setPlaceholder("git");
                    cb.onChange((value) => {
                        plugin.localStorage.setGitPath(value);
                        plugin.gitManager
                            .updateGitPath(value || "git")
                            .catch((e) => plugin.displayError(e));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("附加环境变量")
                .setDesc("将每一行用于格式为 KEY=VALUE 的新环境变量。")
                .addTextArea((cb) => {
                    cb.setPlaceholder("GIT_DIR=/path/to/git/dir");
                    cb.setValue(plugin.localStorage.getEnvVars().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setEnvVars(value.split("\n"));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("附加 PATH 环境变量路径")
                .setDesc("使用每一行作为一条路径")
                .addTextArea((cb) => {
                    cb.setValue(plugin.localStorage.getPATHPaths().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setPATHPaths(value.split("\n"));
                    });
                });
        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("使用新的环境变量重新加载")
                .setDesc(
                    "删除之前添加的环境变量要等到 Obsidian 重新启动后才会生效。"
                )
                .addButton((cb) => {
                    cb.setButtonText("重载");
                    cb.setCta();
                    cb.onClick(async () => {
                        await (plugin.gitManager as SimpleGit).setGitInstance();
                    });
                });

        new Setting(containerEl)
            .setName("自定义基本路径（Git 存储库路径）")
            .setDesc(
                `
            设置应执行 Git 二进制文件的保管库的相对路径。
             主要用于设置 Git 存储库的路径，仅当 Git 存储库位于 Vault 根目录下时才需要。在 Windows 上使用“\\”而不是“/”。
            `
            )
            .addText((cb) => {
                cb.setValue(plugin.settings.basePath);
                cb.setPlaceholder("directory/directory-with-git-repo");
                cb.onChange(async (value) => {
                    plugin.settings.basePath = value;
                    await plugin.saveSettings();
                    plugin.gitManager
                        .updateBasePath(value || "")
                        .catch((e) => plugin.displayError(e));
                });
            });

        new Setting(containerEl)
            .setName("自定义 Git 目录路径（而不是“.git”）")
            .setDesc(
                `需要重启 Obsidian 才能生效。在 Windows 上使用“\\”而不是“/”。`
            )
            .addText((cb) => {
                cb.setValue(plugin.settings.gitDir);
                cb.setPlaceholder(".git");
                cb.onChange(async (value) => {
                    plugin.settings.gitDir = value;
                    await plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("在此设备上禁用")
            .setDesc("在此设备上禁用插件。此设置不会同步。")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.localStorage.getPluginDisabled())
                    .onChange((value) => {
                        plugin.localStorage.setPluginDisabled(value);
                        if (value) {
                            plugin.unloadPlugin();
                        } else {
                            plugin
                                .init({ fromReload: true })
                                .catch((e) => plugin.displayError(e));
                        }
                        new Notice("必须重新启动 Obsidian 才能使更改生效。");
                    })
            );

        new Setting(containerEl).setName("支持").setHeading();
        new Setting(containerEl)
            .setName("打赏")
            .setDesc("如果您喜欢这个插件，请考虑捐款以支持持续开发。")
            .addButton((bt) => {
                bt.buttonEl.outerHTML =
                    "<a href='https://ko-fi.com/F1F195IQ5' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>";
            });

        const debugDiv = containerEl.createDiv();
        debugDiv.setAttr("align", "center");
        debugDiv.setAttr("style", "margin: var(--size-4-2)");

        const debugButton = debugDiv.createEl("button");
        debugButton.setText("复制 Debug 信息");
        debugButton.onclick = async () => {
            await window.navigator.clipboard.writeText(
                JSON.stringify(
                    {
                        settings: this.plugin.settings,
                        pluginVersion: this.plugin.manifest.version,
                    },
                    null,
                    4
                )
            );
            new Notice("已将 Debug 信息复制到剪贴板。可能包含敏感信息！");
        };

        if (Platform.isDesktopApp) {
            const info = containerEl.createDiv();
            info.setAttr("align", "center");
            info.setText(
                "调试和日志记录：\n您始终可以通过打开控制台来查看此插件和其他每个插件的日志"
            );
            const keys = containerEl.createDiv();
            keys.setAttr("align", "center");
            keys.addClass("obsidian-git-shortcuts");
            if (Platform.isMacOS === true) {
                keys.createEl("kbd", { text: "CMD (⌘) + OPTION (⌥) + I" });
            } else {
                keys.createEl("kbd", { text: "CTRL + SHIFT + I" });
            }
        }
    }

    mayDisableSetting(setting: Setting, disable: boolean) {
        if (disable) {
            setting.setDisabled(disable);
            setting.setClass("obsidian-git-disabled");
        }
    }

    public configureLineAuthorShowStatus(show: boolean) {
        this.settings.lineAuthor.show = show;
        void this.plugin.saveSettings();

        if (show) this.plugin.lineAuthoringFeature.activateFeature();
        else this.plugin.lineAuthoringFeature.deactivateFeature();
    }

    /**
     * Persists the setting {@link key} with value {@link value} and
     * refreshes the line author info views.
     */
    public async lineAuthorSettingHandler<
        K extends keyof ObsidianGitSettings["lineAuthor"],
    >(key: K, value: ObsidianGitSettings["lineAuthor"][K]): Promise<void> {
        this.settings.lineAuthor[key] = value;
        await this.plugin.saveSettings();
        this.plugin.lineAuthoringFeature.refreshLineAuthorViews();
    }

    /**
     * Ensure, that certain last shown values are persisten in the settings.
     *
     * Necessary for the line author info gutter context menus.
     */
    public beforeSaveSettings() {
        const laSettings = this.settings.lineAuthor;
        if (laSettings.authorDisplay !== "hide") {
            laSettings.lastShownAuthorDisplay = laSettings.authorDisplay;
        }
        if (laSettings.dateTimeFormatOptions !== "hide") {
            laSettings.lastShownDateTimeFormatOptions =
                laSettings.dateTimeFormatOptions;
        }
    }

    private addLineAuthorInfoSettings() {
        const baseLineAuthorInfoSetting = new Setting(this.containerEl).setName(
            "在每行旁边显示提交创作信息"
        );

        if (!this.plugin.lineAuthoringFeature.isAvailableOnCurrentPlatform()) {
            baseLineAuthorInfoSetting
                .setDesc("目前仅在桌面上可用。")
                .setDisabled(true);
        }

        baseLineAuthorInfoSetting.descEl.innerHTML = `
            <a href="${LINE_AUTHOR_FEATURE_WIKI_LINK}">功能指南和快速示例</a></br>
            提交哈希、作者姓名和创作日期都可以单独切换。</br>隐藏所有内容，只显示根据时间着色的侧边栏。`;

        baseLineAuthorInfoSetting.addToggle((toggle) =>
            toggle.setValue(this.settings.lineAuthor.show).onChange((value) => {
                this.configureLineAuthorShowStatus(value);
                this.display();
            })
        );

        if (this.settings.lineAuthor.show) {
            const trackMovement = new Setting(this.containerEl)
                .setName("跟踪跨文件和提交的移动和副本")
                .setDesc("")
                .addDropdown((dropdown) => {
                    dropdown.addOptions(<
                        Record<LineAuthorFollowMovement, string>
                    >{
                        inactive: "不跟随 （默认）",
                        "same-commit": "在同一 commit 中跟进",
                        "all-commits": "在所有 commit 中跟随（可能很慢）",
                    });
                    dropdown.setValue(this.settings.lineAuthor.followMovement);
                    dropdown.onChange((value: LineAuthorFollowMovement) =>
                        this.lineAuthorSettingHandler("followMovement", value)
                    );
                });
            trackMovement.descEl.innerHTML = `
                默认情况下 （已停用），每行仅显示更改位置的最新提交。
                <br/>
                与 <i>相同的提交</i>, 在同一提交中遵循文本的剪切-复制-粘贴，并显示创作的原始提交。
                <br/>
                与 <i>所有的提交</i>, 将检测到多个提交之间的 cut-copy-paste-ing 文本。
                <br/>
                它使用 <a href="https://git-scm.com/docs/git-blame">git-blame</a> 和
                对于匹配项 (at least ${GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH} characters)在相同（或所有）提交中, <em>原始的</em> 提交的信息。`;

            new Setting(this.containerEl)
                .setName("显示提交 Hash")
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.showCommitHash);
                    tgl.onChange((value: boolean) =>
                        this.lineAuthorSettingHandler("showCommitHash", value)
                    );
                });

            new Setting(this.containerEl)
                .setName("作者姓名显示")
                .setDesc("是否以及如何显示作者")
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorDisplay, string> = {
                        hide: "隐藏",
                        initials: "首字母缩写 （默认）",
                        "first name": "First name",
                        "last name": "Last name",
                        full: "全名",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(this.settings.lineAuthor.authorDisplay);

                    dropdown.onChange(async (value: LineAuthorDisplay) =>
                        this.lineAuthorSettingHandler("authorDisplay", value)
                    );
                });

            new Setting(this.containerEl)
                .setName("创作日期显示")
                .setDesc("是否以及如何显示创作行的日期和时间")
                .addDropdown((dropdown) => {
                    const options: Record<
                        LineAuthorDateTimeFormatOptions,
                        string
                    > = {
                        hide: "Hide",
                        date: "Date (default)",
                        datetime: "Date and time",
                        "natural language": "Natural language",
                        custom: "Custom",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeFormatOptions
                    );

                    dropdown.onChange(
                        async (value: LineAuthorDateTimeFormatOptions) => {
                            await this.lineAuthorSettingHandler(
                                "dateTimeFormatOptions",
                                value
                            );
                            this.display();
                        }
                    );
                });

            if (this.settings.lineAuthor.dateTimeFormatOptions === "custom") {
                const dateTimeFormatCustomStringSetting = new Setting(
                    this.containerEl
                );

                dateTimeFormatCustomStringSetting
                    .setName("自定义创作日期格式")
                    .addText((cb) => {
                        cb.setValue(
                            this.settings.lineAuthor.dateTimeFormatCustomString
                        );
                        cb.setPlaceholder("YYYY-MM-DD HH:mm");

                        cb.onChange(async (value) => {
                            await this.lineAuthorSettingHandler(
                                "dateTimeFormatCustomString",
                                value
                            );
                            dateTimeFormatCustomStringSetting.descEl.innerHTML =
                                this.previewCustomDateTimeDescriptionHtml(
                                    value
                                );
                        });
                    });

                dateTimeFormatCustomStringSetting.descEl.innerHTML =
                    this.previewCustomDateTimeDescriptionHtml(
                        this.settings.lineAuthor.dateTimeFormatCustomString
                    );
            }

            new Setting(this.containerEl)
                .setName("创作日期显示时区")
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorTimezoneOption, string> = {
                        "viewer-local": "My local (default)",
                        "author-local": "Author's local",
                        utc0000: "UTC+0000/Z",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeTimezone
                    );

                    dropdown.onChange(async (value: LineAuthorTimezoneOption) =>
                        this.lineAuthorSettingHandler("dateTimeTimezone", value)
                    );
                }).descEl.innerHTML = `
                    The time-zone in which the authoring date should be shown.
                    Either your local time-zone (default),
                    the author's time-zone during commit creation or
                    <a href="https://en.wikipedia.org/wiki/UTC%C2%B100:00">UTC±00:00</a>.
            `;

            const oldestAgeSetting = new Setting(this.containerEl).setName(
                "着色年龄最大"
            );

            oldestAgeSetting.descEl.innerHTML =
                this.previewOldestAgeDescriptionHtml(
                    this.settings.lineAuthor.coloringMaxAge
                )[0];

            oldestAgeSetting.addText((text) => {
                text.setPlaceholder("1y");
                text.setValue(this.settings.lineAuthor.coloringMaxAge);
                text.onChange(async (value) => {
                    const [preview, valid] =
                        this.previewOldestAgeDescriptionHtml(value);
                    oldestAgeSetting.descEl.innerHTML = preview;
                    if (valid) {
                        await this.lineAuthorSettingHandler(
                            "coloringMaxAge",
                            value
                        );
                        this.refreshColorSettingsName("oldest");
                    }
                });
            });

            this.createColorSetting("newest");
            this.createColorSetting("oldest");

            new Setting(this.containerEl)
                .setName("文本颜色")
                .addText((field) => {
                    field.setValue(this.settings.lineAuthor.textColorCss);
                    field.onChange(async (value) => {
                        await this.lineAuthorSettingHandler(
                            "textColorCss",
                            value
                        );
                    });
                }).descEl.innerHTML = `
                    The CSS color of the gutter text.<br/>
                    
                    It is higly recommended to use
                    <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties">
                    CSS variables</a>
                    defined by themes
                    (e.g. <pre style="display:inline">var(--text-muted)</pre> or
                    <pre style="display:inline">var(--text-on-accent)</pre>,
                    because they automatically adapt to theme changes.<br/>

                    See: <a href="https://github.com/obsidian-community/obsidian-theme-template/blob/main/obsidian.css">
                    List of available CSS variables in Obsidian
                    <a/>
                `;

            new Setting(this.containerEl)
                .setName("忽略更改中的空格和换行符")
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.ignoreWhitespace);
                    tgl.onChange((value) =>
                        this.lineAuthorSettingHandler("ignoreWhitespace", value)
                    );
                }).descEl.innerHTML = `
                    Whitespace and newlines are interpreted as
                    part of the document and in changes
                    by default (hence not ignored).
                    This makes the last line being shown as 'changed'
                    when a new subsequent line is added,
                    even if the previously last line's text is the same.
                    <br>
                    If you don't care about purely-whitespace changes
                    (e.g. list nesting / quote indentation changes),
                    then activating this will provide more meaningful change detection.
                `;
        }
    }

    private createColorSetting(which: "oldest" | "newest") {
        const setting = new Setting(this.containerEl)
            .setName("")
            .addText((text) => {
                const color = pickColor(which, this.settings.lineAuthor);
                const defaultColor = pickColor(
                    which,
                    DEFAULT_SETTINGS.lineAuthor
                );
                text.setPlaceholder(rgbToString(defaultColor));
                text.setValue(rgbToString(color));
                text.onChange(async (colorNew) => {
                    const rgb = convertToRgb(colorNew);
                    if (rgb !== undefined) {
                        const key =
                            which === "newest" ? "colorNew" : "colorOld";
                        await this.lineAuthorSettingHandler(key, rgb);
                    }
                    this.refreshColorSettingsDesc(which, rgb);
                });
            });
        this.lineAuthorColorSettings.set(which, setting);

        this.refreshColorSettingsName(which);
        this.refreshColorSettingsDesc(
            which,
            pickColor(which, this.settings.lineAuthor)
        );
    }

    private refreshColorSettingsName(which: "oldest" | "newest") {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            const whichDescriber =
                which === "oldest"
                    ? `oldest (${this.settings.lineAuthor.coloringMaxAge} or older)`
                    : "newest";
            settingsDom.nameEl.innerText = `Color for ${whichDescriber} commits`;
        }
    }

    private refreshColorSettingsDesc(which: "oldest" | "newest", rgb?: RGB) {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            settingsDom.descEl.innerHTML = this.colorSettingPreviewDescHtml(
                which,
                this.settings.lineAuthor,
                rgb !== undefined
            );
        }
    }

    private colorSettingPreviewDescHtml(
        which: "oldest" | "newest",
        laSettings: LineAuthorSettings,
        colorIsValid: boolean
    ): string {
        const rgbStr = colorIsValid
            ? previewColor(which, laSettings)
            : `rgba(127,127,127,0.3)`;
        const today = moment.unix(moment.now() / 1000).format("YYYY-MM-DD");
        const text = colorIsValid
            ? `abcdef Author Name ${today}`
            : "invalid color";
        const preview = `<div
            class="line-author-settings-preview"
            style="background-color: ${rgbStr}; width: 30ch;"
            >${text}</div>`;

        return `Supports 'rgb(r,g,b)', 'hsl(h,s,l)', hex (#) and
            named colors (e.g. 'black', 'purple'). Color preview: ${preview}`;
    }

    private previewCustomDateTimeDescriptionHtml(
        dateTimeFormatCustomString: string
    ) {
        const formattedDateTime = moment().format(dateTimeFormatCustomString);
        return `<a href="${FORMAT_STRING_REFERENCE_URL}">Format string</a> to display the authoring date.</br>Currently: ${formattedDateTime}`;
    }

    private previewOldestAgeDescriptionHtml(coloringMaxAge: string) {
        const duration = parseColoringMaxAgeDuration(coloringMaxAge);
        const durationString =
            duration !== undefined ? `${duration.asDays()} days` : "invalid!";
        return [
            `The oldest age in the line author coloring. Everything older will have the same color.
            </br>Smallest valid age is "1d". Currently: ${durationString}`,
            duration,
        ] as const;
    }
}

export function pickColor(
    which: "oldest" | "newest",
    las: LineAuthorSettings
): RGB {
    return which === "oldest" ? las.colorOld : las.colorNew;
}

export function parseColoringMaxAgeDuration(
    durationString: string
): moment.Duration | undefined {
    // https://momentjs.com/docs/#/durations/creating/
    const duration = moment.duration("P" + durationString.toUpperCase());
    return duration.isValid() && duration.asDays() && duration.asDays() >= 1
        ? duration
        : undefined;
}
