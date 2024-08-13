import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { AbilitiesText as AbilitiesImport } from '../../simulator/.data-dist/text/abilities';
import { SlashCommandBuilder } from '@discordjs/builders';

const Abilities: any = AbilitiesImport;

export const AbilityInfo: Command = {
  name: 'Ability info',
  keywords: ['abilityinfo'],
  category: 'Pokémon',
  fullDesc: 'Displays informations a given ability.\n\nUsage: `%PREFIX%abilityinfo <ability name>`\nExample: `%PREFIX%moveinfo static` to display informations about Static ability.',
  requireStart: false,
  needPlayer: false,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('abilityinfo')
    .setDescription('Displays informations about an ability.')
    .addStringOption(option => option.setName('ability').setDescription('Ability name').setRequired(true))
  ,

  handler(context: CommandContext): any {
    const abilityName = context.commandInterction.options.getString('ability');
    const ability = <any>Object.values(Abilities).find((x: any) => x.name.toLocaleLowerCase().startsWith(abilityName));
    if (ability !== undefined) {
      sendEmbed({ context, message: `**${ability.name}**\n\n${ability.desc ?? ability.shortDesc}` });
    } else {
      sendEmbed({ context, message: `No ability found for ${abilityName}` });
    }
  },
};
