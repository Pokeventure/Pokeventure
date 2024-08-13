import { SlashCommandBuilder } from "discord.js";
import items from "../../data/items";
import { sendEmbed } from "../modules/utils";
import { Command, CommandContext } from "../types/command";
import { ItemsText as ItemsTextImport } from '../../simulator/.data-dist/text/items'

const ItemsText: {
  [name: string]: {
    name: string,
    desc: string
  }
} = ItemsTextImport;

export const ItemInfo: Command = {
  commandName: 'iteminfo',
  displayName: 'Item info',
  fullDescription: 'Displays informations about an item\n\Usage: `%PREFIX%iteminfo <name>`\nExample: `%PREFIX%iteminfo rare candy` to display informations about the item rare candy.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  data: () => new SlashCommandBuilder()
    .setName('iteminfo')
    .setDescription('Displays informations about an item.')
    .addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true))
    .setDMPermission(true)
  ,

  handler(context: CommandContext) {
    const item = items.find((x) => x.name.toLocaleLowerCase().includes(context.interaction.options.getString('item', true)));
    if (item !== undefined) {
      let index = items.indexOf(item) + 1;
      if (item.holdname !== undefined) {
        sendEmbed(context, { description: `${item.emoji} **${item.name}**\n\n${ItemsText[item.holdname].desc}`, image: null, thumbnail: null, footer: { text: `#${index}` } });
      } else if (item.description !== undefined) {
        sendEmbed(context, { description: `${item.emoji} **${item.name}**\n\n${item.description}`, footer: { text: `Item #${index}` } });
      }
    } else {
      sendEmbed(context, { description: `No item found for ${context.interaction.options.getString('item', true)}` });
    }
  },
};
