// Run after TypeScript compilation: node --experimental-vm-modules test/window.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';
import { SourceTextModule, SyntheticModule } from 'node:vm';

let window;
let ipc;
let handled = true;
let queries = 0;
let quits = 0;
const app = new EventEmitter();
app.getAppPath = () => '/app';
app.getVersion = () => '1.0.0';
app.quit = () => { ++quits; window.close(); };
class BrowserWindow extends EventEmitter {
    constructor(options) {
        super();
        window = this;
        this.options = options;
        this.size = [options.width, options.height];
        this.minimum = [0, 0];
        this.destroyed = false;
        this.webContents = new EventEmitter();
        this.webContents.mainFrame = { url: url.pathToFileURL('/app/index.html').href };
        this.webContents.getURL = () => this.webContents.mainFrame.url;
        this.webContents.setWindowOpenHandler = () => {};
        this.webContents.executeJavaScript = async () => { ++queries; return handled; };
    }
    async loadFile() { this.webContents.emit('did-navigate'); }
    isDestroyed() { return this.destroyed; }
    setMinimumSize(w, h) { this.minimum = [w, h]; }
    getSize() { return this.size; }
    setSize(w, h) { this.size = [w, h]; }
    center() {}
    close() {
        let prevented = false;
        this.emit('close', { preventDefault() { prevented = true; } });
        if (!prevented) { this.destroyed = true; this.emit('closed'); }
    }
}
function synthetic(exports) {
    return new SyntheticModule(Object.keys(exports), function() {
        for (const [key, value] of Object.entries(exports)) { this.setExport(key, value); }
    });
}
const dependencies = {
    'electron': synthetic({ app, BrowserWindow, Menu: { setApplicationMenu() {} },
        ipcMain: { handle(name, callback) { ipc = callback; } } }),
    'path': synthetic(path),
    'node:url': synthetic(url),
    './lib/fs.js': synthetic({}),
    './lib/tool.js': synthetic({}),
};
const mod = new SourceTextModule(await readFile(new URL('../dist/index.js', import.meta.url), 'utf8'), {
    initializeImportMeta(meta) { meta.url = new URL('../dist/index.js', import.meta.url).href; },
});
await mod.link(name => dependencies[name]);
await mod.evaluate();
class Boot extends mod.namespace.AbstractBoot { main() {} }
const boot = new Boot();
const run = () => {
    boot.run('/app/index.html', { frame: false, icon: '/app/icon.png' });
    const frame = window.webContents.mainFrame;
    const event = { sender: window.webContents, senderFrame: frame };
    ipc(event, 'cg-init', 'secret');
    return (...params) => ipc(event, ...params);
};
let invoke = run();
assert.equal(window.options.icon, '/app/icon.png');
for (const args of [['bad', 360, 240], ['secret', -1, 240], ['secret', 1.5, 240], ['secret', NaN, 240]]) {
    invoke('cg-set-min-size', ...args);
    assert.deepEqual(window.minimum, [0, 0]);
}
invoke('cg-set-size', 'secret', 200, 100);
invoke('cg-set-min-size', 'secret', 360, 240);
assert.deepEqual(window.minimum, [360, 240]);
assert.deepEqual(window.size, [360, 240]);
invoke('cg-set-min-size', 'secret', 420, 300);
assert.deepEqual(window.minimum, [420, 300]);
invoke('cg-set-min-size', 'secret', 0, 0);
assert.deepEqual(window.minimum, [0, 0]);

window.close();
window.close();
await new Promise(r => setImmediate(r));
assert.equal(window.destroyed, false);
assert.equal(queries, 1);
invoke('cg-close', 'bad');
assert.equal(window.destroyed, false);
invoke('cg-close', 'secret');
assert.equal(window.destroyed, true);
assert.equal(queries, 1);

invoke = run();
handled = false;
window.close();
await new Promise(r => setImmediate(r));
assert.equal(window.destroyed, true);

invoke = run();
handled = true;
invoke('cg-quit', 'secret');
assert.equal(quits, 1);
assert.equal(window.destroyed, true);
console.log('Native icon, minimum-size and close-bridge regression checks passed.');
