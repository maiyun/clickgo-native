# ClickGo Native

<p align="center"><img src="../dist/icon.png" width="100" height="100" alt="ClickGo Native"></p>
<p align="center">
    <a href="https://github.com/maiyun/clickgo-native/blob/master/LICENSE">
        <img alt="许可证" src="https://img.shields.io/github/license/maiyun/clickgo-native?color=blue" />
    </a>
    <a href="https://www.npmjs.com/package/clickgo-native">
        <img alt="NPM 稳定版本" src="https://img.shields.io/npm/v/clickgo-native?color=brightgreen&logo=npm" />
    </a>
    <a href="https://github.com/maiyun/clickgo-native/releases">
        <img alt="GitHub 发布版本" src="https://img.shields.io/github/v/release/maiyun/clickgo-native?color=brightgreen&logo=github" />
    </a>
    <a href="https://github.com/maiyun/clickgo-native/issues">
        <img alt="GitHub 问题" src="https://img.shields.io/github/issues/maiyun/clickgo-native?color=blue" />
    </a>
</p>

[English](../README.md)

使用 ClickGo 开发的软件可以在 Windows、macOS 和 Linux 中运行。

## 安装

可以直接通过 NPM 安装：

```sh
$ npm i clickgo-native --save
```

这是开发者安装的依赖。最终用户安装你打包好的软件即可，不需要额外安装 Node.js 或全局安装 clickgo-native。

**Native 主进程**

```typescript
import * as native from 'clickgo-native';
class Boot extends native.AbstractBoot {
    public onOpenFiles(paths: string[]): void {
        console.log(paths);
    }

    public main(): void {
        this.run(native.path(import.meta.url, './index.html'), {
            'frame': false,
            'icon': native.path(import.meta.url, './logo.png'),
        });
    }
}
native.launcher(new Boot(), {
    'openFiles': true,
    'singleInstance': true,
});
```

`launcher()` 在 Electron 就绪前配置进程行为。`openFiles` 将文件关联、命令行启动和拖入窗口所接收到的文件转发给 `onOpenFiles()`。`singleInstance` 防止应用重复启动进程，并在另一个实例启动时激活现有窗口。这两个选项相互独立，可以按需分别启用。

