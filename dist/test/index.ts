import * as native from '../index.js';

class Boot extends native.AbstractBoot {

    public main(): void {
        this.run('./index.html', {
            'frame': false,
        });
        // this.run('../../../clickgo/dist/test/desktop/index.html');
    }

}

native.launcher(new Boot());
