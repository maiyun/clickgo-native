import * as clickgo from 'clickgo';

(async function() {
    await clickgo.init();
    await clickgo.task.run('app/', {
        
    });
})().catch((e) => {
    console.log(e);
});
