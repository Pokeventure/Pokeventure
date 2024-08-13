import { Command, CommandContext } from 'command';
import { sendEmbed } from '../modules/utils';
import { updatePlayer } from '../modules/database';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v9';

const patronLevelName = [
  'Inactive',
  'Trainer',
  'Gym Leader',
  'Elite Four',
  'League Champion',
  'Legendary Trainer',
];

const perks = [
  '',
  `- 50,000 Pokécoins <:pokecoin:741699521725333534> every week
    - 1 Masterball <:masterball:741809195178917999> every week
    - 50% more experience
    - **Trainer** role on the Pokéventure Discord server`,
  `- 100,000 Pokécoins <:pokecoin:741699521725333534> every week
    - 3 Masterballs <:masterball:741809195178917999> every week
    - 50% more experience
    - Access to feature earlier
    - Gym Leader role on the Pokéventure Discord server`,
  `- 250,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 5 Masterball <:masterball:741809195178917999> per week
    - Pick a spécial Pokémon of your choice between 3 every 2 weeks
    - 75% more experience
    - Access to new feature earlier
    - Elite Four role in the Pokéventure Discord server`,
  `- 600,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 10 Masterball <:masterball:741809195178917999> per week
    - Pick a spécial Pokémon of your choice between 3 every 2 weeks
    - 1 Premium Shiny Finder <:shinyfinder:746747520763297832> per week
    - 1 Premium Rarity Scanner <:ivscanner:746747237475942480> per week
    - 75% more experience
    - 25% off from the Shop
    - Access to new feature earlier
    - League Champion role in the Pokéventure Discord server`,
  `- 1,250,000 Pokécoins <:pokecoin:741699521725333534> per week
    - 15 Masterball <:masterball:741809195178917999> per week
    - 2 Premium Shiny Scanner <:shinyfinder:746747520763297832> per week
    - 2 Premium Rarity Scanner <:ivscanner:746747237475942480> per week
    - Pick a spécial Pokémon of your choice between 3 every 2 weeks
    - 100% more experience
    - 25% off from the Shop
    - Access to new feature earlier
    - Legendary Trainer role in the Pokéventure Discord server`,
];

export const Patreon: Command = {
  name: 'Patreon',
  keywords: ['patreon', 'donate'],
  category: 'Bot',
  fullDesc: 'Vote for the bot and earn rewards.\n\nUsage: `%PREFIX%vote`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('patreon')
    .setDescription('Get info about Patreon'),

  async handler(context: CommandContext) {
    try {
      let user: any = await context.client.restClient.get(Routes.guildMember('446025712600875020', context.user.id));
      if (user === undefined) { return; }
      const currentPatronLevel = context.player?.patronLevel || 0;
      if (user === undefined) {
        sendEmbed({
          context, message: 'You can donate on Patreon to get special Perks!\n[Go on Pokeventure Patreon here](https://www.patreon.com/pokeventure)\n\nIf you subscribe, make sure to stay on the Pokeventure server to access your perks!', image: null, thumbnail: null, author: context.user, footer: null, title: 'Donate', color: null, components: [{
            type: 2,
            url: 'https://www.patreon.com/pokeventure',
            style: 5,
            label: 'Go to Patreon page'
          }]
        });
        return;
      }
      let actualPatronLevel = currentPatronLevel;
      if (user.roles.includes('789959072249020476')) {
        // Legendary Trainer
        actualPatronLevel = 5;
      } else if (user.roles.includes('789957513856548864')) {
        // League Champion
        actualPatronLevel = 4;
      } else if (user.roles.includes('789957403155759134')) {
        // Elite Four
        actualPatronLevel = 3;
      } else if (user.roles.includes('789957280111919149')) {
        // Gym Leader
        actualPatronLevel = 2;
      } else if (user.roles.includes('789957218841264171')) {
        // Trainer
        actualPatronLevel = 1;
      } else {
        actualPatronLevel = 0;
      }
      if (currentPatronLevel !== actualPatronLevel) {
        await updatePlayer(context.user.id, { patronLevel: actualPatronLevel });
        if (actualPatronLevel !== 0) {
          await sendEmbed({ context, message: `Thanks for suppporting Pokéventure!\nYour status has been updated to **${patronLevelName[actualPatronLevel]}**!\n` });
        }
      }
      if (actualPatronLevel !== 0) {
        sendEmbed({
          context, message: `Thanks for suppporting Pokéventure!\nYour patron status is **${patronLevelName[actualPatronLevel]}**.\n\nHere are your perks:\n${perks[actualPatronLevel]}\n\n[Go on Pokeventure Patreon here](https://www.patreon.com/pokeventure)`, image: null, thumbnail: null, author: null, footer: null, title: null, color: null, components: [{
            type: 2,
            url: 'https://www.patreon.com/pokeventure',
            style: 5,
            label: 'Go to Patreon page'
          }]
        });
      } else {
        sendEmbed({
          context, message: 'You can donate on Patreon to get special Perks!\n[Go on Pokeventure Patreon here](https://www.patreon.com/pokeventure)\n\nIf you subscribe, make sure to stay on the Pokeventure server to access your perks!', image: null, thumbnail: null, author: context.user, footer: null, title: 'Donate', color: null, components: [{
            type: 2,
            url: 'https://www.patreon.com/pokeventure',
            style: 5,
            label: 'Go to Patreon page'
          }]
        });
      }
    } catch (error) {
      sendEmbed({
        context, message: 'You can donate on Patreon to get special Perks!\n[Go on Pokeventure Patreon here](https://www.patreon.com/pokeventure)\n\nIf you subscribe, make sure to stay on the Pokeventure server to access your perks!', image: null, thumbnail: null, author: context.user, footer: null, title: 'Donate', color: null, components: [{
          type: 2,
          url: 'https://www.patreon.com/pokeventure',
          style: 5,
          label: 'Go to Patreon page'
        }]
      });
    }
  },
};
