import { Command, CommandContext } from 'command';
import { choiceMaker, sendEmbed } from '../modules/utils';
import {
  addToTeam, removeFromTeam, getPokemonByNumber, getTeams, createTeam, getTeamByName, setSelectedTeam, updateTeam, deleteTeam,
} from '../modules/database';
import { getPokemon as getPokemonPokedex } from '../modules/pokedex';
import { Pokemon } from 'pokemon';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageEmbed } from 'discord.js';
import Logger from '../modules/logger';

export function makeImageData(pokemons: any) {
  if (pokemons === null) {
    return null;
  }
  const data: any = {
    pokemons: [],
  };
  pokemons.forEach((element: any) => {
    if (element === null) {
      return;
    }
    const pokemon = {
      name: '',
      level: 1,
      shiny: false,
    };
    const info = getPokemonPokedex(element.dexId, element.special);
    pokemon.name = info.displayName;
    pokemon.level = element.level;
    pokemon.shiny = element.shiny;
    data.pokemons.push(pokemon);
  });
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

const TEAM_LIMIT = 9;

export const Team: Command = {
  name: 'Team',
  keywords: ['team', 'teams'],
  category: 'Pokémon',
  fullDesc: 'Manage your Pokémon team. You team can contain up to 3 Pokémon to fight in Gyms or in PvP battles. (Note: Teams can contain only one Mega)\n\nUsage: `%PREFIX%team` to see your selected team and other teams.\nUsage: `%PREFIX%team create <name>` to create a new team (up to 9)\nUsage: `%PREFIX%team add <pokemon id>` to add a Pokémon in your slected team.\nUsage: `%PREFIX%team remove <slot>` to remove a Pokémon from your selected team.\nUsage: `%PREFIX%team rename <name>` to rename you current team.\nUsage: `%PREFIX%team delete <name>` to remove a team.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  commandData: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Manage your teams')
    .addSubcommand(option => option.setName('view').setDescription('View your teams'))
    .addSubcommand(option => option.setName('add').setDescription('Add Pokémon to a team')
      .addIntegerOption(option => option.setName('pokemon').setDescription('Pokémon ID').setRequired(true))
      .addIntegerOption(option => option.setName('slot').setDescription('Slot to place Pokémon')))
    .addSubcommand(option => option.setName('remove').setDescription('Remove a Pokémon to a team')
      .addIntegerOption(option => option.setName('slot').setDescription('Slot to place Pokémon').setRequired(true)))
    .addSubcommand(option => option.setName('create').setDescription('Create a team')
      .addStringOption(option => option.setName('name').setDescription('Team name').setRequired(true)))
    .addSubcommand(option => option.setName('select').setDescription('Select a team')
      .addStringOption(option => option.setName('name').setDescription('Team name').setRequired(true)))
    .addSubcommand(option => option.setName('rename').setDescription('Rename current team').addStringOption(option => option.setName('name').setDescription('Name to rename your team to').setRequired(true)))
    .addSubcommand(option => option.setName('delete').setDescription('Delete a team').addStringOption(option => option.setName('name').setDescription('Name of the team to remove').setRequired(true)))
  ,

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if (context.commandInterction.options.getSubcommand() === 'add') {
        if (context.player?.selectedTeam === null) {
          sendEmbed({ context, message: 'You must create a team before adding a Pokémon to the team. Create it with \`/team create <team name>\`.' });
          resolve({});
          return;
        }
        const pokemonId: number = context.commandInterction.options.getInteger('pokemon', true);
        // Add pokemon to team
        let team = context.player?.selectedTeam;
        getPokemonByNumber(context.user.id, pokemonId - 1, context.player?.sort ?? '_ID_ASC').then((res: Pokemon) => {
          if (res === null) {
            sendEmbed({ context, message: 'No Pokémon match to this number. Check number with `/pokemons`.' });
            resolve({});
            return;
          }
          const toAddPokemon = getPokemonPokedex(res.dexId, res.special);
          if (context.commandInterction.options.getInteger('slot') === null) {
            let teamText = 'Current team:\n';
            for (let i = 0; i < 3; i++) {
              if (team[i] !== undefined && team[i] !== null && res._id.toString() !== team[i]._id.toString() && (res.special === 'mega' && team[i].special === 'mega')) {
                sendEmbed({ context, message: 'You team can contain already a Mega Pokémon. Remove it before.' });
                resolve({});
                return;
              }
              teamText += `${i + 1}. `;
              if (i < team.length && team[i] !== null) {
                const pokemon = getPokemonPokedex(team[i].id, team[i].special);
                teamText += `${pokemon.displayName} (Lvl. ${team[i].level})`;
              } else {
                // Empty
              }
              teamText += '\n';
            }
            sendEmbed({
              context, message: teamText, footer: 'Write 1, 2 or 3 to select a slot', title: `In which slot do you want to add ${res.nickname !== null ? res.nickname : toAddPokemon.displayName}?`, components: [
                {
                  customId: 'choice_1',
                  label: 'Slot 1',
                }, {
                  customId: 'choice_2',
                  label: 'Slot 2',
                }, {
                  customId: 'choice_3',
                  label: 'Slot 3',
                }
              ]
            }).then((message) => {
              choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
                addToTeam(context.player?.selectedTeam._id, res._id, choice - 1).then(() => {
                  sendEmbed({ context, message: `${toAddPokemon.displayName} has been added in slot #${choice} to your team!`, color: 65280 }).then(() => {
                    resolve({});
                  }).catch((error) => {
                    Logger.error(error);
                  });
                }).catch((error) => {
                  reject(error);
                });
              }, 60000, true);
            }).catch((error) => {
              Logger.error(error);
            });
          } else {
            const slot = context.commandInterction.options.getInteger('slot', true);
            if (slot > 0 && slot < 4) {
              addToTeam(context.player?.selectedTeam._id, res._id, slot - 1).then(() => {
                sendEmbed({ context, message: `${toAddPokemon.displayName} has been added in slot #${slot} to your team!`, image: null, thumbnail: null, author: null, footer: null, title: null, color: 65280 });
                resolve({});
              }).catch((error) => {
                reject(error);
              });
            } else {
              sendEmbed({ context, message: 'Slot number should be between between 1 and 3', image: null, thumbnail: null, author: null, footer: null, title: null, color: 65280 });
              resolve({});
            }
          }
        }).catch((e) => {
          reject(e);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'remove') {
        // Remove pokemon from team
        if (context.player?.selectedTeam === null) {
          sendEmbed({ context, message: 'You must create a team before removing a Pokémon to the team. Create it with `/team create <team name>`.' });
          resolve({});
          return;
        }
        const slot: number = context.commandInterction.options.getInteger('slot', true);
        if (slot > 0 && slot < 4) {
          removeFromTeam(context.player?.selectedTeam._id, slot - 1);
          sendEmbed({ context, message: `Slot #${slot} has been emptied.` });
        }
      } else if (context.commandInterction.options.getSubcommand() === 'create') {
        getTeams(context.user.id).then((teams) => {
          if (teams.length < TEAM_LIMIT) {
            let teamName = context.commandInterction.options.getString('name', true);
            createTeam(context.user.id, teamName).then((createTeam) => {
              if (context.player?.selectedTeam === null) {
                setSelectedTeam(context.user.id, createTeam.recordId).then(() => {
                  sendEmbed({ context, message: `Your team **${teamName}** has been created and has been selected.`, image: null, thumbnail: null, author: context.user });
                }).catch((error) => {
                  Logger.error(error);
                });
              } else {
                sendEmbed({ context, message: `Your team **${teamName}** has been created.`, image: null, thumbnail: null, author: context.user });
                resolve({});
              }
            }).catch((e) => {
              reject(e);
            });
          } else {
            sendEmbed({ context, message: `You can't have more than ${TEAM_LIMIT} teams simultaneously.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }
        }).catch((e) => {
          reject(e);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'select') {
        const teamName: string = context.commandInterction.options.getString('name', true);
        getTeamByName(context.user.id, teamName).then((team) => {
          if (team === null) {
            sendEmbed({ context, message: 'No team matches this name.', image: null, thumbnail: null, author: context.user });
            resolve({});
            return;
          }
          setSelectedTeam(context.user.id, team._id).then(() => {
            sendEmbed({ context, message: `You have selected team ${teamName}.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((e) => {
            reject(e);
          });
        }).catch((e) => {
          reject(e);
        });
      } else if (context.commandInterction.options.getSubcommand() === 'rename') {
        let teamName = context.commandInterction.options.getString('name', true);
        if (teamName !== '') {
          updateTeam(context.player?.selectedTeam._id, { name: teamName });
          sendEmbed({ context, message: `Current team has been renamed to **${teamName}**.` });
          resolve({});
          return;
        }
      } else if (context.commandInterction.options.getSubcommand() === 'delete') {
        let teamName = context.commandInterction.options.getString('name', true);
        getTeamByName(context.user.id, teamName).then((team) => {
          if (team === null) {
            sendEmbed({ context, message: 'No team matches this name.', image: null, thumbnail: null, author: context.user });
            resolve({});
            return;
          }
          deleteTeam(team._id).then(() => {
            sendEmbed({ context, message: `You have deleted team ${teamName}.`, image: null, thumbnail: null, author: context.user });
            resolve({});
          }).catch((e) => {
            reject(e);
          });
        }).catch((e) => {
          reject(e);
        });
      } else {
        // Display team
        getTeams(context.user.id).then((teams) => {
          if (teams.length === 0) {
            sendEmbed({ context, message: 'You don\'t have any team!\nYou can create a new one with `/teams create <team name>`', title: `${context.user.username}'s teams` });
            resolve({});
            return;
          }
          let embed = new MessageEmbed();
          let selectedTeam: any;
          for (let i = 0; i < teams.length; i++) {
            let teamPokemons = '';
            let sortedTeam = [];

            teams[i].teamPopulated.sort((a: any, b: any) => {
              return teams[i].team.indexOf(b._id) - teams[i].team.indexOf(a._id);
            });
            for (let j = 0; j < 3; j++) {
              if (teams[i].team[j] !== null && teams[i].team[j] !== undefined) {
                sortedTeam.push(teams[i].teamPopulated.pop() ?? null);
              } else {
                sortedTeam.push(null);
              }
            }
            for (let j = 0; j < sortedTeam.length; j++) {
              if (sortedTeam[j] !== undefined && sortedTeam[j] !== null) {
                teamPokemons += `- ${sortedTeam[j].name} - Lv. ${sortedTeam[j].level}\n`;
              } else {
                teamPokemons += '-\n';
              }
            }
            if (context.player?.selectedTeam !== null && context.player?.selectedTeam._id === teams[i]._id) {
              selectedTeam = sortedTeam;
            }
            embed.addField(`${teams[i].name}`, teamPokemons, true);
          }
          embed.setAuthor(context.user.username, context.user.avatarURL);
          embed.setTitle(`${context.user.username}'s teams`);
          embed.setDescription(`Selected team: ${context.player?.selectedTeam?.name ?? 'None'}`);
          embed.setImage(`http://image.pokeventure.com/gym_show.php?d=${makeImageData(selectedTeam ?? null)}`);
          context.commandInterction.editReply({ embeds: [embed] });
          resolve({});
        }).catch((e) => {
          reject(e);
        });
      }
    });
  },
};
