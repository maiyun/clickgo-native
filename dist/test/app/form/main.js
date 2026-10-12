import * as clickgo from 'clickgo';
export default class extends clickgo.form.AbstractForm {
    value = 0;
    source = '';
    result = '';
    /** --- 客户端取得目标 App 后可直接使用的 MCP 工具请求 --- */
    get mcpCall() {
        return JSON.stringify({
            'name': 'clickgo_execute_command',
            'arguments': { 'taskId': this.taskId, 'name': 'counter.add', 'args': { 'amount': 2 } },
        }, null, 2);
    }
    /**
     * --- 普通界面执行与 MCP 相同的计数命令 ---
     * @returns 更新结果
     */
    async add() {
        this.result = JSON.stringify(await clickgo.command.execute(this, 'counter.add', { 'amount': 1 }), null, 2);
    }
    /**
     * --- 读取计数器，展示无修改命令的输入与结果 ---
     * @returns 更新结果
     */
    async read() {
        this.result = JSON.stringify(await clickgo.command.execute(this, 'counter.read'), null, 2);
    }
    /**
     * --- 直接展示框架按当前环境生成的 AI 接入说明，默认不包含凭据 ---
     * @returns 更新可复制的说明
     */
    async agentGuide() {
        const guide = await clickgo.command.getAgentGuide(this);
        if (guide === null || guide === false) {
            return;
        }
        this.result = guide;
    }
    /**
     * --- 用户主动查看 MCP 客户端所需的 URL 与认证头 ---
     * @returns 显示连接设置或可理解的未启用状态
     */
    async connectionSettings() {
        const info = await clickgo.native.getMcpInfo(this);
        if (info === false) {
            this.result = 'Permission to read connection settings was denied.';
            return;
        }
        if (info === null) {
            this.result = 'The Native host has not enabled MCP.';
            return;
        }
        this.result = JSON.stringify({ 'url': info.url, 'headers': { 'Authorization': `Bearer ${info.token}` } }, null, 2);
    }
    /**
     * --- 挂载时声明业务命令；UI 和 MCP 共用同一函数与实例数据 ---
     * @returns 无
     */
    onMounted() {
        clickgo.command.register(this, {
            'name': 'counter.add',
            'title': 'Increase counter',
            'description': 'Increase this app\'s counter by the specified amount and return the updated value.',
            'inputSchema': {
                'type': 'object',
                'properties': { 'amount': { 'type': 'integer', 'minimum': 1, 'maximum': 10 } },
                'required': ['amount'], 'additionalProperties': false,
            },
            'exposed': true,
            'annotations': { 'readOnlyHint': false, 'destructiveHint': false },
            'execute': (args, context) => {
                this.value += args['amount'];
                this.source = context.source;
                return clickgo.command.success({ 'value': this.value });
            },
        });
        clickgo.command.register(this, {
            'name': 'counter.read',
            'title': 'Read counter',
            'description': 'Read this app\'s counter without changing it.',
            'inputSchema': { 'type': 'object', 'additionalProperties': false },
            'exposed': true,
            'annotations': { 'readOnlyHint': true, 'idempotentHint': true },
            'execute': () => clickgo.command.success({ 'value': this.value }),
        });
    }
    /**
     * --- 同步最小化到 Native 窗体 ---
     * @returns 无
     */
    async onMin() {
        await clickgo.native.min(this);
    }
}
