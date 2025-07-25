import * as electron from 'electron';
import * as path from 'path';
import * as libFs from './lib/fs';
export const fs = libFs;
import * as libTool from './lib/tool';
export const tool = libTool;

// npm publish --tag dev --access public
// --- sass --watch dist/:dist/ --style compressed --no-source-map ---

/** --- 是否是沉浸式的 --- */
let isImmersion: boolean = false;
// --- windows 下是且只会是沉浸式，其他系统以启动的第一个窗体为准绑定大小最小化最大化关闭等功能 ---

/** --- 窗体是否含有 border 边框，有的话将不是沉浸式，也不会绑定任何窗体的大小和相关事件 --- */
let hasFrame: boolean = false;

/** --- 是否没有物理窗体时就主动退出软件（进程结束），如果不要窗体只有 node 的话，会用到 false 的情况 --- */
let isNoFormQuit: boolean = true;

/** --- 主窗体 --- */
let form: electron.BrowserWindow | undefined;

/** --- 当前设定的通讯 token --- */
let token: string = '';

/** --- 当前系统平台 --- */
const platform: NodeJS.Platform = process.platform;
// const platform: NodeJS.Platform = 'darwin';

/** --- 监听前台的执行的方法，内置的方法，用户可调用方法自行添加 --- */
const methods: Record<string, {
    'once': boolean;
    'handler': (...param: any[]) => any | Promise<any>;
}> = {
    // --- 成功运行一个 task 后 init ---
    'cg-init': {
        'once': true,
        handler: function(t: string) {
            // --- t 是网页传来的 token ---
            if (!t || !form) {
                return;
            }
            form.resizable = true;
            token = t;
        }
    },
    // --- 完全退出软件进程 ---
    'cg-quit': {
        'once': false,
        handler: function(t: string): void {
            if (!t || !form) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            electron.app.quit();
        }
    },
    // --- 设置实体窗体大小，仅非沉浸式可设置 ---
    'cg-set-size': {
        'once': false,
        handler: function(t: string, width: number, height: number): void {
            if (isImmersion || !form || !width || !height) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            form.setSize(width, height);
            form.center();
        }
    },
    // --- 设置窗体最大化、最小化、还原 ---
    'cg-set-state': {
        'once': false,
        handler: function(t: string, state: string): void {
            if (!form || !state) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            switch (state) {
                case 'max': {
                    form.maximize();
                    break;
                }
                case 'min': {
                    form.minimize();
                    break;
                }
                default: {
                    form.restore();
                }
            }
        }
    },
    // --- 激活窗体 ---
    'cg-activate': {
        'once': false,
        handler: function(t: string): void {
            if (!form) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            if (form.isMinimized()) {
                form.restore();
            }
            form.setAlwaysOnTop(true);
            form.show();
            form.focus();
            form.setAlwaysOnTop(false);
        },
    },
    // --- 关闭窗体（可能软件进程不会被退出） ---
    'cg-close': {
        'once': false,
        handler: function(t: string): void {
            if (!form) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            form.close();
        }
    },
    // --- 设置 IgnoreMouseEvents，仅限沉浸式 ---
    'cg-mouse-ignore': {
        'once': false,
        handler: function(t: string, val: boolean): void {
            if (!isImmersion || !form) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            if (val) {
                form.setIgnoreMouseEvents(true, { 'forward': true });
            }
            else {
                form.setIgnoreMouseEvents(false);
            }
        }
    },
    // --- 是否允许最大化 ---
    'cg-maximizable': {
        'once': false,
        handler: function(t: string, val: boolean): void {
            if (isImmersion || !form) {
                return;
            }
            if (!verifyToken(t)) {
                return;
            }
            form.setMaximizable(val);
        }
    },

    // --- fs 相关操作 ---

    'cg-fs-getContent': {
        'once': false,
        handler: async function(
            t: string,
            path: string,
            options: Record<string, any>
        ): Promise<string | Buffer | null> {
            if (!verifyToken(t)) {
                return null;
            }
            return libFs.getContent(path, options);
        }
    },
    'cg-fs-putContent': {
        'once': false,
        handler: async function(
            t: string, path: string, data: string | Buffer, options: Record<string, any>
        ): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.putContent(path, data, options);
        }
    },
    'cg-fs-readLink': {
        'once': false,
        handler: async function(t: string, path: string, encoding?: BufferEncoding): Promise<string | null> {
            if (!verifyToken(t)) {
                return null;
            }
            return fs.readLink(path, encoding);
        }
    },
    'cg-fs-symlink': {
        'once': false,
        handler: async function(t: string, filePath: string, linkPath: string, type?: 'dir' | 'file' | 'junction'): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.symlink(filePath, linkPath, type);
        }
    },
    'cg-fs-unlink': {
        'once': false,
        handler: async function(t: string, path: string): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.unlink(path);
        }
    },
    'cg-fs-stats': {
        'once': false,
        handler: async function(t: string, path: string): Promise<Record<string, any> | null> {
            if (!verifyToken(t)) {
                return null;
            }
            return fs.stats(path);
        }
    },
    'cg-fs-mkdir': {
        'once': false,
        handler: async function(t: string, path: string, mode: number): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.mkdir(path, mode);
        }
    },
    'cg-fs-rmdir': {
        'once': false,
        handler: async function(t: string, path: string): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.rmdir(path);
        }
    },
    'cg-fs-chmod': {
        'once': false,
        handler: async function(t: string, path: string, mod: string | number): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.chmod(path, mod);
        }
    },
    'cg-fs-rename': {
        'once': false,
        handler: async function(t: string, oldPath: string, newPath: string): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.rename(oldPath, newPath);
        }
    },
    'cg-fs-readDir': {
        'once': false,
        handler: async function(t: string, path: string, encoding?: BufferEncoding): Promise<any[]> {
            if (!verifyToken(t)) {
                return [];
            }
            return fs.readDir(path, encoding);
        }
    },
    'cg-fs-copyFile': {
        'once': false,
        handler: async function(t: string, src: string, dest: string): Promise<boolean> {
            if (!verifyToken(t)) {
                return false;
            }
            return fs.copyFile(src, dest);
        }
    },

    // --- form ---

    'cg-form-open': {
        'once': false,
        handler: function(t: string, options: {
            /** --- 默认路径 --- */
            'path'?: string;
            /** --- 筛选的文件类型 --- */
            'filters'?: Array<{
                'name': string;
                /** --- 如 jpg --- */
                'accept': string[];
            }>;
            'props'?: {
                /** --- 允许选择文件，默认 true --- */
                'file'?: boolean;
                /** --- 允许选择文件夹，默认 false --- */
                'directory'?: boolean;
                /** --- 允许多选，默认 false --- */
                'multi'?: boolean;
            };
        } = {}): string[] | null {
            if (!t || !form) {
                return null;
            }
            if (!verifyToken(t)) {
                return null;
            }
            options.filters ??= [];
            options.props ??= {};
            options.props.file ??= true;
            options.props.directory ??= false;
            options.props.multi ??= false;
            const paths = electron.dialog.showOpenDialogSync(form, {
                'defaultPath': options.path ? tool.formatPath(options.path) : undefined,
                'filters': options.filters.map((item) => {
                    return {
                        'name': item.name,
                        'extensions': item.accept,
                    };
                }),
                'properties': [
                    options.props.file ? 'openFile' : '',
                    options.props.directory ? 'openDirectory' : '',
                    options.props.multi ? 'multiSelections' : '',
                ].filter(item => item) as any,
            });
            if (!paths) {
                return null;
            }
            return paths.map(item => tool.parsePath(item));
        }
    },

    'cg-form-save': {
        'once': false,
        handler: function(t: string, options: {
            /** --- 默认路径 --- */
            'path'?: string;
            /** --- 筛选的文件类型 --- */
            'filters'?: Array<{
                'name': string;
                /** --- 如 jpg --- */
                'accept': string[];
            }>;
        } = {}): string | null {
            if (!t || !form) {
                return null;
            }
            if (!verifyToken(t)) {
                return null;
            }
            options.filters ??= [];
            const path = electron.dialog.showSaveDialogSync(form, {
                'defaultPath': options.path ? tool.formatPath(options.path) : undefined,
                'filters': options.filters.map((item) => {
                    return {
                        'name': item.name,
                        'extensions': item.accept,
                    };
                }),
            });
            if (!path) {
                return null;
            }
            return tool.parsePath(path);
        }
    },
    'cg-form-dialog': {
        'once': false,
        handler: function(t: string, options: string | {
            'type'?: 'info' | 'error' | 'question' | 'warning';
            'title'?: string;
            'message'?: string;
            'detail'?: string;
            'buttons'?: string[];
        } = {}): number {
            if (!t || !form) {
                return -1;
            }
            if (!verifyToken(t)) {
                return -1;
            }
            if (typeof options === 'string') {
                options = {
                    'message': options
                };
            }
            options.title ??= 'ClickGo';
            options.message ??= '';
            return electron.dialog.showMessageBoxSync(form, {
                'type': options.type,
                'title': options.title,
                'message': options.message,
                'detail': options.detail,
                'buttons': options.buttons,
            });
        }
    },

    // --- 无需校验码 ---

    // --- 测试与 native 的连通性 ---
    'cg-ping': {
        'once': false,
        handler: function(t: string): string {
            // --- t 不是 token，传过来什么就会传回去 ---
            return 'pong: ' + t;
        }
    },
    // --- 判断窗体是否是最大化状态 ---
    'cg-is-max': {
        'once': false,
        handler: function(): boolean {
            return form?.isMaximized ? true : false;
        }
    }
};

