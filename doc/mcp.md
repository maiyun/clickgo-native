# MCP and CLI guide

[简体中文](mcp.sc.md) · [Back to README](../README.md#local-mcp)

Use the README for quick setup and client configuration. This guide provides a complete command example and reference for advanced options.

## Command registration

Register each business operation once in the ClickGo App. Set `exposed: true` to allow agents to discover and execute it; UI buttons and menus call the same command:

```typescript
import * as clickgo from 'clickgo';

export default class extends clickgo.form.AbstractForm {

    public value = 0;

    /**
     * --- Register the shared business command ---
     * @returns No return value
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
     * --- UI buttons and menus use the same command ---
     * @returns The command result
     */
    public add(): Promise<clickgo.command.TResult> {
        return clickgo.command.execute(this, 'counter.add', { 'amount': 1 });
    }

}
```

Bind the template button with `@click="add"`. All entrypoints share validation, permissions and App state. Command lifecycle and browser integration are covered by the [ClickGo command guide](https://github.com/maiyun/clickgo/blob/master/doc/sc/commands.md) (Simplified Chinese).

## Service configuration

Call `await native.startMcp(options)` after creating the Native window. Every option is optional:

| Option | Default | Meaning |
|---|---|---|
| `port` | System assigned | Loopback HTTP port, from 0 to 65535 |
| `token` | Random | Bearer token containing 32–256 letters, digits, underscores or hyphens |
| `id` | Derived from Electron's user-data directory | Stable software identifier, such as `com.example.app` |
| `discovery` | `true` | Allow this OS user's CLI/stdio processes to discover the current connection |

The application chooses which settings to persist using [storage and secret](../README.md#persistent-storage). `startMcp()` returns connection information, or `false` for invalid settings, a failed bind, a missing window or a duplicate start.

| API | Context | Result |
|---|---|---|
| `native.getMcpInfo()` | Native main process | Copy of current settings, or `null` when disabled |
| `await clickgo.native.getMcpInfo(this)` | ClickGo App/Form | Settings with existing `root` permission; `false` if denied, `null` if disabled or unsupported |
| `await native.stopMcp()` | Native main process | Stop the listener and cancel in-flight exchanges |

Closing the window stops the service. Use the returned URL with `Authorization: Bearer <token>` and keep credentials private. Cloud-only clients need a local connection component.

## App and command discovery

`taskId` identifies an App instance inside the software. Follow the tool order below; ask if the target is ambiguous and rediscover IDs after restart or a stale ID error.

| Tool | Arguments | Result |
|---|---|---|
| `clickgo_list_apps` | `{}` | `{ok, data: [{id, name}]}`; pass the chosen `id` as `taskId` |
| `clickgo_list_commands` | `{ taskId }` | Exposed command names, descriptions, schemas, enabled and disabledReason |
| `clickgo_execute_command` | `{ taskId, name, args }` | `{ok, data}` or `{ok: false, error: {code, message}}` |

Use an enabled command's name and inputSchema from the selected App. The server supplies these instructions and schemas to clients. Do not automatically retry commands that change data. Business code must cooperate with `context.signal`; cancellation does not undo completed changes.

## CLI and GUI startup

Executable paths and basic CLI/stdio configuration are in the [README](../README.md#cli-and-stdio-mcp). The full CLI workflow is:

```sh
./MySoftware --cli --help
./MySoftware --cli instances
./MySoftware --cli apps
./MySoftware --cli commands --app '<taskId>'
./MySoftware --cli execute --app '<taskId>' --name '<commandName>' --args '{"amount":2}'
```

Results are JSON; failures set a nonzero exit status. `--args-file <path>` reads JSON from a file and `--args-file -` reads stdin. SIGINT/SIGTERM cancels an in-flight call. For multiple software instances, pass an ID from `instances` as `--host '<instanceId>'` in CLI or stdio args. This software instance ID is separate from taskId.

Set `commandAutoStart: true` in `native.launcher()` to permit GUI startup; it defaults to `false`. `Boot.main()` must create the window and enable MCP with discovery. Calls that need an App share startup and wait up to 20 seconds; help, instances, initialization and tools/list do not open a GUI. Cancellation or timeout ends only that caller's wait; later calls keep waiting for the same GUI until it exits. `singleInstance` independently controls multiple GUI instances.

Keep business startup in `Boot.main()` and stdout free of module-import or Boot-constructor logs. The launcher handles CLI/stdio before GUI initialization; the stdio process exits when stdin closes or it receives a shutdown signal.

## Generated AI access guides

Generate the text in the [README example](../README.md#generate-an-ai-access-guide); generation does not enable a service. The APIs are:

| API | Result |
|---|---|
| `await clickgo.command.getAgentGuide(this)` | English Markdown with the available entrypoints |
| `await clickgo.command.getAgentInfo(this)` | Structured environment and App snapshot |
| `native.getCommandEntry()` / `await clickgo.native.getCommandEntry()` | Executable metadata and capabilities without URL/token |

Guides omit transient IDs and credentials by default. To export HTTP settings, use `{ 'includeMcpCredentials': true }` with getAgentGuide/getAgentInfo; it requires existing `root` permission. Denied access returns `false`, an unavailable App returns `null`. Regenerate credentials after restart; public page methods never export them.

Regenerate the executable entry after moving or reinstalling. Startup is `existing` by default, or `auto` with commandAutoStart; args preserve explicitly used sandbox switches. The client needs support for the chosen entrypoint.

## Exported files

An App can return its native export Blob with ClickGo's `context.createFile(blob, { fileName, mimeType? })` and `success(data, [file])`. HTTP and stdio tool results retain the JSON metadata and add standard `resource_link` content. Read its URI with `resources/read` to receive the exact file bytes; no filesystem path or public download URL is required.

Files expire after 10 minutes or when their owning Panel, Form or App closes. Resource reads use the same App's public `clickgo.file.read` command, preserving isolation, cancellation and lifecycle checks. Clients without resource support can use that command with `fileId`, byte `offset` and `length` from `readChunkSize`, decode each Base64 segment and append bytes until `nextOffset` is null. Missing browser download events are not export failures. This requires the ClickGo runtime with command file support; older runtime results keep their existing JSON behavior.

## Execution and local discovery

Native forwards requests to the selected App through `executeAgent()`. CLI and stdio use the internal HTTP client; the stdio adapter is a server to the AI and a client to Native. Apps register business commands, while the framework supplies the protocol adapters. `createBridge()` is for modules that stay bound to one App. Ordinary webpages use JS/WebMCP and do not start a local HTTP service.

CLI/stdio discover the current endpoint/token for their own installation on every call, independent of a custom software `id`. Temporary records live in `.clickgo-native/run` under the user's home directory, or `CLICKGO_NATIVE_RUNTIME_DIR`. POSIX uses private directories and `0600` files; Windows inherits user-profile permissions. Stop removes records; dead-process records are ignored, and symlinks, permissive POSIX records and non-loopback URLs are rejected.

Discovery authorizes processes of the same OS user to obtain temporary credentials. Set `discovery: false` to disable CLI/stdio discovery while keeping authenticated HTTP access.

## Development and testing

Run `npm run build` and `npm run native`. The Demo's **Connection settings** and **AI access guide** buttons supply connection data. To test HTTP against its counter:

```sh
CLICKGO_MCP_URL='<url-from-connection-settings>' \
CLICKGO_MCP_TOKEN='<token-from-connection-settings>' \
node dist/test/mcp-client.js
```

The client lists Apps and commands, adds 2 and reads the value. With multiple Apps, set `CLICKGO_MCP_TASK_ID`. In another terminal, test CLI with the same entry:

```sh
./node_modules/.bin/electron dist/test --cli apps
./node_modules/.bin/electron dist/test --cli commands --app '<taskId>'
```

For stdio, use the absolute Electron executable as `command` and `["<absolute-path-to-clickgo-native>/dist/test", "--mcp"]` as `args`. Invoke Electron directly so npm output does not enter the protocol stream.

| Check | Command |
|---|---|
| HTTP protocol | `npm run test:mcp` |
| CLI, stdio and startup | `npm run test:cli` |
| Window integration | `npm run test:window` |
| Packaged entry without system Node/display | `node dist/abox/test/executable.mjs <binary-path> [electron-options]` |

These checks complement real GUI acceptance. Cross-repository work follows [AGENTS](../AGENTS.md); install the local ClickGo build when the matching runtime has not been published.
