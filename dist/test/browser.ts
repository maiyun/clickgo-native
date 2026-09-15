import * as clickgo from 'clickgo';

class Boot extends clickgo.AbstractBoot {

    public async main(): Promise<void> {
        const block = document.getElementById('block')!;
        const text = document.getElementById('text')!;
        let first = true;
        /** --- 加载应用 --- */
        const taskId = await clickgo.task.run(this._sysId, 'app.cga', {
            'notify': false,
            perProgress: (per) => {
                if (first) {
                    first = false;
                    block.style.transitionDuration = '.5s';
                }
                block.style.width = (per * 100).toString() + '%';
            },
            initProgress: (loaded, total, _type, msg) => {
                text.textContent = `[${loaded}/${total}] ${msg}`;
            },
            'permissions': ['root'],
        });
        if (typeof taskId !== 'string') {
            text.textContent = `Load failed (${taskId}).`;
            return;
        }
        document.getElementById('main')?.remove();
    }

    public onError(taskId: string, formId: string, error: Error, info: string): void {
        const text = document.getElementById('text');
        if (!text) {
            return;
        }
        text.textContent = `[${taskId}/${formId}] ${info}: ${error.message}`;
    }

}

await clickgo.launcher(new Boot());
