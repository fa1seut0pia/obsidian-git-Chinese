import type { App, RGB, TextComponent } from "obsidian";
import {
    moment,
    Notice,
    Platform,
    PluginSettingTab,
    Setting,
    TextAreaComponent,
} from "obsidian";
import {
    DATE_TIME_FORMAT_SECONDS,
    DEFAULT_SETTINGS,
    GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH,
} from "src/constants";
import { IsomorphicGit } from "src/gitManager/isomorphicGit";
import { SimpleGit } from "src/gitManager/simpleGit";
import { previewColor } from "src/editor/lineAuthor/lineAuthorProvider";
import type {
    LineAuthorDateTimeFormatOptions,
    LineAuthorDisplay,
    LineAuthorFollowMovement,
    LineAuthorSettings,
    LineAuthorTimezoneOption,
} from "src/editor/lineAuthor/model";
import type ObsidianGit from "src/main";
import type {
    ObsidianGitSettings,
    MergeStrategy,
    ShowAuthorInHistoryView,
    SyncMethod,
} from "src/types";
import { convertToRgb, formatMinutes, rgbToString } from "src/utils";

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

    icon = "git-pull-request";

    private get settings() {
        return this.plugin.settings;
    }

    display(): void {
        const { containerEl } = this;
        const plugin: ObsidianGit = this.plugin;

        let commitOrSync: string;
        if (plugin.settings.differentIntervalCommitAndPush) {
            commitOrSync = "commit";
        } else {
            commitOrSync = "commit-and-sync";
        }

        const gitReady = plugin.gitReady;

        containerEl.empty();
        if (!gitReady) {
            containerEl.createEl("p", {
                text: "Git 尚未就绪。当所有设置都正确时，你可以配置 commit-sync 等功能。",
            });
            containerEl.createEl("br");
        }

        let setting: Setting;
        if (gitReady) {
            new Setting(containerEl).setName("Automatic").setHeading();
            new Setting(containerEl)
                .setName("为自动提交和同步设置独立定时器")
                .setDesc("启用后可以为提交和同步设置不同的时间间隔。")
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
                            this.refreshDisplayWithDelay();
                        })
                );

            new Setting(containerEl)
                .setName(`自动 ${commitOrSync} 间隔（分钟）`)
                .setDesc(
                    `每 X 分钟${
                        plugin.settings.differentIntervalCommitAndPush
                            ? "提交"
                            : "提交并同步"
                    }更改。设置为 0（默认）以禁用。（请参阅下面的设置进行进一步配置！）`
                )
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoSaveInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoSaveInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoSaveInterval = Number(value);
                        } else {
                            plugin.settings.autoSaveInterval =
                                DEFAULT_SETTINGS.autoSaveInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("commit");
                    });
                });

            setting = new Setting(containerEl)
                .setName(`停止编辑文件后自动 ${commitOrSync}`)
                .setDesc(
                    `要求 ${commitOrSync} 间隔不为 0。
                        启用后，在停止编辑文件后每 ${formatMinutes(
                            plugin.settings.autoSaveInterval
                        )} 执行一次自动 ${commitOrSync}。
                        这还可以防止在编辑文件时自动 ${commitOrSync}。如果关闭，则与最后一次文件编辑无关。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoBackupAfterFileChange)
                        .onChange(async (value) => {
                            plugin.settings.autoBackupAfterFileChange = value;
                            this.refreshDisplayWithDelay();

                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.setLastSaveToLastCommit
            );

            setting = new Setting(containerEl)
                .setName(`在最新提交后自动 ${commitOrSync}`)
                .setDesc(
                    `如果启用，将上次自动 ${commitOrSync} 的时间戳设置为最新提交的时间戳。这可以减少手动提交后自动 ${commitOrSync} 的频率。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.setLastSaveToLastCommit)
                        .onChange(async (value) => {
                            plugin.settings.setLastSaveToLastCommit = value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                            this.refreshDisplayWithDelay();
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.autoBackupAfterFileChange
            );

            setting = new Setting(containerEl)
                .setName(`自动推送间隔（分钟）`)
                .setDesc("每 X 分钟推送提交。设置为 0（默认）以禁用。")
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPushInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoPushInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPushInterval = Number(value);
                        } else {
                            plugin.settings.autoPushInterval =
                                DEFAULT_SETTINGS.autoPushInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("push");
                    });
                });
            this.mayDisableSetting(
                setting,
                !plugin.settings.differentIntervalCommitAndPush
            );

            new Setting(containerEl)
                .setName("自动拉取间隔（分钟）")
                .setDesc("每 X 分钟拉取更改。设置为 0（默认）以禁用。")
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPullInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoPullInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPullInterval = Number(value);
                        } else {
                            plugin.settings.autoPullInterval =
                                DEFAULT_SETTINGS.autoPullInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("pull");
                    });
                });

            new Setting(containerEl)
                .setName(`自动 ${commitOrSync} 仅已暂存文件`)
                .setDesc(
                    `如果启用，${commitOrSync} 时只提交已暂存的文件。如果关闭，则提交所有更改的文件。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoCommitOnlyStaged)
                        .onChange(async (value) => {
                            plugin.settings.autoCommitOnlyStaged = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(`自动 ${commitOrSync} 时指定自定义提交消息`)
                .setDesc("你将收到一个弹窗来输入你的消息。")
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.customMessageOnAutoBackup)
                        .onChange(async (value) => {
                            plugin.settings.customMessageOnAutoBackup = value;
                            await plugin.saveSettings();
                            this.refreshDisplayWithDelay();
                        })
                );

            setting = new Setting(containerEl)
                .setName(`自动 ${commitOrSync} 时的提交消息`)
                .setDesc(
                    "可用占位符：{{date}}" +
                        "（见下文），{{hostname}}（见下文），{{numFiles}}（提交中更改的文件数）和 {{files}}（提交消息中更改的文件）。"
                )
                .addTextArea((text) => {
                    text.setPlaceholder(
                        DEFAULT_SETTINGS.autoCommitMessage
                    ).onChange(async (value) => {
                        if (value === "") {
                            plugin.settings.autoCommitMessage =
                                DEFAULT_SETTINGS.autoCommitMessage;
                        } else {
                            plugin.settings.autoCommitMessage = value;
                        }
                        await plugin.saveSettings();
                    });
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoCommitMessage",
                    });
                });
            this.mayDisableSetting(
                setting,
                plugin.settings.customMessageOnAutoBackup
            );

            new Setting(containerEl).setName("提交消息").setHeading();

            const manualCommitMessageSetting = new Setting(containerEl)
                .setName("手动提交时的提交消息")
                .setDesc(
                    "可用占位符：{{date}}" +
                        "（见下文），{{hostname}}（见下文），{{numFiles}}（提交中更改的文件数）和 {{files}}（提交消息中更改的文件）。留空以要求每次提交时手动输入。"
                );
            manualCommitMessageSetting.addTextArea((text) => {
                manualCommitMessageSetting.addButton((button) => {
                    button
                        .setIcon("reset")
                        .setTooltip(
                            `Set to default: "${DEFAULT_SETTINGS.commitMessage}"`
                        )
                        .onClick(() => {
                            text.setValue(DEFAULT_SETTINGS.commitMessage);
                            text.onChanged();
                        });
                });
                text.setValue(plugin.settings.commitMessage);
                text.onChange(async (value) => {
                    plugin.settings.commitMessage = value;
                    await plugin.saveSettings();
                });
            });

            if (Platform.isDesktopApp)
                new Setting(containerEl)
                    .setName("提交消息脚本")
                    .setDesc(
                        "一个通过 'sh -c' 运行的脚本，用于生成提交信息。该脚本可用于借助 AI 工具生成提交信息。可用的占位符包括：{{hostname}}、{{date}}。"
                    )
                    .addText((text) => {
                        text.onChange(async (value) => {
                            if (value === "") {
                                plugin.settings.commitMessageScript =
                                    DEFAULT_SETTINGS.commitMessageScript;
                            } else {
                                plugin.settings.commitMessageScript = value;
                            }
                            await plugin.saveSettings();
                        });
                        this.setNonDefaultValue({
                            text,
                            settingsProperty: "commitMessageScript",
                        });
                    });

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
            Specify custom date format. E.g. "${DATE_TIME_FORMAT_SECONDS}. See <a href="https://momentjs.com">Moment.js</a> for more formats.`;

            new Setting(containerEl)
                .setName("{{hostname}} 占位符替换")
                .setDesc(
                    "为每台设备指定自定义主机名。如果在桌面端未设置，则默认为操作系统主机名。"
                )
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
                .setName("在提交正文中列出提交影响的文件")
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
                    .setDesc("决定如何将远程分支的提交集成到你的本地分支。")
                    .addDropdown((dropdown) => {
                        const options: Record<SyncMethod, string> = {
                            merge: "合并",
                            rebase: "变基",
                            reset: "其他同步服务（仅更新 HEAD，不触及工作目录）",
                        };
                        dropdown.addOptions(options);
                        dropdown.setValue(plugin.settings.syncMethod);

                        dropdown.onChange(async (option: SyncMethod) => {
                            plugin.settings.syncMethod = option;
                            await plugin.saveSettings();
                        });
                    });

            new Setting(containerEl)
                .setName("冲突时的合并策略")
                .setDesc(
                    "决定拉取远程更改时如何解决冲突。可用于自动 favor 你的本地更改或远程更改。"
                )
                .addDropdown((dropdown) => {
                    const options: Record<MergeStrategy, string> = {
                        none: "无（git 默认）",
                        ours: "我们的更改",
                        theirs: "他们的更改",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.mergeStrategy);

                    dropdown.onChange(async (option: MergeStrategy) => {
                        plugin.settings.mergeStrategy = option;
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
                .setName("Commit-and-sync")
                .setDesc(
                    "默认设置下，commit-and-sync 意味着暂存所有内容 -> 提交 -> 拉取 -> 推送。理想情况下，这是一个你定期执行以保持本地和远程仓库同步的单一操作。"
                )
                .setHeading();

            setting = new Setting(containerEl)
                .setName("在 commit-and-sync 时推送")
                .setDesc(
                    `大多数情况下，你可能想在提交后推送。关闭此选项会将 commit-and-sync 操作转变为仅提交 ${plugin.settings.pullBeforePush ? "和拉取 " : ""}。它仍然被称为 commit-and-sync。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(!plugin.settings.disablePush)
                        .onChange(async (value) => {
                            plugin.settings.disablePush = !value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName("在 commit-and-sync 时拉取")
                .setDesc(
                    `在 commit-and-sync 时，也拉取提交。关闭此选项会将 commit-and-sync 操作转变为仅提交 ${plugin.settings.disablePush ? "" : "和推送 "}。`
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.pullBeforePush)
                        .onChange(async (value) => {
                            plugin.settings.pullBeforePush = value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            if (plugin.gitManager instanceof SimpleGit) {
                new Setting(containerEl)
                    .setName("Hunk 管理")
                    .setDesc("Hunk 是编辑器中直接显示的 grouped 行更改的块。")
                    .setHeading();

                new Setting(containerEl)
                    .setName("标记")
                    .setDesc(
                        "这允许你通过彩色标记在编辑器中查看你的更改，并单独暂存/重置/预览单个 hunk。"
                    )
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.hunks.showSigns)
                            .onChange(async (value) => {
                                plugin.settings.hunks.showSigns = value;
                                await plugin.saveSettings();
                                plugin.editorIntegration.refreshSignsSettings();
                            })
                    );

                new Setting(containerEl)
                    .setName("Hunk 命令")
                    .setDesc(
                        "添加命令来单独暂存/重置 Git diff hunk，并通过'转到下一个/上一个 hunk'命令在它们之间导航。"
                    )
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.hunks.hunkCommands)
                            .onChange(async (value) => {
                                plugin.settings.hunks.hunkCommands = value;
                                await plugin.saveSettings();

                                plugin.editorIntegration.refreshSignsSettings();
                            })
                    );

                new Setting(containerEl)
                    .setName("状态栏显示行更改摘要")
                    .addDropdown((toggle) =>
                        toggle
                            .addOptions({
                                disabled: "已禁用",
                                colored: "彩色",
                                monochrome: "单色",
                            })
                            .setValue(plugin.settings.hunks.statusBar)
                            .onChange(
                                async (
                                    option: ObsidianGitSettings["hunks"]["statusBar"]
                                ) => {
                                    plugin.settings.hunks.statusBar = option;
                                    await plugin.saveSettings();
                                    plugin.editorIntegration.refreshSignsSettings();
                                }
                            )
                    );

                new Setting(containerEl).setName("行作者信息").setHeading();

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
                    full: "完整",
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
                "在历史视图中显示提交的日期。使用 {{date}} 占位符格式来显示日期。"
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
            .setName("文件更改时自动刷新源代码控制视图")
            .setDesc(
                "在较慢的机器上，这可能导致卡顿。如果是这样，只需禁用此选项。"
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
            .setName("源代码控制视图刷新间隔")
            .setDesc("文件更改后刷新源代码控制视图的毫秒数。")
            .addText((text) => {
                const MIN_SOURCE_CONTROL_REFRESH_INTERVAL = 500;
                text.inputEl.type = "number";
                this.setNonDefaultValue({
                    text,
                    settingsProperty: "refreshSourceControlTimer",
                });
                text.setPlaceholder(
                    String(DEFAULT_SETTINGS.refreshSourceControlTimer)
                );
                text.onChange(async (value) => {
                    // Without this check, if the textbox is empty or the input is invalid, MIN_SOURCE_CONTROL_REFRESH_INTERVAL would be saved instead of saving the default value.
                    if (value !== "" && Number.isInteger(Number(value))) {
                        plugin.settings.refreshSourceControlTimer = Math.max(
                            Number(value),
                            MIN_SOURCE_CONTROL_REFRESH_INTERVAL
                        );
                    } else {
                        plugin.settings.refreshSourceControlTimer =
                            DEFAULT_SETTINGS.refreshSourceControlTimer;
                    }
                    await plugin.saveSettings();
                    plugin.setRefreshDebouncer();
                });
            });
        new Setting(containerEl).setName("杂项").setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName("差异视图样式")
                .setDesc(
                    '设置差异视图的样式。请注意，"Split"模式中的实际差异不是由 Git 生成的，而是由编辑器本身生成的，所以它可能与 Git 生成的差异不同。一个优点是你可以在该视图中编辑文本。'
                )
                .addDropdown((dropdown) => {
                    const options: Record<
                        ObsidianGitSettings["diffStyle"],
                        string
                    > = {
                        split: "Split",
                        git_unified: "Unified",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.diffStyle);
                    dropdown.onChange(
                        async (option: ObsidianGitSettings["diffStyle"]) => {
                            plugin.settings.diffStyle = option;
                            await plugin.saveSettings();
                        }
                    );
                });
        }

        new Setting(containerEl)
            .setName("禁用信息性通知")
            .setDesc(
                "禁用 git 操作的信息性通知以最小化干扰（请参考状态栏获取更新）。"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.disablePopups)
                    .onChange(async (value) => {
                        plugin.settings.disablePopups = value;
                        this.refreshDisplayWithDelay();
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("禁用错误通知")
            .setDesc(
                "禁用所有类型的错误通知以最小化干扰（请参考状态栏获取更新）。"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(!plugin.settings.showErrorNotices)
                    .onChange(async (value) => {
                        plugin.settings.showErrorNotices = !value;
                        await plugin.saveSettings();
                    })
            );

        if (!plugin.settings.disablePopups)
            new Setting(containerEl)
                .setName("隐藏无更改通知")
                .setDesc("当没有可提交或推送的更改时，不显示通知。")
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
            .setDesc("Obsidian 必须重启才能使更改生效。")
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("文件菜单集成")
            .setDesc(
                `在文件菜单中添加"暂存"、"取消暂存"和"添加到 .gitignore"操作。`
            )
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
            .setDesc("Obsidian 必须重启才能使更改生效。")
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
            new Setting(containerEl).setName("身份验证/提交作者").setHeading();
        } else {
            new Setting(containerEl).setName("提交作者").setHeading();
        }

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName(
                    "你的 git 服务器上的用户名。例如 GitHub 上的你的用户名"
                )
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getUsername() ?? "");
                    cb.onChange((value) => {
                        plugin.localStorage.setUsername(value);
                    });
                });

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName("密码/个人访问令牌")
                .setDesc("输入你的密码。你将无法再次看到它。")
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
                .setName("提交的作者名称")
                .addText(async (cb) => {
                    cb.setValue(
                        (await plugin.gitManager.getConfig("user.name")) ?? ""
                    );
                    cb.onChange(async (value) => {
                        await plugin.gitManager.setConfig(
                            "user.name",
                            value == "" ? undefined : value
                        );
                    });
                });

        if (plugin.gitReady)
            new Setting(containerEl)
                .setName("提交的作者邮箱")
                .addText(async (cb) => {
                    cb.setValue(
                        (await plugin.gitManager.getConfig("user.email")) ?? ""
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
            .setDesc("这些设置通常不需要更改，但可能在特殊设置中需要。")
            .setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName("更新子模块")
                .setDesc(
                    '"Commit-and-sync"和"拉取"会处理子模块。缺少的功能：冲突文件，拉取/推送/提交的文件数。每个子模块都需要设置跟踪分支。'
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
                    .setName("子模块递归检出/切换")
                    .setDesc(
                        "当根仓库发生检出时，在子模块上递归检出（如果分支存在）。"
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
                .setDesc(
                    "指定 Git 二进制/可执行文件的路径。Git 应该已经在你的 PATH 中。只应在自定义 Git 安装时才需要。"
                )
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
                .setName("额外的环境变量")
                .setDesc("每行一个环境变量，格式为 KEY=VALUE。")
                .addTextArea((cb) => {
                    cb.setPlaceholder("GIT_DIR=/path/to/git/dir");
                    cb.setValue(plugin.localStorage.getEnvVars().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setEnvVars(value.split("\n"));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("额外的 PATH 环境变量路径")
                .setDesc("每行一个路径")
                .addTextArea((cb) => {
                    cb.setValue(plugin.localStorage.getPATHPaths().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setPATHPaths(value.split("\n"));
                    });
                });
        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName("使用新的环境变量重新加载")
                .setDesc("之前添加的环境变量在 Obsidian 重启前不会生效。")
                .addButton((cb) => {
                    cb.setButtonText("Reload");
                    cb.setCta();
                    cb.onClick(async () => {
                        await (plugin.gitManager as SimpleGit).setGitInstance();
                    });
                });

        new Setting(containerEl)
            .setName("自定义基础路径（Git 仓库路径）")
            .setDesc(
                `
            设置相对于 vault 的路径，Git 二进制文件将从该路径执行。
             主要用于设置 Git 仓库的路径，仅在 Git 仓库位于 vault 根目录下方时才需要。在 Windows 上使用 "\\" 而不是 "/"。
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
            .setName("自定义 Git 目录路径（代替 '.git'）")
            .setDesc(
                `对应于 GIT_DIR 环境变量。需要重启 Obsidian 才能生效。在 Windows 上使用 "\\" 而不是 "/"。`
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
                        new Notice("Obsidian 必须重启才能使更改生效。");
                    })
            );

        new Setting(containerEl).setName("支持").setHeading();
        new Setting(containerEl)
            .setName("捐赠")
            .setDesc("如果你喜欢这个插件，可以考虑捐款来支持持续开发。")
            .addButton((bt) => {
                bt.buttonEl.outerHTML =
                    "<a href='https://ko-fi.com/F1F195IQ5' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>";
            });

        const debugDiv = containerEl.createDiv();
        debugDiv.setAttr("align", "center");
        debugDiv.setAttr("style", "margin: var(--size-4-2)");

        const debugButton = debugDiv.createEl("button");
        debugButton.setText("Copy Debug Information");
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
            new Notice("调试信息已复制到剪贴板。可能包含敏感信息！");
        };

        if (Platform.isDesktopApp) {
            const info = containerEl.createDiv();
            info.setAttr("align", "center");
            info.setText(
                "调试和日志记录：\n你总是可以通过打开控制台来查看此插件和其他插件的日志"
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

        if (show) this.plugin.editorIntegration.activateLineAuthoring();
        else this.plugin.editorIntegration.deactiveLineAuthoring();
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
        this.plugin.editorIntegration.lineAuthoringFeature.refreshLineAuthorViews();
    }

    /**
     * Ensure, that certain last shown values are persistent in the settings.
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
            "在每行旁边显示提交作者信息"
        );

        if (
            !this.plugin.editorIntegration.lineAuthoringFeature.isAvailableOnCurrentPlatform()
        ) {
            baseLineAuthorInfoSetting
                .setDesc("目前仅在桌面端可用。")
                .setDisabled(true);
        }

        baseLineAuthorInfoSetting.descEl.innerHTML = `
            <a href="${LINE_AUTHOR_FEATURE_WIKI_LINK}">Feature guide and quick examples</a></br>
            The commit hash, author name and authoring date can all be individually toggled.</br>Hide everything, to only show the age-colored sidebar.`;

        baseLineAuthorInfoSetting.addToggle((toggle) =>
            toggle.setValue(this.settings.lineAuthor.show).onChange((value) => {
                this.configureLineAuthorShowStatus(value);
                this.refreshDisplayWithDelay();
            })
        );

        if (this.settings.lineAuthor.show) {
            const trackMovement = new Setting(this.containerEl)
                .setName("跟踪跨文件和提交的移动和复制")
                .setDesc("")
                .addDropdown((dropdown) => {
                    dropdown.addOptions(<
                        Record<LineAuthorFollowMovement, string>
                    >{
                        inactive: "不跟踪（默认）",
                        "same-commit": "在同一提交内跟踪",
                        "all-commits": "在所有提交内跟踪（可能较慢）",
                    });
                    dropdown.setValue(this.settings.lineAuthor.followMovement);
                    dropdown.onChange((value: LineAuthorFollowMovement) =>
                        this.lineAuthorSettingHandler("followMovement", value)
                    );
                });
            trackMovement.descEl.innerHTML = `
                By default (deactivated), each line only shows the newest commit where it was changed.
                <br/>
                With <i>same commit</i>, cut-copy-paste-ing of text is followed within the same commit and the original commit of authoring will be shown.
                <br/>
                With <i>all commits</i>, cut-copy-paste-ing text inbetween multiple commits will be detected.
                <br/>
                It uses <a href="https://git-scm.com/docs/git-blame">git-blame</a> and
                for matches (at least ${GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH} characters) within the same (or all) commit(s), <em>the originating</em> commit's information is shown.`;

            new Setting(this.containerEl)
                .setName("显示提交哈希")
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.showCommitHash);
                    tgl.onChange((value: boolean) =>
                        this.lineAuthorSettingHandler("showCommitHash", value)
                    );
                });

            new Setting(this.containerEl)
                .setName("作者名称显示")
                .setDesc("是否以及如何显示作者")
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorDisplay, string> = {
                        hide: "隐藏",
                        initials: "姓名缩写（默认）",
                        "first name": "名字",
                        "last name": "姓氏",
                        full: "全名",
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(this.settings.lineAuthor.authorDisplay);

                    dropdown.onChange(async (value: LineAuthorDisplay) =>
                        this.lineAuthorSettingHandler("authorDisplay", value)
                    );
                });

            new Setting(this.containerEl)
                .setName("作者时间显示")
                .setDesc("是否以及如何显示行的编写日期和时间")
                .addDropdown((dropdown) => {
                    const options: Record<
                        LineAuthorDateTimeFormatOptions,
                        string
                    > = {
                        hide: "隐藏",
                        date: "日期（默认）",
                        datetime: "日期和时间",
                        "natural language": "自然语言",
                        custom: "自定义",
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
                            this.refreshDisplayWithDelay();
                        }
                    );
                });

            if (this.settings.lineAuthor.dateTimeFormatOptions === "custom") {
                const dateTimeFormatCustomStringSetting = new Setting(
                    this.containerEl
                );

                dateTimeFormatCustomStringSetting
                    .setName("自定义作者日期格式")
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
                .setName("作者时间显示时区")
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorTimezoneOption, string> = {
                        "viewer-local": "我的本地（默认）",
                        "author-local": "作者的本地",
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
                "着色中的最老年龄"
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

                    It is highly recommended to use
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
                .setName("在更改中忽略空格和换行")
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

    /**
     * Sets the value in the textbox for a given setting only if the saved value differs from the default value.
     * If the saved value is the default value, it probably wasn't defined by the user, so it's better to display it as a placeholder.
     */
    private setNonDefaultValue({
        settingsProperty,
        text,
    }: {
        settingsProperty: keyof ObsidianGitSettings;
        text: TextComponent | TextAreaComponent;
    }): void {
        const storedValue = this.plugin.settings[settingsProperty];
        const defaultValue = DEFAULT_SETTINGS[settingsProperty];

        if (defaultValue !== storedValue) {
            // Doesn't add "" to saved strings
            if (
                typeof storedValue === "string" ||
                typeof storedValue === "number" ||
                typeof storedValue === "boolean"
            ) {
                text.setValue(String(storedValue));
            } else {
                text.setValue(JSON.stringify(storedValue));
            }
        }
    }

    /**
     * Delays the update of the settings UI.
     * Used when the user toggles one of the settings that control enabled states of other settings. Delaying the update
     * allows most of the toggle animation to run, instead of abruptly jumping between enabled/disabled states.
     */
    private refreshDisplayWithDelay(timeout = 80): void {
        setTimeout(() => this.display(), timeout);
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
