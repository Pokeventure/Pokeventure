import { Command, CommandContext } from 'command';
import { paginationEmbed, sendEmbed } from '../modules/utils';
import shop from '../../data/shop';
import items from '../../data/items';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import event from '../../data/event';

export const Shop: Command = {
  name: 'Shop',
  keywords: ['shop', 'store'],
  category: 'Items',
  fullDesc: 'Display all available items with their ID and with their prices. Some items may be available only during some events. Then you can buy items with their ID by using the `%PREFIX%buy` command.\n\nUsage: `%PREFIX%shop <category>`\n\nExample: `%PREFIX%shop 1` to display all items from category 1.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Open the Poké Mart.')
    .addIntegerOption(
      (input) => input
        .setDescription('Shop category')
        .setName('category')
        .addChoice('Balls', 1)
        .addChoice('Evolution', 2)
        .addChoice('Usable', 3)
        .addChoice('Treats', 4)
        .addChoice('Xmas', 5)
        .setRequired(true)
    ),

  handler(context: CommandContext): any {
    const category = [
      'Balls',
      'Evolution',
      'Usable',
      'Treats',
      'Xmas'
    ];
    const selectedCategory: number | null = context.commandInterction.options.getInteger('category', true) - 1;
    if (selectedCategory !== null) {
      if (selectedCategory < 0 || selectedCategory > category.length - 1) {
        sendEmbed({ context, message: 'Invalid category' });
        return;
      }
      let text = `**You have ${context.player?.money.coins.toLocaleString()} <:pokecoin:741699521725333534> and ${context.player?.money.tickets.toLocaleString()} ❄️**`;
      let itemList = ['', ''];
      let embed = new MessageEmbed();
      embed.setTitle('**Poké Mart**');
      const pages = [embed];
      let j = 0;
      let itemCounter = 0;
      for (let i = 0; i < shop.length; i++) {
        if ((shop[i].category === undefined && items[shop[i].id].category !== category[selectedCategory]) || (shop[i].category !== undefined && shop[i].category !== category[selectedCategory])) { continue; }

        const column = itemCounter % 10 > 4 ? 1 : 0;
        if(shop[i].price !== undefined) {
          itemList[column] += `\`#${i + 1}\` ${items[shop[i].id].emoji} **${shop[i].name}**\n${(context.player?.patronLevel !== undefined && context.player?.patronLevel >= 4 ? Math.round((shop[i].price ?? 0) * 0.75) : shop[i].price ?? 0).toLocaleString()} coins <:pokecoin:741699521725333534>\n`;
        } else if(shop[i].currency !== undefined) {
          itemList[column] += `\`#${i + 1}\` ${items[shop[i].id].emoji} **${shop[i].name}**\n${(shop[i].currency ?? 0).toLocaleString()} ${event.currencyName} ${event.currencyEmoji}\n`;
        }
        
        if (itemCounter % 10 === 9 && i < shop.length - 1) {
          if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
          if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
          pages[j].setDescription(text);
          j++;
          pages[j] = new MessageEmbed();
          pages[j].setAuthor(context.user.username, context.user.avatarURL);
          pages[j].setTitle('**Poké Mart**');
          itemList = ['', ''];
        }
        itemCounter++;
      }

      if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
      if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
      pages[j].setDescription(text);
      paginationEmbed(context, pages);
    } /* else {
      let text = `**You have ${context.player?.money.coins.toLocaleString()} <:pokecoin:741699521725333534>**\nTo see items in a category, use command \`/shop <category number>\`.\nTo buy something, use command \`/buy <product number>\`\n`;
      let embed = new MessageEmbed();
      embed.setTitle('**Poké Mart**');
      embed.addField('#1 Balls', 'Items to catch Pokémons');
      embed.addField('#2 Evolution', 'Items needed to evolve some Pokémons');
      embed.addField('#3 Usable items', 'Items that can be used to help you or your Pokémons');
      embed.setDescription(text);
      context.commandInterction.reply({ content: 'Pong!', components: [row] });
    } */
  },
};