/** --- 全局类 --- */
export abstract class AbstractBoot {

    /**
     * --- 是否是沉浸式运行 ---
     */
    public get isImmersion(): boolean {
        return isImmersion;
    }

    /**
     * --- 是否含有实体窗体边框和标题 ---
     */
    public get hasFrame(): boolean {
        return hasFrame;
    }

    /**
     * --- 没有实体窗体时整个实体进程是不是会被结束 ---
     */
    public get isNoFormQuit(): boolean {
        return isNoFormQuit;
    }

    /**
     * --- 当前系统代号 ---
     */
    public get platform(): NodeJS.Platform {
        return platform;
    }

    /**
     * --- 当前的通讯 token ---
     */
    public get token(): string {
        return token;
    }

    /** --- 入口方法 --- */
    public abstract main(): void | Promise<void>;

    /**
     * --- 开始运行起来一个主实体窗体，整个进程本方法只能执行一次 ---
     * @param path 实体窗体网页路径
     * @param opt 参数
     */
    public run(path: string, opt: {
        /** --- 是否显示实体窗体边框和标题，默认 false --- */
        'frame'?: boolean;
        /** --- 没有实体窗体时整个实体进程是不是会被结束，默认 true --- */
        'quit'?: boolean;
        /** --- 是否是开发模式，默认 false --- */
        'dev'?: boolean;
    } = {}
    ): void {
        if (opt.frame !== undefined) {
            // --- 默认 false ---
            hasFrame = opt.frame;
        }
        if (opt.quit !== undefined) {
            // --- 默认 true ---
            isNoFormQuit = opt.quit;
        }
        // --- 判断是否是沉浸式 ---
        if (platform === 'win32') {
            // --- 是 Windows 才有可能是沉浸式 ---
            if (!hasFrame) {
                // --- 实体窗体没有边框，一定是沉浸式 ---
                isImmersion = true;
            }
        }
        // --- 创建实体窗体 ---
        createForm(path);
        if (form && opt.dev) {
            // --- 开发模式 ---
            form.webContents.openDevTools();
        }
        // --- 监听所有实体窗体关闭事件 ---
        electron.app.on('window-all-closed', function(): void {
            if (isNoFormQuit) {
                electron.app.quit();
            }
        });
        // --- 软件被活动性激活的事件 ---
        electron.app.on('activate', function(): void {
            if (electron.BrowserWindow.getAllWindows().length > 0) {
                return;
            }
            createForm(path);
            if (form && opt.dev) {
                // --- 开发模式 ---
                form.webContents.openDevTools();
            }
            // --- 成功运行一个 task 后再次添加 init ---
            methods['cg-init'] = {
                'once': true,
                handler: function(t: string) {
                    // --- t 是网页传来的 token ---
                    if (!t || !form) {
                        return;
                    }
                    form.resizable = true;
                    token = t;
                }
            };
        });
    }

