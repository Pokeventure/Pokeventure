import { Command, CommandContext } from 'command';
import { Encounter, Pokemon, Trainer } from 'pokemon';
import moment from 'moment';
import { incrementQuest } from '../modules/quests';
import { generateEncounter } from '../modules/world';
import { addStats, getPlayer, getPokedex, updatePlayer } from '../modules/database';
import { getImage, isPokemon, isTrainer, sendEmbed } from '../modules/utils';
import { genderEmoji, normalizeName } from '../modules/pokedex';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { type } from 'os';

const rarity = ['<:n_:744200749600211004>', '<:u_:744200749541621851>', '<:r_:744200749554073660>', '<:sr:744200749189431327>', '<:ur:744200749537558588>', '<:lr:746745321660481576>'];

export const Wild: Command = {
  name: 'Wild',
  keywords: ['wild', 'w'],
  category: 'Fight',
  fullDesc: 'Find a wild Pokémon in your current location. Once it has appeared you can catch it with `%PREFIX%catch` command or fight it with command `%PREFIX%fight` to increase your chances to catch it but if your Pokémon faints, wild Pokémon will flee.\n\nExample: `%PREFIX%fight`',
  requireStart: true,
  needPlayer: false,
  showInHelp: true,
  canBeBlocked: true,
  commandData: new SlashCommandBuilder()
    .setName('wild')
    .setDescription('Find a wild Pokémon in your current location.'),

  handler(context: CommandContext): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      let overrideLocation: any = null;
      switch (context.channel?.id) {
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
        case '843481432709791744':
          overrideLocation = 12;
          break;
      }
      /*
        Add player to set with ID and time, check before any request
      */
      if (context.client.encounter[context.user.id] !== undefined && context.client.encounter[context.user.id].fighting !== undefined && context.client.encounter[context.user.id].fighting) {
        sendEmbed({ context, message: 'You are already fighting. You can flee with `/flee`.', image: null, thumbnail: null, author: context.user });
        resolve({});
        return;
      }
      const delay = parseInt(<string>process.env.DELAY_WILD);
      const timer = await context.client.redis.get(`wildtimer-${context.user.id}`);
      if (((timer !== null && Date.now() - (parseInt(timer) + delay) >= 0)
        || timer === null)) {
        getPlayer(context.user.id).then(async (player) => {
          const { selectedPokemon } = player;
          if (selectedPokemon === null) {
            sendEmbed({ context, message: 'You must select a Pokémon before.', image: null, thumbnail: null, author: context.user });
            resolve({});
            return;
          }
          let hasRarityScanner = false;
          let hasShinyScanner = false;
          if (moment(player?.rarityScanner) > moment() || player?.premiumRarityScanner > 0) {
            hasRarityScanner = true;
          }
          if (moment(player?.shinyScanner) > moment() || player?.premiumShinyScanner > 0) {
            hasShinyScanner = true;
          }

          let joinedEvent = false;
          if (new Date() >= new Date(context.client.event.startDate) && new Date() < new Date(context.client.event.endDate) && (player?.event !== undefined && player?.event)) {
            joinedEvent = true;
          }

          const clanBetterRarityOdds = (player?.clan?.perks[0] ?? 0) * 6;
          const shinyClanBonus = (player?.clan?.perks[1] ?? 0) * 4;
          const generatedEncounter: Encounter | null = generateEncounter(overrideLocation === null ? player!.location : overrideLocation, selectedPokemon.level, hasShinyScanner ? shinyClanBonus + 5 : shinyClanBonus + 1, joinedEvent, clanBetterRarityOdds);
          let notifyEvent = false;
          let notifyVote = false;
          if (new Date() >= new Date(context.client.event.startDate) && new Date() < new Date(context.client.event.endDate) && (player?.event === undefined || !player?.event)) {
            notifyEvent = true;
          }
          if (player?.remindVote && moment() >= moment(player.voted).add(12, 'h')) {
            notifyVote = true;
          }
          if (generatedEncounter === null) {
            sendEmbed({ context, message: 'You didn\'t find any Pokémon... Try again!' });
          } else if (isTrainer(generatedEncounter)) {
            context.client.encounter[context.user.id] = generatedEncounter;
            context.client.redis.set(`wildtimer-${context.user.id}`, Date.now(), 'EX', delay / 1000);
            await sendEmbed({
              context, message: `${notifyEvent ? '**An event is currently happening! Join it by using the command `%PREFIX%event`!\n\n**' : ''}${notifyVote ? '**You can vote! Use `/vote` to access vote page.**\n\n' : ''} **${generatedEncounter.name}** wants to fight.`, image: generatedEncounter.sprite, thumbnail: null, author: context.user, footer: 'Fight them by using /fight', title: null, color: null, components: [
                {
                  type: 2,
                  label: 'Fight',
                  style: 1,
                  customId: 'fight',
                  emoji: {
                    name: '⚔️',
                  }
                }
              ]
            });
          } else if (isPokemon(generatedEncounter)) {
            if (player?.premiumRarityScanner > 0 || player?.premiumShinyScanner > 0) {
              updatePlayer(context.user.id, {
                premiumRarityScanner: Math.max(player?.premiumRarityScanner - 1, 0),
                premiumShinyScanner: Math.max(player?.premiumShinyScanner - 1, 0),
              });
            }
            if (generatedEncounter.shiny) {
              incrementQuest(context, context.user, 'wildShiny', 1);
            }
            if (context.client.encounter[context.user.id] !== undefined) {
              clearTimeout(context.client.encounter[context.user.id].timeout);
            }
            generatedEncounter.location = overrideLocation === null ? player!.location : overrideLocation;
            if (generatedEncounter === null) {
              resolve({});
              return;
            }
            const pokedex = await getPokedex(context.user.id);
            let caught = false;
            if (pokedex !== null && pokedex.data !== null && pokedex.data[normalizeName(generatedEncounter.displayName)] !== undefined) {
              caught = true;
            }
            context.client.encounter[context.user.id] = generatedEncounter;
            let premiumScanner = `${player.premiumShinyScanner > 0 ? `(Premium Shiny Scanner has ${player.premiumShinyScanner - 1} usages left.)\n` : ''}${player.premiumRarityScanner > 0 ? `(Premium Rarity Scanner has ${player.premiumRarityScanner - 1} usages left.)\n` : ''}`;
            await sendEmbed({
              context, message: `${notifyEvent ? '**An event is currently happening! Join it by using the command `%PREFIX%event`!\n\n**' : ''}${notifyVote ? '**You can vote! Use `/vote` to access vote page.**\n\n' : ''}A wild ${caught ? '<:pokeball:741809195338432612> ' : ''}**${generatedEncounter?.displayName}** ${genderEmoji[generatedEncounter.gender]} ${generatedEncounter?.shiny ? '✨' : ''} ${hasRarityScanner ? rarity[generatedEncounter?.rarity || 0] : ''} appeared.\nLevel ${generatedEncounter?.level}`, image: getImage(generatedEncounter, true, generatedEncounter?.shiny, generatedEncounter?.special), thumbnail: null, author: context.user, footer: `${premiumScanner}Fight it by using /fight or catch it with /catch`, title: null, color: null, components: [
                {
                  label: 'Fight',
                  customId: 'fight',
                  emoji: {
                    name: '⚔️',
                  },
                  type: 1,
                }
              ]
            });
            context.client.redis.set(`wildtimer-${context.user.id}`, Date.now(), 'EX', delay / 1000);
            incrementQuest(context, context.user, 'tutorialWild', 1);
            addStats(context.user.id, 'wild', 1);
          }
        }).catch((error) => {
          reject(error);
        });
      } else {
        const timeLeft = Math.round((parseInt(timer) + delay - Date.now()) / 1000);
        sendEmbed({ context, message: `You can look for a new wild pokemon in ${timeLeft}s`, image: null, thumbnail: null, author: context.user });
      }
      resolve({});
    });
  },
};
