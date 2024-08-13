const { ShardingManager } = require('discord.js');
const dotenv = require('dotenv');
const { AutoPoster } = require('topgg-autoposter');

dotenv.config();

const manager = new ShardingManager('./dist/src/index.js', {
    token: process.env.BOT_TOKEN,
    mode: 'worker',
});

if (process.env.DEV !== '1' && process.env.BATTLE === undefined) {
    let ap = AutoPoster(process.env.TOPGG_TOKEN, manager);

    // Optional events
    ap.on('posted', () => {
        console.log('Server count posted!');
    });
}

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
