import { Command, CommandContext } from 'command';
import { paginationEmbed, sendEmbed } from '../modules/utils';
import shop from '../../data/bpshop';
import items from '../../data/items';
import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

export const BpShop: Command = {
  name: 'BP Shop',
  keywords: ['bpshop', 'bpstore'],
  category: 'Items',
  fullDesc: 'Display all available items with their ID and with their prices. Some items may be available only during some events. Then you can buy items with their ID by using the `%PREFIX%bpbuy` command.\n\nUsage: `%PREFIX%bpshop <category>`\n\nExample: `%PREFIX%bpshop 1` to display all items from category 1.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('bpshop')
    .setDescription('Open BP Shop')
    .addIntegerOption(
      (input) => input
        .setDescription('BP Shop category')
        .setName('category')
        .addChoice('Holdable', 1)
        .addChoice('Usable', 2)
        .setRequired(true)
    ),

  handler(context: CommandContext): any {
    const category = [
      'Holdable',
      'Usable',
    ];
    const selectedCategory: number = context.commandInterction.options.getInteger('category', true) - 1;
    if (isNaN(selectedCategory) || selectedCategory < 0 || selectedCategory > 3) {
      sendEmbed({ context, message: 'Invalid category' });
      return;
    }
    let text = '';
    let itemList = ['', ''];
    let embed = new MessageEmbed();
    embed.setTitle('**Battle Point Shop**');
    const pages = [embed];
    let j = 0;
    let itemCounter = 0;
    for (let i = 0; i < shop.length; i++) {
      if (items[shop[i].id].category !== category[selectedCategory]) { continue; }

      const column = itemCounter % 10 > 4 ? 1 : 0;
      itemList[column] += `\`#${shop[i].id + 1}\` ${shop[i].quantity !== undefined ? `x${shop[i].quantity}` : ''} ${items[shop[i].id].emoji} **${items[shop[i].id].name}**\n${shop[i].price.toLocaleString()} BP <:bp:797019879337230356>\n`;

      if (itemCounter % 10 === 9 && i < shop.length - 1) {
        if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
        if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
        pages[j].setDescription(`**You have ${context.player?.money.gems.toLocaleString()} BP <:bp:797019879337230356>**\n${text}`);
        j++;
        pages[j] = new MessageEmbed();
        pages[j].setAuthor(context.user.username, context.user.avatarURL);
        pages[j].setTitle('**Battle Point Shop**');
        itemList = ['', ''];
      }
      itemCounter++;
    }

    if (itemList[0].length > 0) { pages[j].addField('\u2800', `${itemList[0]}`, true); }
    if (itemList[1].length > 0) { pages[j].addField('\u2800', `${itemList[1]}`, true); }
    pages[j].setDescription(`**You have ${context.player?.money.gems.toLocaleString()} BP <:bp:797019879337230356>**\n${text}`);
    paginationEmbed(context, pages);
  },
};