    /**
     * --- 绑定监听网页调用方法的方法 ---
     * @param name 方法名
     * @param handler 要执行的函数
     * @param once 是否只执行一次
     */
    public on(
        name: string,
        handler: (...param: any[]) => any | Promise<any>,
        once: boolean = false
    ): void {
        methods[name] = {
            'once': once,
            'handler': handler
        };
    }

    /**
     * --- 绑定监听网页调用方法的方法但只会执行一次 ---
     * @param name 方法名
     * @param handler 要执行的函数
     */
    public once(name: string, handler: (...param: any[]) => any | Promise<any>): void {
        this.on(name, handler, true);
    }

    /**
     * --- 解绑监听的方法 ---
     * @param name 方法名
     */
    public off(name: string): void {
        if (!methods[name]) {
            return;
        }
        delete methods[name];
    }

    /**
     * --- 显示一个 dialog ---
     * @param opt 选项或者一段文字
     */
    public dialog(options: string | {
        'type'?: 'info' | 'error' | 'question' | 'warning';
        'title'?: string;
        'message'?: string;
        'detail'?: string;
        'buttons'?: string[];
    } = {}): number {
        if (!form) {
            return -1;
        }
        if (typeof options === 'string') {
            options = {
                'message': options
            };
        }
        options.title ??= 'ClickGo';
        options.message ??= '';
        return electron.dialog.showMessageBoxSync(form, {
            'type': options.type,
            'title': options.title,
            'message': options.message,
            'detail': options.detail,
            'buttons': options.buttons,
        });
    }

}