`launcher()` 同时提供软件的 [CLI 与 stdio 模式](#cli-与-stdio-mcp)。业务启动逻辑放在 `Boot.main()` 中，stdio 的 stdout 专用于 MCP。

`icon` 用于设置 Windows 和 Linux 的原生窗口图标，需要将图标文件包含在应用的打包文件中；安装后的应用列表图标则由 `build.linux.icon` 单独配置。通过 ClickGo Compiler 打包时，将 `build.linux.icon` 设置为一张至少 256×256 像素的正方形 PNG，建议使用 512×512 或 1024×1024。编译器会在临时目录中自动生成 Linux 所需的标准尺寸图标，打包后清理临时文件，不修改源图片或配置。原有的多尺寸 PNG 目录仍然受支持。还应配置应用的 `desktopName` 和 `build.linux.syncDesktopName: true`，将运行中的窗口与桌面入口关联。

对于无边框的 ClickGo 应用，首个 Form 会将 `minWidth` 和 `minHeight` 同步到原生窗口，之后修改这些值也会同步。系统关闭请求（例如 Alt+F4）会转发到该 Form 的 `close` 事件。如需显示异步的 ClickGo 确认界面，应先同步调用 `event.preventDefault()`，确认后再关闭 Form。显式调用 `native.close()` 或 `native.quit()` 表示已经授权的最终关闭操作，不会再次触发确认。使用这些联动功能时，需要同时更新 ClickGo 运行时和 ClickGo Native。

## 软件更新

主进程用 `native.launcher(new Boot(), { updates: true })` 显式启用，默认 false。更新源来自软件 `build.publish`，业务不注册更新 IPC，也不传入 URL。`electron-updater` 是 Native 的运行依赖，仅在已启用、已安装的 GUI 软件中延迟加载；开发和 Windows portable 返回 `disabled`。

App/Form 使用 `clickgo.native.checkUpdates(this)`、`downloadUpdate(this)`、`installUpdate(this)` 和 `getUpdateState(this)`，要求 root；无权限/任务失效返回 false，网页/旧宿主返回 null，其余返回 `IUpdateState`。通过 `onUpdateState(this, handler)` 监听状态及下载进度，不要求 root，Form/Task 销毁时自动清理。主进程从 clickgo-native 使用同名接口，`onUpdateState(handler)` 返回取消订阅函数。公开状态不含 URL、凭据和安装路径。

检测与下载合并并发请求，下载后固定安装版本；失败的下载不能安装。不自动下载或退出时安装，业务须在下载前确认，在安装前保存文档并确认重启。`restarting` 表示已启动安装器；后续 `errorCode: 'install-failed'` 恢复关闭确认，App 应恢复编辑和重试。下载进度的 percent 为 0–100，transferred/total 为字节，bytesPerSecond 为字节/秒。实际平台安装仍须发布验收。

GitHub 配置示例：

```json
{ "build": { "publish": { "provider": "github", "owner": "YOUR_OWNER", "repo": "YOUR_REPO" } } }
```

网站使用 `{ "provider": "generic", "url": "https://updates.example.com/app/" }`。上传安装包、生成的平台元数据 `latest*.yml` 及辅助文件；generic 由发布方自行上传，macOS 需要签名和 ZIP。配置与发布要求见 [electron-builder 更新文档](https://www.electron.build/docs/features/auto-update/)。

## 将 ClickGo 应用打包为原生软件

使用 ClickGo Compiler 运行和打包时，应用项目无需直接安装 `electron`，编译器会提供 Electron 运行环境。Native 主进程可以通过 `native.getAppVersion()` 读取应用 `package.json` 中的版本，通过 `native.isPackaged()` 区分已打包的软件和开发运行。这些 API 不会将 Electron 暴露给 HTML 页面。

构建桌面软件分为两步：先将 ClickGo 应用编译为 `.cga` 文件，再使用 Electron 打包 Native 项目。

首先全局安装编译器：

```sh
$ npm i -g clickgo-compiler
```

可以从以下目录结构开始。本仓库的 `dist/test` 目录提供了完整的运行示例。

```text
package.json
tsconfig.json
dist/
  index.ts
  index.html
  browser.ts
  app/
    app.ts
    config.json
    form/
```

项目的 `package.json` 必须将编译后的 Native 入口设为 `main`：

```json
{
    "type": "module",
    "main": "dist/index.js"
}
```

Native 页面需要提供 ClickGo 运行时，并加载编译后的浏览器入口：

```html
<script type="importmap">
{
    "imports": {
        "clickgo": "https://js.maiyun.net/npm/clickgo@7.0.0/dist/index.js"
    }
}
</script>
<script type="module" src="browser.js"></script>
```

将 ClickGo 应用源码编译为 `dist/app.cga`：

```sh
$ npx tsc
$ clickgo --app ./dist/app --save ./dist/app
```

在浏览器入口中加载生成的应用：

```typescript
import * as clickgo from 'clickgo';

class Boot extends clickgo.AbstractBoot {
    public async main(): Promise<void> {
        const taskId = await clickgo.task.run(this._sysId, 'app.cga', {
            'permissions': ['root'],
        });
        if (typeof taskId !== 'string') {
            console.error(`Load application failed (${taskId}).`);
            return;
        }
    }
}

await clickgo.launcher(new Boot());
```

直接运行 Native 项目，不生成安装包：

```sh
$ clickgo --run ./dist/index.js
```

在包含 `package.json` 的目录中执行以下命令，生成对应平台的安装包：

```sh
$ clickgo --native --platform win
$ clickgo --native --platform linux
$ clickgo --native --platform mac
```

构建 Linux 的 `rpm` 安装包时，需要在构建机器上安装 `rpmbuild`。Ubuntu 或 Debian 可以先执行：

```sh
$ sudo apt install rpm
```

其他 Linux 发行版通过系统包管理器安装提供 `rpmbuild` 的软件包。该工具用于 RPM 打包，AppImage 和 DEB 不需要它。

在中国大陆下载 Electron 时，可以启用镜像：

```sh
$ clickgo --native --platform win --mirror cn
```

`clickgo --app` 生成 ClickGo 的 `.cga` 应用，`clickgo --run` 仅启动 Native 项目进行测试，`clickgo --native` 调用 Electron Builder 生成桌面软件安装包。涉及平台专属签名或安装包工具时，应在目标操作系统上构建。

## 示例

克隆仓库，构建当前的 ClickGo 测试应用，再通过 Electron 运行：

```sh
$ npm i -g clickgo-compiler
$ npm install
$ npm run build
$ npm run native
```

## 持久存储

普通 JSON 配置使用 `native.storage.get/set/remove`，敏感字符串使用 `native.secret.get/set/remove`。数据保存在软件的用户数据目录，重启后保留。保存凭据前可用 `await native.secret.isAvailable()` 检查；安全存储不可用时不会退回明文。

读取时，未找到返回 `null`，失败返回 `false`；配置值包装为 `{ value }`，可区分实际保存的 `false` 和 `null`。ClickGo App 使用 `clickgo.native.storage` / `clickgo.native.secret`，首个参数传 `this`，无需 `root` 权限。在 App 的 `config.json` 中设置唯一 `id`，如 `net.example.app`，移动位置和升级时保持不变。同 ID 的实例共用存储，不同 ID 与宿主分开。App 共享宿主页面的信任范围，ID 用于数据分区；缺少或非法 ID 时存储读写返回 `false`。ClickGo Demo 的 **Library native** 提供示例。

## 本地 MCP

ClickGo Native 通过 Streamable HTTP、stdio MCP 和 CLI 开放 App 命令，与按钮和菜单共用执行逻辑。

先用 `clickgo.command.register()` 注册 App 命令并设置 `exposed: true`，界面操作调用 `clickgo.command.execute()`。完整示例见 [命令注册](mcp.sc.md#命令注册)。

### 启用服务

在 Native 主进程中创建窗口并启用 MCP：

```typescript
import * as native from 'clickgo-native';

class Boot extends native.AbstractBoot {
    public async main(): Promise<void> {
        this.run(native.path(import.meta.url, './index.html'), { 'frame': false });
        const info = await native.startMcp();
        if (info === false) {
            return;
        }
        // 通过应用的连接设置界面提供 info.url 和 info.token。
    }
}

native.launcher(new Boot(), { 'commandAutoStart': true });
```

`startMcp()` 选择本机回环端口并生成随机 token。launcher 选项允许 CLI/stdio 在需要时启动 GUI；省略它则只连接已经运行的 GUI。连接凭据应保持私密。

### 通过 HTTP 连接

将 `startMcp()` 返回的当前 URL 和 token 填入客户端连接设置：

```json
{
    "url": "<url-from-connection-settings>",
    "headers": { "Authorization": "Bearer <token>" }
}
```

MCP 客户端通过 `clickgo_list_apps` 发现 App，用 `clickgo_list_commands` 查看目标 App 的命令，再调用 `clickgo_execute_command`。将选中 App 的 `id` 作为 `taskId`，重启后重新发现；只有已公开且可用的命令能够执行。

## CLI 与 stdio MCP

这两种模式使用已安装软件的可执行文件和默认的本机实例发现，最终用户不需要额外安装 Node.js 或全局 npm 包。Windows 使用 `.exe`，macOS 使用 `.app/Contents/MacOS/` 内的可执行文件，Linux 使用二进制文件或 AppImage。

**stdio MCP**：对于使用 `mcpServers` 配置结构的客户端：

```json
{
    "mcpServers": {
        "my-software": {
            "command": "<absolute-path-to-installed-software>",
            "args": ["--mcp"]
        }
    }
}
```

**CLI**：先查看帮助和发现 App，以下以 Linux 为例：

```sh
./MySoftware --cli --help
./MySoftware --cli apps
```

### 生成 AI 接入说明

ClickGo App 或 Form 可以根据实际环境生成可分享的英文说明：

```typescript
const guide = await clickgo.command.getAgentGuide(this);
if (guide === null || guide === false) {
    return;
}
// 在应用的 AI 接入界面展示或复制 guide。
```

说明覆盖网页 JS/WebMCP、Native stdio/CLI 以及 HTTP 设置的获取方式，默认不含凭据和临时 App ID；`getAgentInfo(this)` 提供详细快照。

配置选项、凭据导出、多实例选择、取消和开发测试见 [MCP 与 CLI 接入指南](mcp.sc.md)。

## 许可证

本库基于 [Apache-2.0](../LICENSE) 许可证发布。
