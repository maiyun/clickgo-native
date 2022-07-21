import * as clickgo from 'clickgo';

setTimeout(function() {
    (async function() {
        await clickgo.init();
        // --- 监听错误 ---
        clickgo.core.globalEvents.errorHandler = function(taskId, formId, error, info) {
            console.log(info, error);
        };
        const taskId = await clickgo.task.run('app/', {
            'notify': false,
            'progress': (loaded, total) => {
                document.getElementById('progress')!.style.width = ((loaded + 1) / (total + 1) * 100).toString() + '%';
            },
            'main': true,
            'sync': true
        });
        console.log('taskId', taskId);
        document.getElementById('main')?.remove();
    })().catch((e) => {
        console.log(e);
    });
}, 100);
