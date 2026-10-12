# ClickGo Native 工作区

这是 ClickGo 的 Electron 桌面宿主，包名为 `clickgo-native`。

- 主进程源码在 `dist/index.ts`，`dist/pre.js` 是手写的隔离预加载脚本；同名 `.js`/`.d.ts` 和测试 `.cga` 使用构建生成。
- 本地 MCP 的传输与认证在 `dist/lib/mcp.ts`；`dist/index.ts` 负责当前主文档会话检查和固定命令转发。页面端适配器在 ClickGo 仓库的 `dist/lib/command/native.ts`，直接按 taskId 调用 `executeAgent()` 进入共享执行器，只允许公开命令。不要为每次请求创建绑定 App 的桥接，也不要复制业务执行函数或开放任意脚本调用。
- MCP 由宿主显式 `startMcp()` 启用，关闭窗口时停止；只监听本机，连接令牌仅用于客户端设置，不写日志或默认界面。页面读取设置沿用 ClickGo 的 root 权限检查。
- `cg-command-entry` 只返回软件进程入口及当前 MCP 能力状态；由 ClickGo 的 `command.getAgentInfo()` / `getAgentGuide()` 统一生成说明，Demo 直接展示结果。默认及网页入口均不导出凭据，应用显式导出仍需 root；默认说明简短且不嵌入临时 App/实例 ID；启动模式由 commandAutoStart 对应 existing/auto。跨仓库更新必须同时安装包含这些 API 的 ClickGo 运行时与类型。
- Native Demo 位于 `dist/test/`，沿用英文展示。`mcp-client.ts` 是外部协议调用示例，App 只需注册公开命令。
- `npm run build` 编译 TypeScript 并打包 Demo，`npm run check` 检查类型与 lint，`npm run test:mcp` 使用官方客户端连接真实 HTTP 服务，`npm run test:window` 检查 Native 窗口集成。桌面验收另外启动 Electron，不能用这些静态或协议测试代替。
- Demo 使用安装的 ClickGo 运行时；跨仓库开发时先编译、打包 ClickGo，再安装本地 npm 包。主进程包与网页运行时必须同时更新才能完成命令转发。

## 与 ClickGo 测试副本同步

- 本仓库 `dist/index.ts` 必须与 ClickGo 仓库 `dist/test/native/native.ts` 逐字一致；`dist/lib/{fs,tool,mcp,instance,client,cli,startup,version}.ts` 及手写 `dist/pre.js` 也同步对应的 ClickGo `dist/test/native/` 文件；不要独立维护两套实现。
- Native 功能先在 ClickGo 的测试副本中开发，完成 `npx tsc`、`npm run check`、`npm run test:native` 及真实 Electron Demo 联动后，才同步到本仓库。详细入口与模式见 ClickGo 的 AGENTS。
- 同步后在本仓库运行 `npm run build`、`npm run check`、`npm run test:window`、`npm run test:mcp`，并用 `cmp` 核对对应源码；JS/类型声明使用构建生成。新增模块时核对配套文件和两边依赖声明，不能只同步主入口。

- 软件交付的 CLI/stdio 入口由 `launcher()` 自动提供：软件可执行文件使用 `--cli <command>` 或 `--mcp`，不要求用户安装 Node.js、全局 npm 包或启用 RunAsNode。入口在 GUI 单实例锁、文件处理和 `Boot.main()` 之前分流；Electron 的 `before-quit` 先取消接入操作，排空输出后只退出当前命令进程。业务初始化放在 `Boot.main()`，模块导入与 Boot 构造期间不能向 stdio stdout 写日志。
- 不提供全局 npm bin 或独立 Node 命令入口。开发调试通过 `electron dist/test --cli ...` / `--mcp` 使用软件自身的入口。`npm run test:cli` 通过 `test/cli.mjs` 在临时目录创建测试进程调用内部适配器，验证协议协商、发现权限、取消、实例歧义、重启与 JSON 参数；这些测试进程不随包分发。官方 MCP client SDK 属于运行依赖。
- `lib/instance.ts` 维护本机同用户的临时私有运行记录，`lib/client.ts` 每次据此连接现有 HTTP MCP；HTTP 和 stdio 使用 `lib/mcp.ts` 的相同工具定义。不重试修改请求，不默认选择多个匹配实例；稳定软件 ID 与 App taskId 不同，重启后重新发现 taskId。
- 运行记录的内部 `applicationId` 根据安装的可执行文件（开发时为 App 路径、AppImage 为原镜像路径）生成，CLI/stdio 必须提供此归属并只连接同一安装的实例，不受业务自定义 MCP ID 影响。`test/executable.mjs` 接收真实打包二进制文件，验证无系统 Node/显示环境的 CLI、stdio、EOF 和中断取消；真实 GUI 联动仍单独验证。
- `startMcp({ id })` 可提供稳定软件 ID，默认由 Native 用户数据目录派生；默认启用同用户实例发现，`discovery: false` 可关闭。退出时删除运行记录，崩溃记录按 PID 排除。连接界面、长期凭据和业务配置由消费应用负责，临时发现记录不承担配置持久化；网页读取凭据仍要求 root。CLI/stdin 接入见 README。

- 英文入口为 `README.md`，简体中文入口为 `doc/README.sc.md`；README 保留快速接入，MCP 的完整示例、配置和内部机制放在 `doc/mcp.md` 与 `doc/mcp.sc.md`。中英文内容及跳转保持同步，中文 README 和两份 MCP 指南均包含在 npm 包中。

- MCP 客户端及 HTTP/stdio 服务端的框架版本共用 `lib/version.ts`，从模块所属包的 `package.json` 读取，不复制版本常量，也不使用消费软件的 `app.getVersion()`；ClickGo 测试副本读取 ClickGo 包版本。升级包版本后重启即可生效。

- launcher 的 commandAutoStart 默认 false；启用时只有需要 GUI 的命令请求才按需启动，帮助、instances、MCP 握手及 tools/list 不启动。启动前保持安装归属，私有启动锁合并并发请求，等待 App 就绪有上限；拉起后启动锁交给 GUI，取消或超时只释放本次等待。后续请求继续等待同一 GUI，就绪后清理启动锁，GUI 异常退出后可重新启动；不关闭 GUI，也不回放修改。启动回归见 test/startup.mjs。
