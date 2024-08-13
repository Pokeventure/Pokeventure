
import * as dotenv from 'dotenv';
const config = dotenv.config();
import BotClient from './modules/client';
import Logger from './modules/logger';

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    Logger.error(`Unhandled exception: ${reason} ${p}`);
});

console.log(`
 _____      _                        _                  
|  __ \\    | |                      | |                 
| |__) |__ | | _______   _____ _ __ | |_ _   _ _ __ ___ 
|  ___/ _ \\| |/ / _ \\ \\ / / _ \\ '_ \\| __| | | | '__/ _ \\
| |  | (_) |   <  __/\\ V /  __/ | | | |_| |_| | | |  __/
|_|   \\___/|_|\\_\\___| \\_/ \\___|_| |_|\\__|\\__,_|_|  \\___|`);

if (config.error) {
    throw new Error('Cannot find .env configuration. Stopping bot.');
}

const client: BotClient = new BotClient();

client.start();