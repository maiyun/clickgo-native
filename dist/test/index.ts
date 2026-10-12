import * as native from '../index.js';

class Boot extends native.AbstractBoot {

    public async main(): Promise<void> {
        this.run(native.path(import.meta.url, './index.html'), {
            'frame': false,
            'background': 'hsl(21, 100%, 54%)',
        });
        await native.startMcp();
    }

}

native.launcher(new Boot(), { 'commandAutoStart': true });
