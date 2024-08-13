import { Command, CommandContext } from 'command';
import moment from 'moment';
import { choiceMaker, getRndInteger, sendEmbed, sleep } from '../modules/utils';
import {
  getGym, resetGym, addBattlePoints, holdItem, addStats, updateGym, createGym
} from '../modules/database';
import Fight from '../modules/fight';
import { getMoves, getPokemon, typeEmoji } from '../modules/pokedex';
import {
  kanto, johto, hoenn, sinnoh, unova, kalos, alola, galar,
} from '../../data/gyms';
import { randomNature } from '../modules/world';
import { incrementQuest } from '../modules/quests';
import { Pokemon } from 'pokemon';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { ButtonInteraction, MessageEmbed } from 'discord.js';

const region: any = [
  kanto,
  johto,
  hoenn,
  sinnoh,
  unova,
  kalos,
  alola,
  galar,
];

const regionName: string[] = [
  'Kanto',
  'Johto',
  'Hoenn',
  'Sinnoh',
  'Unova',
  'Kalos',
  'Alola',
  'Galar',
];

const league = [
  'Standard League',
  'Expert League',
  'Master League',
  'Nightmare League',
  'Ultra Nightmare League',
];

const keyword = [
  'standard',
  'expert',
  'master',
  'nightmare',
  'ultranightmare',
];

const levelPerLeague = [
  50,
  75,
  100,
  120,
  120,
];

