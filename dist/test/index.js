import * as native from '../index.js';
class Boot extends native.AbstractBoot {
    main() {
        this.run('./index.html', {
            'frame': false,
            'background': 'hsl(21, 100%, 54%)'
        });
        // this.run('../../../clickgo/dist/test/desktop/index.html');
    }
}
native.launcher(new Boot());
