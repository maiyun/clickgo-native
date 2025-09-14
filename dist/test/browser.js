import * as clickgo from 'clickgo';
// --- 打包 APP ---
// --- clickgo -a ./dist/test/app
// --- 打包启动文件 ---
// --- clickgo -b ./dist/test/browser -g https://cdn.jsdelivr.net/npm/clickgo@4.x.x/dist/index.js ---
// --- clickgo -b ./dist/test/browser -g ../../../clickgo/dist/index.js ---
class Boot extends clickgo.AbstractBoot {
    async main() {
        const block = document.getElementById('block');
        const text = document.getElementById('text');
        let first = true;
        const taskId = await clickgo.task.run(this._sysId, 'app.cga', {
            'notify': false,
            perProgress: (per) => {
                console.log('per', per);
                if (first) {
                    first = false;
                    block.style.transitionDuration = '.5s';
                }
                block.style.width = (per * 100).toString() + '%';
            },
            initProgress: (loaded, total, type, msg) => {
                console.log('initProgress', `[${loaded}/${total}] ${msg}`);
                text.textContent = `[${loaded}/${total}] ${msg}`;
            },
            'permissions': ['root'],
        });
        console.log('taskId', taskId);
        document.getElementById('main')?.remove();
        //*/
    }
    onError(taskId, formId, error, info) {
        console.log(taskId, formId, error, info);
    }
}
clickgo.launcher(new Boot());
