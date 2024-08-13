import { Chance } from 'chance';
import * as dotenv from 'dotenv';
import Client from './modules/client';

process.on('unhandledRejection', (reason, p) => {
  console.log('Possibly Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  // application specific logging here
});

// Load dotenv config
const config = dotenv.config();

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

const client: Client = new Client();

client.start();