function makeImageData(pokemons: any) {
  const data: any = {
    pokemons: [],
  };
  pokemons.forEach((element: any) => {
    const pokemon = {
      name: '',
      level: 1,
      shiny: false,
    };
    const info = getPokemon(element.dexId, element.special);
    pokemon.name = info.displayName;
    pokemon.level = element.level;
    data.pokemons.push(pokemon);
  });
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function promptRegion(context: CommandContext) {
  sendEmbed({
    context, message: 'Select your region where you want to fight gyms for this reset', title: 'Gym', author: context.user, components: [
      {
        customId: 'choice_0',
        label: 'Kanto',
      }, {
        customId: 'choice_1',
        label: 'Johto',
      }, {
        customId: 'choice_2',
        label: 'Hoenn',
      }, {
        customId: 'choice_3',
        label: 'Sinnoh',
      }, {
        customId: 'choice_4',
        label: 'Unova',
      }, {
        customId: 'choice_5',
        label: 'Kalos',
      }, {
        customId: 'choice_6',
        label: 'Alola',
      }, {
        customId: 'choice_7',
        label: 'Galar',
      },
    ]
  }).then((message) => {
    choiceMaker(context.client.discordClient, context.user.id, message.id, (interaction: ButtonInteraction, user: string, choice: number) => {
      interaction.reply(`You selected **${regionName[choice]}** region.\n\nYou can now fight all trainers in this region to get some rewards.\n\nDo \`/gym view\` to see what are trainers available to fight or \`/gym fight\` to start fighting.`);
      createGym({
        discord_id: context.user.id,
        join: new Date(),
        selectedRegion: choice,
        difficultyLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        selectedDifficulty: 0,
      });
    }, 60000, true);
  }).catch((error) => {
    Logger.error(error);
  });
}

function gymFight(context: CommandContext, choice: number) {
  if (context.client.fights[context.user.id] !== undefined) {
    sendEmbed({ context, message: 'You are already fighting in a Gym, try again when your fight is over. If you want, you can flee with the command `%PREFIX%flee`' });
    return;
  }
  getGym(context.user.id).then((res) => {
    let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let selectedRegion = 0;
    let selectedDifficulty = 0;
    if (res === null) {
      promptRegion(context);
      return;
    }
    if (res !== null) {
      difficultyLevels = res.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      selectedRegion = res.selectedRegion || 0;
      selectedDifficulty = res.selectedDifficulty || 0;
    }
    if(choice === -1) {
      choice = difficultyLevels[selectedDifficulty];
    }
    const selectedGym = region[selectedRegion][choice];
    if (choice > difficultyLevels[selectedDifficulty]) {
      sendEmbed({ context, message: `You need to defeat previous trainers. Next fight is **${region[selectedRegion][difficultyLevels[selectedDifficulty]].name}**.` });
      return;
    } if (choice < 0 || choice >= 13 || isNaN(choice)) {
      sendEmbed({ context, message: 'Invalid choice' });
      return;
    }
    const team = context.player?.selectedTeam;
    const playerTeam: any[] = [];
    if (selectedDifficulty === 4) {
      const selectedPokemon = context.player?.selectedPokemon;
      playerTeam.push(selectedPokemon);
    } else {
      if (team === null) {
        sendEmbed({ context, message: 'Before fighting, you need to create a team before fighting in a Gym. Use the command `%PREFIX%team` to build your team.' });
        return;
      }
      team.teamPopulated.sort((a: any, b: any) => {
        return team.team.indexOf(b._id) - team.team.indexOf(a._id);
      });
      for (let j = 0; j < 3; j++) {
        if (team.team[j] !== null && team.team[j] !== undefined) {
          let pokemonToAdd = team.teamPopulated.pop() ?? null;
          if (pokemonToAdd !== null) {
            playerTeam.push(pokemonToAdd);
          }
        }
      }
    }
    if (playerTeam.length <= 0) {
      sendEmbed({ context, message: 'Before fighting, you need to add Pokémons to your team. Use the command `%PREFIX%team` to build your team.' });
      return;
    }
    const enemyTeam: any[] = [];
    selectedGym.pokemons.forEach((pokemon: any) => {
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
        level: levelPerLeague[selectedDifficulty],
        ivs: {
          hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31,
        },
        shiny: false,
        forme: undefined,
        nature: randomNature(),
        ability: '0',
      };
      enemyTeam.push(pokemonResult);
    });
    sendEmbed({ context, message: `**${selectedGym.name}**, wants to fight!`, image: `http://image.pokeventure.com/gym_show.php?d=${makeImageData(enemyTeam)}` });
    const fight: Fight = new Fight();
    context.client.fights[context.user.id] = fight;
    sleep(100).then(() => {
      fight.start(context, playerTeam, enemyTeam, 0, -1, -1, -1, context.user.username, selectedGym.name, true).then(async (result: any) => {
        getGym(context.user.id).then((res) => {
          if (res !== null) {
            difficultyLevels = res.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
            selectedRegion = res.selectedRegion || 0;
            selectedDifficulty = res.selectedDifficulty || 0;
          }
          if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
            for (let i = 0; i < result.consumedItem.length; i++) {
              holdItem(playerTeam[result.consumedItem[i]]._id, null);
            }
          }
          if (context.client.fights[context.user.id] !== undefined) {
            delete context.client.fights[context.user.id];
          }
          if (result.inactive !== undefined) {
            sendEmbed({ context, message: 'You left the fight due to inactivity.' });
            return;
          }
          if (result.victory) {
            let firstClear = false;
            if (difficultyLevels[selectedDifficulty] === choice) {
              difficultyLevels[selectedDifficulty]++;
              if (res === undefined || res.join === undefined) {
                updateGym(context.user.id, { difficultyLevels, join: new Date() });
              } else {
                updateGym(context.user.id, { difficultyLevels });
              }
              firstClear = true;
            }
            if (firstClear) {
              addStats(context.user.id, 'gyms', 1);
              if (choice === region[selectedRegion].length - 1) {
                incrementQuest(context, context.user, 'gymClearDifficulty', 1, selectedDifficulty);
                incrementQuest(context, context.user, 'gymClearRegion', 1, selectedRegion);
                const battlePoints = [7, 9, 12, 25, 40];

                addBattlePoints(context.user.id, battlePoints[selectedDifficulty]);
                sendEmbed({ context, message: `You defeated **${selectedGym.name}**!\n\nYou defeated the ${league[selectedDifficulty]}! ${selectedDifficulty < league.length - 1 ? `You can now try a more challenging league and fight for the ${league[selectedDifficulty + 1]}. Join it by doing \`%PREFIX%gym ${keyword[selectedDifficulty + 1]}\`` : ''}!\n\nYou got x${battlePoints[selectedDifficulty]} BP <:bp:797019879337230356> for beating it today.`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Congratulations!', color: 2263842 });
              } else {
                addBattlePoints(context.user.id, 2);
                sendEmbed({ context, message: `You defeated ${selectedGym.name}**!\nYou earned 2 BP <:bp:797019879337230356>!\n\n You can now fight against ${region[selectedRegion][choice + 1].name}** ${typeEmoji[region[selectedRegion][choice + 1].type]}.`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Congratulations!', color: 2263842 });
              }
            } else {
              sendEmbed({ context, message: `You defeated **${selectedGym.name}**!`, image: null, thumbnail: null, author: context.user, footer: null, title: 'Congratulations!', color: 2263842 });
            }
          } else {
            sendEmbed({ context, message: 'You should train more your Pokémons or get stronger Pokémon!\nDon\'t forget about weaknesses and use them to fight against trainers.', image: null, thumbnail: null, author: context.user, footer: null, title: 'Oh no! You have lost.' });
          }
        }).catch((error) => {
          Logger.error(error);
        });
      }).catch((error) => {
        Logger.error(error);
      });
    }).catch((error) => {
      Logger.error(error);
    });
  }).catch((error) => {
    Logger.error(error);
  });
}

export const Gym: Command = {
  name: 'Gym',
  keywords: ['gym'],
  category: 'Fight',
  fullDesc: 'Participate to Gym fights! Prepare your team with the command \`%PREFIX%team\` and try to defeat every trainers! You can reset your progression to get rewards again every 24 hours.\n(Note: holdable items will be consumed during Gym fights)\n\nUsage: `%PREFIX%gym`\nUsage: `%PREFIX%gym <league>` to change League (league can be `standard`, `expert`, `master`, `nightmare`)\nUsage: `%PREFIX%gym reset` to reset your progression once a day.',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  canBeBlocked: true,
  commandData: new SlashCommandBuilder()
    .setName('gym')
    .setDescription('Send money to an other play.')
    .addSubcommand(input => input.setName('view').setDescription('View gyms'))
    .addSubcommand(input => input.setName('difficulty').setDescription('Change gym difficulty')
      .addStringOption(option => option.setName('difficulty').setDescription('Difficulty')
        .addChoice('Standard League', 'standard')
        .addChoice('Expert League', 'expert')
        .addChoice('Master League', 'master')
        .addChoice('Nightmare League', 'nightmare')
        .addChoice('Ultra Nightmare League', 'ultranightmare')
        .setRequired(true)
      ))
    .addSubcommand(input => input.setName('reset').setDescription('View gyms'))
    .addSubcommand(input => input.setName('fight').setDescription('Fight gym')
      .addIntegerOption(option => option.setName('trainer').setDescription('Trainer to fight'))),

  handler(context: CommandContext): Promise<any> {
    return new Promise((resolve, reject) => {
      if (context.commandInterction.options.getSubcommand(true) === 'reset') {
        if (context.client.fights[context.user.id] !== undefined) {
          return;
        }
        getGym(context.user.id).then((res) => {
          if (res !== null && res.join !== null) {
            const resetTime = moment(res.join).add(20, 'hour');
            if (moment() > resetTime) {
              resetGym(context.user.id);
              sendEmbed({ context, message: 'Gym progression has been reseted.' });
            } else {
              sendEmbed({ context, message: `You will able be to reset in ${moment().to(resetTime)}` });
            }
          } else {
            sendEmbed({ context, message: 'You have to start participating to Gyms before reseting.' });
          }
          resolve({});
        }).catch((error) => {
          reject(error);
        });
      } else if (context.commandInterction.options.getSubcommand(true) === 'fight') {
        const choice = (context.commandInterction.options.getInteger('trainer') ?? 0) - 1;
        gymFight(context, choice);
        resolve({});
      } else if (context.commandInterction.options.getSubcommand(true) === 'difficulty') {
        getGym(context.user.id).then((res) => {
          let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          if (res === null) {
            promptRegion(context);
            return;
          }
          if (res !== null) {
            difficultyLevels = res.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
          }
          const selectedLeague = keyword.indexOf(context.commandInterction.options.getString('difficulty', true));
          if (selectedLeague === 0 || difficultyLevels[selectedLeague - 1] >= region[selectedLeague - 1].length) {
            updateGym(context.user.id, { selectedDifficulty: selectedLeague });
            sendEmbed({ context, message: `Switched to **${league[selectedLeague]}**.`, image: null, thumbnail: null, author: context.user });
          } else {
            sendEmbed({ context, message: `You didn't unlock **${league[selectedLeague]}** yet. Beat the previous League to access it.`, image: null, thumbnail: null, author: context.user });
          }
        }).catch((error) => {
          Logger.error(error);
        });
      } else {
        getGym(context.user.id).then((res) => {
          let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          let selectedRegion = 0;
          let selectedDifficulty = 0;
          if (res === null) {
            promptRegion(context);
            return;
          }
          if (res !== null) {
            difficultyLevels = res.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
            selectedRegion = res.selectedRegion || 0;
            selectedDifficulty = res.selectedDifficulty || 0;
          }

          const nextTrainer = difficultyLevels[selectedDifficulty];
          const embed = new MessageEmbed();
          embed.addField('Gyms', `\`#1\` ${region[selectedRegion][0].name} ${typeEmoji[region[selectedRegion][0].type[0]]} ${nextTrainer > 0 ? ':white_check_mark: ' : ':x:'}\n\`#2\` ${region[selectedRegion][1].name} ${typeEmoji[region[selectedRegion][1].type[0]]} ${nextTrainer > 1 ? ':white_check_mark: ' : ':x:'}\n\`#3\` ${region[selectedRegion][2].name} ${typeEmoji[region[selectedRegion][2].type[0]]} ${nextTrainer > 2 ? ':white_check_mark: ' : ':x:'}\n\`#4\` ${region[selectedRegion][3].name} ${typeEmoji[region[selectedRegion][3].type[0]]} ${nextTrainer > 3 ? ':white_check_mark: ' : ':x:'}`, true);
          embed.addField('\u2800', `\`#5\` ${region[selectedRegion][4].name} ${typeEmoji[region[selectedRegion][4].type[0]]} ${nextTrainer > 4 ? ':white_check_mark: ' : ':x:'}\n\`#6\` ${region[selectedRegion][5].name} ${typeEmoji[region[selectedRegion][5].type[0]]} ${nextTrainer > 5 ? ':white_check_mark: ' : ':x:'}\n\`#7\` ${region[selectedRegion][6].name} ${typeEmoji[region[selectedRegion][6].type[0]]} ${nextTrainer > 6 ? ':white_check_mark: ' : ':x:'}\n\`#8\` ${region[selectedRegion][7].name} ${typeEmoji[region[selectedRegion][7].type[0]]} ${nextTrainer > 7 ? ':white_check_mark: ' : ':x:'}`, true);
          embed.addField('\u2800', '\u2800', true);

          embed.addField('Elite Four', `\`#9\` ${region[selectedRegion][8].name} ${typeEmoji[region[selectedRegion][8].type[0]]} ${nextTrainer > 8 ? ':white_check_mark: ' : ':x:'}\n\`#10\` ${region[selectedRegion][9].name} ${typeEmoji[region[selectedRegion][9].type[0]]} ${nextTrainer > 9 ? ':white_check_mark: ' : ':x:'}`, true);
          embed.addField('\u2800', `\`#11\` ${region[selectedRegion][10].name} ${typeEmoji[region[selectedRegion][10].type[0]]} ${nextTrainer > 10 ? ':white_check_mark: ' : ':x:'}\n\`#12\` ${region[selectedRegion][11].name} ${typeEmoji[region[selectedRegion][11].type[0]]} ${nextTrainer > 11 ? ':white_check_mark: ' : ':x:'}`, true);
          embed.addField('\u2800', '\u2800', true);

          embed.addField('Champion', `\`#13\` ${region[selectedRegion][12].name} ${typeEmoji[region[selectedRegion][12].type[0]]} ${nextTrainer > 12 ? ':white_check_mark: ' : ':x:'}`, true);

          let canReset = false;
          let timeLeftBeforeReset = '';
          if (res !== undefined && res.join !== undefined) {
            const resetTime = moment(res.join).add(20, 'hours');
            if (moment() > resetTime) {
              canReset = true;
            } else {
              timeLeftBeforeReset = moment().to(resetTime);
            }
          }
          let nextText = '';
          if (difficultyLevels[selectedDifficulty] >= region[selectedDifficulty].length && selectedDifficulty < league.length - 1) {
            nextText = `\n**__You can access to next League by doing \`/gym ${keyword[selectedDifficulty + 1]}\`__**`;
          }
          embed.setDescription(`What gym do you want to run for?\n\n**${regionName[selectedRegion]} ${league[selectedDifficulty]} [${difficultyLevels[selectedDifficulty]}/13]**${canReset ? '\n\nYou can reset your Gym progression to run for rewards again.\nSay \`/gym reset\`' : timeLeftBeforeReset !== '' ? `\n\nYou will be able to reset your progression ${timeLeftBeforeReset}` : ''}${nextText}`);
          embed.setColor('#00ffff');
          embed.setTitle('Gym');
          embed.setFooter(`${nextTrainer <= 12 ? `Next fight is #${nextTrainer + 1}. Do '/gym fight' to fight it.` : 'You finished to fight this league. You can go to next one or fight again in this league'}`);

          embed.setAuthor(context.user.username, context.user.avatarURL);

          context.commandInterction.editReply({ embeds: [embed] });
        }).catch((error) => {
          reject(error);
        });
      }
    });
  },
};
