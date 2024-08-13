import { Command, CommandContext } from 'command';
import { Player } from 'pokemon';
import {
  sendEmbed, upperCaseFirstLetter, getImage, choiceMaker,
} from '../modules/utils';
import { createPokemon, createPlayer, updatePlayer, addQuests } from '../modules/database';
import { getPokemon } from '../modules/pokedex';
import { getRegion, randomPokemon } from '../modules/world';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';

const start: any = [];

export const Start: Command = {
  name: 'Start',
  keywords: ['start', 'begin'],
  category: 'Bot',
  fullDesc: 'Starts your journey in the world of Pokémons. You will be asked to choose a starter Pokémon from all regions so... choose wisely.\nExample: `/start`',
  requireStart: false,
  needPlayer: true,
  showInHelp: true,
  commandData: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start your Pokeventure journey.'),

  handler(context: CommandContext): any {
    if (context.player === null) {
      const embed = new MessageEmbed();
      embed.setDescription(`Welcome to the beautiful world of Pokémon ${upperCaseFirstLetter(context.user.username)}! Select the region where you want your starter from:`)
        .setThumbnail('https://pokeventure-image.s3.amazonaws.com/pokeventure.png')
        .setTitle('Pokeventure')
        .setFooter('Write the number to select a region')
        .setImage('https://pokeventure-image.s3.amazonaws.com/starters.png')
        .addField('#1', 'Kanto', true)
        .addField('#2', 'Johto', true)
        .addField('#3', 'Hoenn', true)
        .addField('#4', 'Sinnoh', true)
        .addField('#5', 'Unova', true)
        .addField('#6', 'Kalos', true)
        .addField('#7', 'Alola', true)
        .addField('#8', 'Galar', true);

      const row1 = new MessageActionRow();
      row1.addComponents(
        new MessageButton()
          .setCustomId('choice_1')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Kanto')),
        new MessageButton()
          .setCustomId('choice_2')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Johto')),
        new MessageButton()
          .setCustomId('choice_3')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Hoenn')),
        new MessageButton()
          .setCustomId('choice_4')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Sinnoh')),
      );
      const row2 = new MessageActionRow();
      row2.addComponents(
        new MessageButton()
          .setCustomId('choice_5')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Unova')),
        new MessageButton()
          .setCustomId('choice_6')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Kalos')),
        new MessageButton()
          .setCustomId('choice_7')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Alola')),
        new MessageButton()
          .setCustomId('choice_8')
          .setStyle('PRIMARY')
          .setLabel(upperCaseFirstLetter('Galar')),
      );
      context.commandInterction.editReply({ embeds: [embed], components: [row1, row2] })
        .then((message) => {
          if (start[context.user.id] !== undefined) {
            start[context.user.id].stop();
          }
          choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
            let regionValue = choice;
            const region = getRegion(regionValue);
            const embed = new MessageEmbed();
            embed.setDescription(`You selected **${region.name}**. Select you starter :`)
              .addField('#1 Grass starter', `${upperCaseFirstLetter(region.starter[0])}`, true)
              .addField('#2 Fire starter', `${upperCaseFirstLetter(region.starter[1])}`, true)
              .addField('#3 Water starter', `${upperCaseFirstLetter(region.starter[2])}`, true)
              .setImage(`https://pokeventure-image.s3.amazonaws.com/${regionValue}.png`);
            const components = new MessageActionRow();
            components.addComponents(
              new MessageButton()
                .setCustomId('choice_1')
                .setStyle('SUCCESS')
                .setLabel(upperCaseFirstLetter(region.starter[0])),
              new MessageButton()
                .setCustomId('choice_2')
                .setStyle('DANGER')
                .setLabel(upperCaseFirstLetter(region.starter[1])),
              new MessageButton()
                .setCustomId('choice_3')
                .setStyle('PRIMARY')
                .setLabel(upperCaseFirstLetter(region.starter[2])),
            );
            interaction.reply({ embeds: [embed], components: [components], fetchReply: true }).then((message) => {
              choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                const starter = getPokemon(region.starter[choice - 1]);
                const embed = new MessageEmbed();
                embed
                  .setDescription(`You selected ${starter.displayName}!\n\n**You have been given some quests to help you to begin! Use \`/quests\` to see your quests.**\n\nIt's recommended to read the guide first so you can learn the basics (\`/guide\`).\n\nUse \`/help\` to see all available commands.\nUse \`/move <ID>\` to go to a region and find wild pokemons.\nUse \`/map\` to see regions.\nUse \`/wild\` to find wild Pokémons.\nUse \`/fight\` to fight the wild Pokémon you are facing.`)
                  .setThumbnail(getImage(starter, true, false))
                  .setAuthor(context.user.username, context.user.avatarURL);
                interaction.reply({ embeds: [embed] });

                createPlayer(context.user.id, context.user.username).then(() => {
                  const pokemon = randomPokemon(starter.dexId, 5);

                  addQuests(context.user.id, [
                    {
                      type: 'tutorialMove',
                      value: 0,
                      objective: 1,
                      tutorial: true,
                      reward: [
                        {
                          item: -1,
                          quantity: 3000,
                        },
                        {
                          quest: {
                            type: 'tutorialWild',
                            value: 0,
                            objective: 1,
                            tutorial: true,
                            reward: [
                              {
                                item: 0,
                                quantity: 10,
                              },
                              {
                                quest:
                                {
                                  type: 'tutorialFight',
                                  value: 0,
                                  objective: 1,
                                  tutorial: true,
                                  reward: [
                                    {
                                      item: 4,
                                      quantity: 1,
                                    },
                                    {
                                      quest: {
                                        type: 'tutorialCatch',
                                        value: 0,
                                        objective: 1,
                                        tutorial: true,
                                        reward: [
                                          {
                                            item: 1,
                                            quantity: 5,
                                          },
                                          {
                                            quest:
                                            {
                                              type: 'tutorialShop',
                                              value: 0,
                                              objective: 1,
                                              tutorial: true,
                                              reward: [
                                                {
                                                  item: -1,
                                                  quantity: 3000,
                                                },
                                                {
                                                  quest: {
                                                    type: 'tutorialReward',
                                                    value: 0,
                                                    objective: 1,
                                                    tutorial: true,
                                                    reward: [
                                                      {
                                                        lootbox: 1,
                                                        quantity: 1,
                                                      },
                                                      {
                                                        quest: {
                                                          type: 'tutorialLootbox',
                                                          value: 0,
                                                          objective: 1,
                                                          tutorial: true,
                                                          reward: [
                                                            {
                                                              item: 4,
                                                              quantity: 1,
                                                            },
                                                          ],
                                                        },
                                                      },
                                                    ],
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ]).catch((error) => {
                    Logger.error(error);
                  });

                  createPokemon(context.user.id, starter.dexId, 5, false, pokemon.moves, {
                    hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15,
                  }, 3, false, null, null, pokemon.abilitySlot, pokemon.nature, pokemon.gender).then((pokemon) => {
                    updatePlayer(context.user.id, { selectedPokemon: pokemon.recordId });
                  }).catch((error) => {
                    Logger.error(error);
                  });
                }).catch((error) => {
                  Logger.error(error);
                });
              }, 60000, true);
            }).catch((error) => {
              Logger.error(error);
            });
          }, 60000, true);
        }).catch(() => { });
    } else {
      sendEmbed({ context, message: 'You already started your journey!' });
    }
  },

};
