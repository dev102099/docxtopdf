const Queue = require('bull'); const q = new Queue('test', { redis: { host: 'redis' } }); q.add({hello: 'world'}).then(() => console.log('Done')).catch(console.error);
