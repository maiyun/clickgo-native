import * as native from '../index';

native.ready().then(function() {
    native.run('./index.html');
}).catch(function(e) {
    console.log(e);
});
