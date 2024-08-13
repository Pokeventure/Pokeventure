import { Command, CommandContext } from 'command';
import { sendEmbed, getRndInteger, isPokemon, isTrainer } from '../modules/utils';
import Fight from '../modules/fight';
import { incrementQuest } from '../modules/quests';
import { getMoves, getPokemon } from '../modules/pokedex';
import {
  giveExperience, addCoins, getInventory, addStats, addToInventory, addExperienceToClan,
} from '../modules/database';
import { Pokemon } from 'pokemon';
import Logger from '../modules/logger';
import { randomNature } from '../modules/world';
import { Chance } from 'chance';
import items from '../../data/items';
import { broadcastClanMessage } from '../modules/clan';
import { MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { increaseResearch } from '../modules/research';
import { Research } from '../modules/research';

const patronMultiplicator = [
  1,
  1.5,
  1.5,
  1.75,
  1.75,
  2,
];

export const FightCommand: Command = {
  name: 'Fight',
  keywords: ['fight', 'f'],
  category: 'Fight',
  fullDesc: 'Command will start an automated fight against the wild Pokémon you are facing with your selected Pokémon.\nIf you win the battle, the wild Pokémon will be easier to catch and you will receive experience for your selected Pokémon and Pokécoins for you.\nIf you lose, the wild Pokémon will flee.\nTo find a wild Pokémon, do the command `%PREFIX%wild` in a location that has wild Pokémons.\n\nExample: `%PREFIX%fight`',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  canBeBlocked: false,
  commandData: new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Fight against the wild Pokémon.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (context.client.encounter[context.user.id] === undefined) {
        return;
      } if (context.client.encounter[context.user.id].fighting || context.client.encounter[context.user.id].fainted) {
        return;
      }
      context.client.encounter[context.user.id].fighting = true;
      if (isPokemon(context.client.encounter[context.user.id])) {
        const wildPokemon: Pokemon = context.client.encounter[context.user.id];
        const pokemonTypes = getPokemon(wildPokemon.dexId).types;
        const fight: Fight = new Fight();
        const pokemon: Pokemon = context.player?.selectedPokemon;
        let overrideLocation: any = null;
        switch (context.interaction.channelId) {
          case '666958735716909077':
            overrideLocation = 0;
            break;
          case '750735344579641454':
            overrideLocation = 1;
            break;
          case '750735637405237308':
            overrideLocation = 2;
            break;
          case '750736583354875924':
            overrideLocation = 3;
            break;
          case '750736429272924191':
            overrideLocation = 4;
            break;
          case '750736966487900282':
            overrideLocation = 5;
            break;
          case '750737179231256649':
            overrideLocation = 6;
            break;
          case '750736143955394630':
            overrideLocation = 7;
            break;
          case '750737450409787523':
            overrideLocation = 8;
            break;
          case '750737590805725265':
            overrideLocation = 9;
            break;
          case '750737791268421775':
            overrideLocation = 10;
            break;
          case '750737946692288572':
            overrideLocation = 11;
            break;
        }
        const patronLevel = context.player?.patronLevel || 0;
        const patronBonusExperience = patronMultiplicator[patronLevel];
        const clanBonusExperience = context.player?.clan?.perks[2] ?? 0;

        fight.start(context, [pokemon], [wildPokemon], 0, -1, -1, overrideLocation === null ? context.player?.location : overrideLocation).then(async (result: any) => {
          if (result.victory) {
            if (context.client.encounter[context.user.id] !== undefined) {
              context.client.encounter[context.user.id].fainted = true;
              context.client.encounter[context.user.id].fighting = false;
            }

            let baseExperience = Math.round(
              (1 // a
                * (pokemon.firstOwner === pokemon.owner ? 1 : 1.5) // t 1.5 if it's traded
                * (pokemon.luckyEgg ? 1.25 : 1) // e 1.5 if pokemon has lucky egg
                * getPokemon(wildPokemon.dexId).base_experience // b
                * wildPokemon.level // L
                / 7
                * 1.15)
            );
            let clanBonus = Math.round(baseExperience * (1 + clanBonusExperience * 0.2)) - baseExperience;
            let patronBonus = Math.round(baseExperience * patronBonusExperience) - baseExperience;
            let totalExperience = baseExperience + clanBonus + patronBonus;

            let clanExperience = Math.round(totalExperience * 0.1);
            if (context.player?.clan !== null) {
              addExperienceToClan(context.player?.clan._id, context.user.id, clanExperience).then((result) => {
                if (result.levelup) {
                  broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', `Clan leveled up to level ${context.player?.clan.level + 1}`, 'Level up! 🎉');
                }
              }).catch((error) => {
                Logger.error(error);
              });
            }
            const coins = getRndInteger(pokemon.level * 2, pokemon.level * 5);
            addCoins(context.user.id, coins, 'fight');
            const inventory = await getInventory(context.user.id);
            let answer = `The wild **${wildPokemon.displayName}** fainted!\n${getPokemon(pokemon.dexId).displayName} gained ${totalExperience} Exp. points.\n${context.player?.clan !== null ? `(Bonus from clan: ${clanBonus} Exp)\n` : ''}${patronBonus !== 0 ? `(Bonus from Patreon: ${patronBonus} Exp)\n` : ''}${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.\n` : ''}You earned ${coins} <:pokecoin:741699521725333534> coins.\n\n__You have a chance to catch it!__
\n(You have <:pokeball:741809195338432612> x${inventory !== null && inventory.inventory !== null && inventory.inventory[0] !== undefined && inventory.inventory[0].quantity > 0 ? inventory.inventory[0].quantity : 0}, <:greatball:741809195057283174> x${inventory !== null && inventory.inventory !== null && inventory.inventory[1] !== undefined && inventory.inventory[1].quantity > 0 ? inventory.inventory[1].quantity : 0}, <:ultraball:741809195061477417> x${inventory !== null && inventory.inventory !== null && inventory.inventory[2] !== undefined && inventory.inventory[2].quantity > 0 ? inventory.inventory[2].quantity : 0}, <:masterball:741809195178917999> x${inventory !== null && inventory.inventory !== null && inventory.inventory[3] !== undefined && inventory.inventory[3].quantity > 0 ? inventory.inventory[3].quantity : 0})*`;
            let components: any[] = [];
            if (inventory !== null && inventory.inventory !== null && inventory.inventory[0] !== undefined && inventory.inventory[0].quantity > 0) {
              components.push({
                type: 2,
                label: 'Pokeball',
                style: 1,
                customId: 'catch_pb',
                emoji: {
                  id: '741809195338432612',
                  name: 'pokeball'
                }
              });
            }
            if (inventory !== null && inventory.inventory !== null && inventory.inventory[1] !== undefined && inventory.inventory[1].quantity > 0) {
              components.push({
                type: 2,
                label: 'Greatball',
                style: 1,
                customId: 'catch_gb',
                emoji: {
                  id: '741809195057283174',
                  name: 'greatball'
                }
              });
            }
            if (inventory !== null && inventory.inventory !== null && inventory.inventory[2] !== undefined && inventory.inventory[2].quantity > 0) {
              components.push({
                type: 2,
                label: 'Ultraball',
                style: 1,
                customId: 'catch_ub',
                emoji: {
                  id: '741809195061477417',
                  name: 'ultraball'
                }
              });
            }
            if (inventory !== null && inventory.inventory !== null && inventory.inventory[3] !== undefined && inventory.inventory[3].quantity > 0) {
              components.push({
                type: 2,
                label: 'Masterball',
                style: 1,
                customId: 'catch_mb',
                emoji: {
                  id: '741809195178917999',
                  name: 'masterball'
                }
              });
            }
            sendEmbed({ context, message: answer, image: result.image, author: context.user, components: components }).then(async (message) => {
              incrementQuest(context, context.user, 'defeat', 1);
              incrementQuest(context, context.user, 'tutorialFight', 1);
              incrementQuest(context, context.user, 'winFight', 1, pokemon.dexId);
              incrementQuest(context, context.user, 'fightType', 1, pokemonTypes);
              await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
              giveExperience(pokemon, totalExperience, context);
              try {
                context.client.encounter[context.user.id].timeout = setTimeout(() => {
                  if (context.interaction.isButton()) {
                    context.buttonInteraction.editReply({ embeds: [{ description: `**${getPokemon(pokemon.dexId).displayName}** gained **${totalExperience}** Exp. points.\n${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.\n` : ''}You earned ${coins} <:pokecoin:741699521725333534> coins.\n\n${wildPokemon.displayName} woke up and fled!` }] });
                  } else {
                    context.commandInterction.editReply({ embeds: [{ description: `**${getPokemon(pokemon.dexId).displayName}** gained **${totalExperience}** Exp. points.\n${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.\n` : ''}You earned ${coins} <:pokecoin:741699521725333534> coins.\n\n${wildPokemon.displayName} woke up and fled!` }] });
                  }
                  delete context.client.encounter[context.user.id];
                }, 30000);
              } catch (error) {
                Logger.error(error);
              }
              resolve({});
            }).catch((error) => {
              reject(error);
            });
          } else {
            let baseExperience = Math.round(
              (1 // a
                * (pokemon.firstOwner === pokemon.owner ? 1 : 1.5) // t 1.5 if it's traded
                * (pokemon.luckyEgg ? 1.25 : 1) // e 1.5 if pokemon has lucky egg
                * getPokemon(wildPokemon.dexId).base_experience // b
                * wildPokemon.level // L
                / 7
                * 0.65) // Half in case of loss
            );
            let clanBonus = Math.round(baseExperience * (1 + clanBonusExperience * 0.2)) - baseExperience;
            let patronBonus = Math.round(baseExperience * patronBonusExperience) - baseExperience;
            let totalExperience = baseExperience + clanBonus + patronBonus;

            let clanExperience = Math.round(totalExperience * 0.1);
            if (context.player?.clan !== null) {
              addExperienceToClan(context.player?.clan._id, context.user.id, clanExperience).then((result) => {
                if (result.levelup) {
                  broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', `Clan leveled up to level **${context.player?.clan.level + 1}**`, 'Level up! 🎉');
                }
              }).catch((error) => {
                Logger.error(error);
              });
            }
            sendEmbed({ context, message: `Your **${getPokemon(pokemon.dexId).displayName}** fainted. The wild **${wildPokemon.displayName}** fled.\n\n${pokemon.name} gained ${totalExperience} Exp. points.\n${context.player?.clan !== null ? `(Bonus from clan: ${clanBonus} Exp)\n` : ''}${patronBonus !== 0 ? `(Bonus from Patreon: ${patronBonus} Exp)\n` : ''}${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.` : ''}`, image: result.image, thumbnail: null, author: context.user }).then(async () => {
              incrementQuest(context, context.user, 'tutorialFight', 1);
              incrementQuest(context, context.user, 'fightType', 1, pokemonTypes);
              incrementQuest(context, context.user, 'fightType', 1, pokemonTypes);
              await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
              giveExperience(pokemon, totalExperience, context);
              resolve({});
            }).catch((error) => {
              Logger.error('Error here');
              Logger.error(error);
            });
            delete context.client.encounter[context.user.id];
          }
        }).catch((error) => {
          reject(error);
        });
      } else if (isTrainer(context.client.encounter[context.user.id])) {
        context.client.encounter[context.user.id].fighting = true;
        const fight: Fight = new Fight();
        context.client.fights[context.user.id] = fight;

        let enemyTeam: any[] = [];
        context.client.encounter[context.user.id].pokemons.forEach((pokemon: any) => {
          const data = getPokemon(pokemon);
          const moves = [];
          let moveset = getMoves(data.dexId, data.forme);
          moveset = moveset.filter((x: any) => (x.category === 'Special' || x.category === 'Physical') && x.power >= 50);
          const movesetCount = moveset.length;
          for (let i = 0; i < Math.min(4, movesetCount); i++) {
            moves.push(moveset.splice(getRndInteger(0, moveset.length), 1)[0].move);
          }
          const pokemonResult: any = {
            dexId: data.dexId,
            displayName: data.displayName,
            name: data.displayName,
            special: data.forme,
            moves,
            level: Math.max(1, Math.floor(context.player?.selectedPokemon.level * 0.85)),
            ivs: {
              hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10,
            },
            shiny: false,
            forme: undefined,
            nature: randomNature(),
            ability: '0',
          };
          enemyTeam.push(pokemonResult);
        });

        fight.start(context, [context.player?.selectedPokemon], enemyTeam, 0, -1, -1, -1, context.user.username, context.client.encounter[context.user.id].name, true).then(async (result: any) => {
          if (result.victory) {
            let chance = new Chance();
            let drop: number = chance.weighted(context.client.encounter[context.user.id].reward, context.client.encounter[context.user.id].odds);
            let quantity: number = chance.integer({ min: 1, max: 5 });
            sendEmbed({ context, message: `You won against **${context.client.encounter[context.user.id].name}**.\n\nThey left some stuff behind them:\n__**x${quantity} ${items[drop].emoji} ${items[drop].name}** and <:pokecoin:741699521725333534> **${context.client.encounter[context.user.id].money}** coins.__`, image: null, thumbnail: null, author: context.user, footer: null, title: null, color: 65280 });
            addStats(context.user.id, 'trainerDefeated', 1);
            addToInventory(context.user.id, drop, quantity);
            addCoins(context.user.id, context.client.encounter[context.user.id].money, 'fight');
            incrementQuest(context, context.user, 'defeatSpecificTrainer', 1, context.client.encounter[context.user.id].name);
            incrementQuest(context, context.user, 'defeatTrainer', 1);
          } else {
            sendEmbed({ context, message: 'Defeat' });
          }
          delete context.client.fights[context.user.id];
          delete context.client.encounter[context.user.id];
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
