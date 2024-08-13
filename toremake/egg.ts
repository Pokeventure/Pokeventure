import { Command, CommandContext } from 'command';
import MessageEmbed from '../modules/MessageEmbed';

export const Egg: Command = {
  name: 'Egg',
  keywords: ['egg', 'eggs'],
  category: 'Pokémon',
  fullDesc: '',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve) => {
      const embed = new MessageEmbed();
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatching in {time}\n\u2800', true);
      embed.addField('<:egg1:807589836944441415> Egg #x', 'Hatch in {time}\n\u2800', true);
      embed.setTitle('Eggs');
      embed.setDescription('Help');
      context.channel.createMessage(embed.getObject());
      // sendEmbed(context, context.channel, `Here are you available eggs:\n- x0 <:egg1:807589836944441415> 1h egg\n- x0 <:egg1:807589836944441415> 3h egg\n- x0 <:egg1:807589836944441415> 6h egg\n- x0 <:egg1:807589836944441415> 12h egg\n- x0 <:egg1:807589836944441415> 24h egg`)
      resolve({});
    });
  },
};
