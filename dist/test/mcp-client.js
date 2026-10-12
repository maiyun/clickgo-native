/* eslint-disable no-console -- 外部命令行客户端通过标准输出展示发现结果与调用结果。 */
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
/**
 * --- 外部客户端按发现结果选择 Native Demo，再调用同一组业务命令 ---
 * @returns 无；连接失败或目标不明确时设置退出状态
 */
async function main() {
    const url = process.env['CLICKGO_MCP_URL'];
    const token = process.env['CLICKGO_MCP_TOKEN'];
    if (!url || !token) {
        console.error('Set CLICKGO_MCP_URL and CLICKGO_MCP_TOKEN from the Demo connection settings.');
        process.exitCode = 1;
        return;
    }
    const client = new Client({ 'name': 'clickgo-native-demo-client', 'version': '1.0.0' }, {
        'versionNegotiation': { 'mode': 'auto' },
    });
    // --- 网络与外部 SDK 可能拒绝连接；在客户端入口处理并释放连接 ---
    try {
        await client.connect(new StreamableHTTPClientTransport(new URL(url), {
            'requestInit': { 'headers': { 'Authorization': `Bearer ${token}` } },
        }));
        const apps = await client.callTool({ 'name': 'clickgo_list_apps', 'arguments': {} });
        const content = apps.structuredContent;
        if (content?.['ok'] !== true || !Array.isArray(content['data'])) {
            console.error('The Native host could not list its apps.');
            process.exitCode = 1;
            return;
        }
        console.log('Running apps:', JSON.stringify(content['data'], null, 2));
        const configuredId = process.env['CLICKGO_MCP_TASK_ID'];
        const targets = content['data'].filter((app) => {
            if (!app || typeof app !== 'object' || !('id' in app) || !('name' in app) ||
                typeof app.id !== 'string' || typeof app.name !== 'string') {
                return false;
            }
            return configuredId ? app.id === configuredId : app.name === 'ClickGo Native';
        });
        if (targets.length !== 1) {
            console.error('Choose one Demo app using CLICKGO_MCP_TASK_ID.');
            process.exitCode = 1;
            return;
        }
        const taskId = targets[0].id;
        const commands = await client.callTool({
            'name': 'clickgo_list_commands', 'arguments': { 'taskId': taskId },
        });
        console.log('Commands:', JSON.stringify(commands.structuredContent, null, 2));
        if (commands.isError) {
            process.exitCode = 1;
            return;
        }
        // --- 这是已知 Demo 的明确操作；不自动选择其他 App 或重试修改 ---
        const added = await client.callTool({
            'name': 'clickgo_execute_command',
            'arguments': { 'taskId': taskId, 'name': 'counter.add', 'args': { 'amount': 2 } },
        });
        console.log('Add 2:', JSON.stringify(added.structuredContent, null, 2));
        if (added.isError) {
            process.exitCode = 1;
            return;
        }
        const read = await client.callTool({
            'name': 'clickgo_execute_command',
            'arguments': { 'taskId': taskId, 'name': 'counter.read', 'args': {} },
        });
        console.log('Read:', JSON.stringify(read.structuredContent, null, 2));
        if (read.isError) {
            process.exitCode = 1;
        }
    }
    catch {
        console.error('The MCP connection failed. Check that Native is running and the connection settings are current.');
        process.exitCode = 1;
    }
    finally {
        await client.close();
    }
}
await main();
