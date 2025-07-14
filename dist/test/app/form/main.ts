import * as clickgo from 'clickgo';

export default class extends clickgo.form.AbstractForm {

    public async onMin(): Promise<void> {
        await clickgo.native.min();
    }

}
