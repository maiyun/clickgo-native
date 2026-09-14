import * as clickgo from 'clickgo';
export default class extends clickgo.form.AbstractForm {
    async onMin() {
        await clickgo.native.min(this);
    }
}
