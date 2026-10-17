# MCP 与 CLI 接入指南

[English](mcp.md) · [返回 README](README.sc.md#本地-mcp)

快速接入和客户端配置见 README。本指南提供完整命令示例和高级选项参考。

## 命令注册

在 ClickGo App 中为每个业务操作注册一次命令。设置 `exposed: true` 后，代理可以发现并执行；按钮和菜单调用同一个命令：

```typescript
import * as clickgo from 'clickgo';

export default class extends clickgo.form.AbstractForm {

    public value = 0;

    /**
     * --- 注册共享的业务命令 ---
     * @returns 无返回值
     */
    public onMounted(): void {
        const registered = clickgo.command.register<{ 'amount': number; }>(this, {
            'name': 'counter.add',
            'description': 'Increase this application counter and return its updated value.',
            'inputSchema': {
                'type': 'object',
                'properties': { 'amount': { 'type': 'integer', 'minimum': 1, 'maximum': 10 } },
                'required': ['amount'], 'additionalProperties': false,
            },
            'exposed': true,
            'annotations': { 'readOnlyHint': false, 'destructiveHint': false },
            'execute': (args) => {
                this.value += args['amount'];
                return clickgo.command.success({ 'value': this.value });
            },
        });
        if (!registered) {
            console.error('Command registration failed.');
            return;
        }
    }

    /**
     * --- 按钮和菜单调用同一个命令 ---
     * @returns 命令执行结果
     */
    public add(): Promise<clickgo.command.TResult> {
        return clickgo.command.execute(this, 'counter.add', { 'amount': 1 });
    }

}
```

模板按钮绑定 `@click="add"`。所有入口共用校验、权限和 App 状态；命令生命周期和浏览器接入见 [ClickGo 命令指南](https://github.com/maiyun/clickgo/blob/master/doc/sc/commands.md)。

## 服务配置

创建 Native 窗口后调用 `await native.startMcp(options)`，各选项均可省略：

| 选项 | 默认值 | 含义 |
|---|---|---|
| `port` | 系统分配 | 本机回环 HTTP 端口，范围 0–65535 |
| `token` | 随机生成 | Bearer token，由 32–256 个字母、数字、下划线或连字符组成 |
| `id` | 根据 Electron 用户数据目录生成 | 稳定的软件标识，如 `com.example.app` |
| `discovery` | `true` | 允许当前操作系统用户的 CLI/stdio 进程发现连接信息 |

应用通过[持久存储](README.sc.md#持久存储)保存所需配置。`startMcp()` 返回连接信息；参数无效、监听失败、窗口不存在或重复启动时返回 `false`。

| API | 调用位置 | 返回值 |
|---|---|---|
| `native.getMcpInfo()` | Native 主进程 | 当前连接设置的副本，未启用时为 `null` |
| `await clickgo.native.getMcpInfo(this)` | ClickGo App/Form | 要求已有 `root` 权限；被拒绝时为 `false`，未启用或不支持时为 `null` |
| `await native.stopMcp()` | Native 主进程 | 停止监听并取消正在进行的协议请求 |

关闭窗口会停止服务。使用返回的 URL 和 `Authorization: Bearer <token>` 连接，凭据应保持私密；云端客户端需要本地连接组件。

## App 与命令发现

`taskId` 表示软件内部的 App 实例。按下表顺序调用；目标有歧义时询问，重启或旧 ID 失效后重新发现。

| 工具 | 参数 | 返回值 |
|---|---|---|
| `clickgo_list_apps` | `{}` | `{ok, data: [{id, name}]}`；将选中项的 `id` 作为 `taskId` |
| `clickgo_list_commands` | `{ taskId }` | 公开命令名称、说明、schema、enabled 和 disabledReason |
| `clickgo_execute_command` | `{ taskId, name, args }` | `{ok, data}` 或 `{ok: false, error: {code, message}}` |

使用目标 App 中可用命令的名称和 inputSchema；服务会向客户端提供这些说明和规则。不要自动重试修改数据的命令；业务需配合 `context.signal` 停止执行，取消不会撤销已完成的修改。

## CLI 与 GUI 启动

可执行文件路径和 CLI/stdio 基本配置见 [README](README.sc.md#cli-与-stdio-mcp)。完整 CLI 流程如下：

```sh
./MySoftware --cli --help
./MySoftware --cli instances
./MySoftware --cli apps
./MySoftware --cli commands --app '<taskId>'
./MySoftware --cli execute --app '<taskId>' --name '<commandName>' --args '{"amount":2}'
```

结果以 JSON 输出，失败时使用非零退出状态。`--args-file <path>` 从文件读取 JSON，`--args-file -` 从 stdin 读取；SIGINT/SIGTERM 取消在途调用。多个软件实例时，将 `instances` 返回的 ID 作为 `--host '<instanceId>'` 传入 CLI 或 stdio args；这个软件实例 ID 与 taskId 不同。

在 `native.launcher()` 中设置 `commandAutoStart: true` 允许启动 GUI，默认 `false`。`Boot.main()` 须创建窗口并启用 MCP 和发现；需要 App 的请求共用启动过程，最多等待 20 秒，帮助、instances、握手和 tools/list 不启动 GUI。取消或超时只结束该请求的等待，后续请求继续等待同一 GUI，直到它退出；`singleInstance` 独立控制多个 GUI 实例。

业务启动逻辑放在 `Boot.main()`，模块导入和 Boot 构造方法不向 stdout 写日志。launcher 在 GUI 初始化前分流 CLI/stdio；stdio 进程在 stdin 关闭或收到退出信号时退出。

## 生成 AI 接入说明

生成说明的示例见 [README](README.sc.md#生成-ai-接入说明)，生成本身不启用服务。相关 API 如下：

| API | 返回值 |
|---|---|
| `await clickgo.command.getAgentGuide(this)` | 描述可用入口的英文 Markdown |
| `await clickgo.command.getAgentInfo(this)` | 结构化环境和 App 快照 |
| `native.getCommandEntry()` / `await clickgo.native.getCommandEntry()` | 不含 URL/token 的可执行文件入口和能力状态 |

说明默认不含临时 ID 和凭据。导出 HTTP 设置时，向 getAgentGuide/getAgentInfo 传入 `{ 'includeMcpCredentials': true }`，要求已有 `root` 权限；权限被拒绝返回 `false`，App 不可用返回 `null`。重启后重新生成凭据，网页公开方法不导出凭据。

迁移或重装后重新生成程序入口；startup 默认为 `existing`，开启 commandAutoStart 后为 `auto`，args 保留显式使用的沙箱选项；客户端须支持所选入口。

## 导出文件

App 使用 ClickGo 的 `context.createFile(blob, { fileName, mimeType? })` 和 `success(data, [file])` 交付内置导出器生成的 Blob。HTTP 和 stdio 工具结果保留 JSON 元数据，并增加标准 `resource_link`；客户端通过 `resources/read` 读取同一份文件字节，不需要文件系统路径或公网下载地址。

文件在 10 分钟后或所属 Panel、Form、App 关闭时释放。资源读取仍调用同一 App 的公开 `clickgo.file.read` 命令，保留隔离、取消和生命周期校验。不支持资源的客户端可使用该命令，传入 `fileId`、字节偏移 `offset` 和 `readChunkSize` 指定的 `length`，逐段解码 Base64 并拼接字节，直到 `nextOffset` 为 null。捕获不到浏览器下载事件不代表生成失败。此能力要求搭配支持命令文件的 ClickGo 运行时；旧运行时结果继续沿用原有 JSON 行为。

## 执行链路与本机发现

Native 通过 `executeAgent()` 将请求转发给目标 App。CLI 和 stdio 使用内部 HTTP 客户端，stdio 接入进程面对 AI 是服务端，面对 Native 是客户端；业务 App 注册命令，框架提供协议适配器。`createBridge()` 用于持续绑定一个 App 的模块；普通网页使用 JS/WebMCP，不启动本地 HTTP 服务。

CLI/stdio 每次调用都发现同一安装软件的当前地址和 token，不受自定义软件 `id` 影响。临时记录位于用户目录的 `.clickgo-native/run`，可用 `CLICKGO_NATIVE_RUNTIME_DIR` 更改；POSIX 使用私有目录和 `0600` 文件权限，Windows 继承用户目录权限。停止时删除记录，忽略已退出进程的记录，拒绝符号链接、POSIX 下权限过宽的记录和非回环地址。

启用发现允许同一操作系统用户的进程获取临时凭据；设置 `discovery: false` 可保留认证 HTTP 连接并关闭 CLI/stdio 发现。

## 开发与测试

运行 `npm run build` 和 `npm run native`，通过示例的 **Connection settings** 和 **AI access guide** 按钮获取连接信息。用以下客户端测试计数器的 HTTP 调用：

```sh
CLICKGO_MCP_URL='<url-from-connection-settings>' \
CLICKGO_MCP_TOKEN='<token-from-connection-settings>' \
node dist/test/mcp-client.js
```

客户端列出 App 和命令，加 2 后读取数值；多 App 时设置 `CLICKGO_MCP_TASK_ID`。在另一个终端使用同一入口测试 CLI：

```sh
./node_modules/.bin/electron dist/test --cli apps
./node_modules/.bin/electron dist/test --cli commands --app '<taskId>'
```

开发 stdio 时，将 Electron 可执行文件的绝对路径作为 `command`，将 `["<clickgo-native仓库绝对路径>/dist/test", "--mcp"]` 作为 `args`。直接调用 Electron，避免 npm 输出混入协议流。

| 检查 | 命令 |
|---|---|
| HTTP 协议 | `npm run test:mcp` |
| CLI、stdio 和启动 | `npm run test:cli` |
| 窗口联动 | `npm run test:window` |
| 打包入口，无系统 Node/显示环境 | `node dist/abox/test/executable.mjs <binary-path> [electron-options]` |

这些检查用于补充真实 GUI 验收。跨仓库开发遵循 [AGENTS](../AGENTS.md)；对应运行时未发布时，安装本地 ClickGo 构建。
