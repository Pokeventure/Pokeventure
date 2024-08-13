import { Command, CommandContext } from 'command';
import { addQuests, generateBingo, getBingo, updatePlayer } from '../modules/database';
import { sendEmbed } from '../modules/utils';
import { SlashCommandBuilder } from '@discordjs/builders';

export const Event: Command = {
  name: 'Event',
  keywords: ['event'],
  category: 'Bot',
  fullDesc: 'Check if there is an event and join it if there is one.\n\nUsage: `%PREFIX%event`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Get info about current event.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (new Date() >= new Date(context.client.event.startDate) && new Date() < new Date(context.client.event.endDate)) {
        if (!context.player?.event) {
          await updatePlayer(context.user.id, { event: true }).then(async () => {
            await addQuests(context.user.id, context.client.event.quest);
            sendEmbed({ context, message: `${context.client.event.description}\n\n**Event quest added! Use command \`/quests\` to see it.**`, image: context.client.event.image, title: 'Event' });
          }).catch((error) => {
            reject(error);
          });
        } else {
          sendEmbed({ context, message: context.client.event.description, image: context.client.event.image, title: 'Event' });
        }
        /* if (!context.player?.event) {
          await updatePlayer(context.user.id, { event: true });
          await sendEmbed({ context, message: context.client.event.description, image: context.client.event.image, thumbnail: null, author: null, footer: null, title: 'Event' });
          await addQuests(context.user.id, context.client.event.quest);
          await sendEmbed({ context, message: 'Event quests added! Use command `%PREFIX%quest` to see them.' });
          updatePlayer(context.user.id, { event: true }).then(() => {
            // Generate bingo
            generateBingo(context.user.id).then(async (res) => {
              await sendEmbed({ context, message: 'Here is your first card of Pokeventure Bingo. **Complete 2 lines and get rewards**. You can check the card again by doing `/event` again.', image: `http://image.pokeventure.com/bingo.php?d=${JSON.stringify({ data: res.bingo })}` });
              addQuests(context.user.id, context.client.event.quest);
              await sendEmbed({ context, message: 'Event quests added! Use command `%PREFIX%quest` to see it. **Complete 2 lines and get rewards**.' });
            }).catch((error) => {
              reject(error);
            });
          }).catch((error) => {
            reject(error);
          }); 
        } else {
          sendEmbed({ context, message: context.client.event.description, image: context.client.event.image, thumbnail: null, author: null, footer: null, title: 'Event' });
          getBingo(context.user.id).then((res) => {
            sendEmbed({ context, message: context.client.event.description, image: `http://image.pokeventure.com/bingo.php?d=${JSON.stringify({ data: res.card })}`, thumbnail: null, author: null, footer: null, title: 'Event' });
          }).catch((error) => {
            reject(error);
          });
        } */
      } else {
        sendEmbed({ context, message: 'There is currently no event. Come back later!' });
      }
      resolve({});
    });
  },
};