/** --- 用户调用运行 boot 类 --- */
export function launcher(boot: AbstractBoot): void {
    (async function() {
        // --- 等到 native 环境装载完毕 ---
        await electron.app.whenReady();
        await fs.refreshDrives();
        // --- 执行回调 ---
        await boot.main();
    })().catch(function() {
        return;
    });
}

// --- 系统启动 ---

electron.Menu.setApplicationMenu(null);

// --- 实际用来监听网页传输过来的数据 ---
electron.ipcMain.handle('pre', function(e: electron.IpcMainInvokeEvent, name: string, ...param: any[]): any {
    if (!methods[name]) {
        return;
    }
    const r = methods[name].handler(...param);
    if (methods[name].once) {
        delete methods[name];
    }
    return r;
});

/**
 * --- 验证 token 是否正确 ---
 * @param t 要验证的 token
 */
export function verifyToken(t: string): boolean {
    if (t !== token) {
        return false;
    }
    return true;
}

/**
 * --- 内部调用用来创建实体窗体的函数 ---
 * @param p 窗体网页路径
 */
function createForm(p: string): void {
    const op: Electron.BrowserWindowConstructorOptions = {
        'webPreferences': {
            'nodeIntegration': false,
            'contextIsolation': true,
            'preload': path.join(__dirname, '/pre.js'),
        },
        'width': hasFrame ? 800 : 500,
        'height': hasFrame ? 700 : 300,
        'frame': hasFrame,
        'resizable': false,
        'show': false,
        'center': true,
        'transparent': isImmersion ? true : false
    };
    form = new electron.BrowserWindow(op);
    form.webContents.userAgent = 'electron/' + electron.app.getVersion() + ' ' + platform + '/' + process.arch + ' immersion/' + (isImmersion ? '1' : '0') + ' frame/' + (hasFrame ? '1' : '0');
    form.once('ready-to-show', function(): void {
        if (!form) {
            return;
        }
        if (isImmersion) {
            // --- 沉浸式默认最大化 ---
            form.maximize();
            form.setIgnoreMouseEvents(true, { 'forward': true });
        }
        else {
            // --- 设置为第一个窗体的大小 ---
        }
        form.show();
    });
    if (p.startsWith('https://') || p.startsWith('http://')) {
        // --- 加载网页 ---
        form.loadURL(p).catch(function(e): void {
            throw e;
        });
    }
    else {
        // --- 加载本地文件 ---
        const lio = p.indexOf('?');
        const search = lio === -1 ? '' : p.slice(lio + 1);
        if (lio !== -1) {
            p = p.slice(0, lio);
        }
        form.loadFile(p, {
            'search': search
        }).catch(function(e): void {
            throw e;
        });
    }
    form.on('close', function() {
        form = undefined;
    });
    // --- 最大化事件 ---
    form.on('maximize', function() {
        form?.webContents.executeJavaScript('if(window.clickgoNativeWeb){clickgoNativeWeb.invoke("maximize")}') as any;
    });
    // --- 最大化还原 ---
    form.on('unmaximize', function() {
        form?.webContents.executeJavaScript('if(window.clickgoNativeWeb){clickgoNativeWeb.invoke("unmaximize")}') as any;
    });
}
