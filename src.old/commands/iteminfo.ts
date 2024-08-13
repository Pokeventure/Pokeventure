import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import items from '../../data/items';
import { ItemsText as ItemsTextImport } from '../../simulator/.data-dist/text/items';
import { SlashCommandBuilder } from '@discordjs/builders';

const ItemsText: any = ItemsTextImport;

export const ItemInfo: Command = {
  name: 'Item info',
  keywords: ['iteminfo'],
  category: 'Items',
  fullDesc: 'Displays informations about an item\n\Usage: `%PREFIX%iteminfo <name>`\nExample: `%PREFIX%iteminfo rare candy` to display informations about the item rare candy.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('iteminfo')
    .setDescription('Displays informations about an item.')
    .addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true))
  ,

  handler(context: CommandContext): any {
    const item = items.find((x) => x.name.toLocaleLowerCase().includes(context.commandInterction.options.getString('item', true)));
    if (item !== undefined) {
      let index = items.indexOf(item) + 1;
      if (item.holdname !== undefined) {
        sendEmbed({ context, message: `${item.emoji} **${item.name}**\n\n${ItemsText[item.holdname].desc}`, image: null, thumbnail: null, author: null, footer: `#${index}` });
      } else if (item.description !== undefined) {
        sendEmbed({ context, message: `${item.emoji} **${item.name}**\n\n${item.description}`, image: null, thumbnail: null, author: null, footer: `Item #${index}` });
      }
    } else {
      sendEmbed({ context, message: `No item found for ${context.commandInterction.options.getString('item', true)}` });
    }
  },
};
