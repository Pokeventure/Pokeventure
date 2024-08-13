import { Command, CommandContext } from 'command';
import { paginationEmbed, sendEmbed } from '../modules/utils';
import { getInventory } from '../modules/database';
import items from '../../data/items';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

export const Inventory: Command = {
  name: 'Inventory',
  keywords: ['inventory', 'i', 'inv'],
  category: 'Items',
  fullDesc: 'Display all items from your inventory. Use the command `%PREFIX%use` to use items from your inventory.\n\nExample: `%PREFIX%inventory`',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Show your items in your bag.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const inventory = await getInventory(context.user.id);
        if (inventory === null || inventory.inventory === null) {
          sendEmbed({ context, message: 'Your bag is empty' });
          return;
        }
        const text = '';
        let itemList = ['', ''];
        const embed = new MessageEmbed();
        embed.setTitle('**Inventory**');
        const pages = [embed];
        let j = 0;
        let i = 0;
        let itemCounter = 0;
        for (const [key, value] of Object.entries(inventory.inventory)) {
          if ((<any>value).quantity > 0) {
            const column = itemCounter % 10 > 4 ? 1 : 0;
            itemList[column] += `${items[<any>key].emoji} **${items[<any>key].name}** x${(<any>value).quantity}\n`;

            if (itemCounter % 10 === 9 && i < Object.entries(inventory.inventory).length - 1) {
              if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
              if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
              pages[j].setDescription(text);
              j++;
              pages[j] = new MessageEmbed();
              pages[j].setAuthor(context.user.username, context.user.avatarURL);
              pages[j].setTitle('**Inventory**');
              itemList = ['', ''];
            }
            itemCounter++;
          }
          i++;
        }

        if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
        if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
        pages[j].setDescription(text);
        paginationEmbed(context, pages);
        resolve({});
      } catch (e) {
        reject(e);
      }
    });
  },
};
