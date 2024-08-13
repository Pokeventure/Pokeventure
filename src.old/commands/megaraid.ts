import { Command, CommandContext } from 'command';
import moment from 'moment';
import { getImage, sendEmbed } from '../modules/utils';
import Fight from '../modules/fight';
import { incrementQuest } from '../modules/quests';
import {
  getMegaRaid, createMegaRaid, dealDamagesMegaRaid, holdItem, startTimerMegaRaid, getMegaRaidLog, getPlayer,
} from '../modules/database';
import { checkMegaRaid, createRandomMegaRaid } from '../modules/megaraid';
import { sendInfo } from '../modules/pokedex';
import { SlashCommandBuilder } from '@discordjs/builders';
import { increaseResearch, Research } from '../modules/research';

export const MegaRaid: Command = {
  name: 'Mega Raid',
  keywords: ['megaraid', 'mr'],
  category: 'Fight',
  fullDesc: 'Command will start an automated hard fight against the Mega Raid Pokémon.\n**You will need to use a Mega Raid Pass to access to Mega Raids**\nYou will participate to take it down and you will get Mega shards according to your contribution.\n(Note: holdable items will be consumed during Raid fights)\n\nExample: `%PREFIX%megaraid`\nUsage: `%PREFIX%megaraid info` to get informations about moves and more.',
  requireStart: false,
  needPlayer: true,
  showInHelp: true,
  betaRestricted: true,
  canBeBlocked: true,
  commandData: new SlashCommandBuilder()
    .setName('megaraid')
    .setDescription('Fight against the Mega Raid')
    .addBooleanOption(option => option.setName('info').setDescription('Get Mega Raid informations')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      getMegaRaid().then(async (raid) => {
        if (raid === null) {
          await createMegaRaid(createRandomMegaRaid());
          await startTimerMegaRaid();
          raid = await getMegaRaid();
        }

        // if (raid.hp <= 0) { return; }
        if (moment(raid.time) > moment()) {
          if (moment(raid.time).diff(new Date(), 'seconds') > 60) {
            sendEmbed({ context, message: `Next raid will start in ${moment(raid.time).diff(new Date(), 'minutes')} minutes`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, footer: null, title: 'Mega Raid' });
          } else {
            sendEmbed({ context, message: `Next raid will start in ${moment(raid.time).diff(new Date(), 'seconds')} seconds`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, footer: null, title: 'Mega Raid' });
          }
        } else {
          const log = await getMegaRaidLog(context.user.id);
          if (context.commandInterction.options.getBoolean('info')) {
            sendInfo(raid.pokemon, context, false);
            return;
          }
          if (log === null) {
            sendEmbed({ context, message: 'To participate to Mega Raid, you have to use a <:pass:746747476811317258> Mega Raid Pass. You can buy one in the BP Shop.', image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, footer: `HP left: ${raid.hp}/${raid.maxHp}`, title: 'Mega Raid' });
            return;
          }
          const delay = parseInt(<string>process.env.MEGA_DELAY_RAID);
          const timer = await context.client.redis.get(`megaraidtimer-${context.user.id}`);
          if (timer !== null && Date.now() - (parseInt(timer)) <= 0) {
            const timeLeft = Math.round((parseInt(timer) + delay - Date.now()) / 1000);
            sendEmbed({ context, message: `You can fight in the Mega Raid in ${timeLeft}s`, image: null, thumbnail: null, author: context.user });
          } else {
            getPlayer(context.user.id).then(async (player) => {
              const fight: Fight = new Fight();
              const pokemon = player.selectedPokemon;
              if (pokemon === null) {
                sendEmbed({ context, message: 'You must select a Pokémon before.', image: null, thumbnail: null, author: context.user });
                resolve({});
                return;
              }
              raid.pokemon.level = pokemon.level < 100 ? 200 : 110;
              raid.pokemon.item = 'raidreduction';
              fight.start(context, [pokemon], [raid.pokemon], 2, raid.maxHp, raid.hp).then(async (result: any) => {
                context.client.redis.set(`megaraidtimer-${context.user.id}`, Date.now() + result.turn * delay, 'EX', result.turn * delay / 1000);
                if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
                  holdItem(pokemon._id, null);
                }
                const damagesDealt = result.victory === 1 ? raid.hp : Math.max(0, raid.hp - result.hp);
                if (result.victory === 1) {
                  await sendEmbed({ context, message: `You dealt the last hit to **${raid.pokemon.displayName}**.`, image: result.image, thumbnail: null, author: context.user, footer: null, title: 'Mega Raid' });
                } else {
                  await sendEmbed({ context, message: `You dealt ${damagesDealt} damage to **${raid.pokemon.displayName}** in ${result.turn} turns.\nYou can fight raid again in ${(result.turn * delay) / 1000} seconds.`, image: result.image, thumbnail: null, author: context.user, footer: null, title: 'Mega Raid' });
                }
                incrementQuest(context, context.user, 'raid', 1);
                await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
                getMegaRaid().then((raid) => {
                  if (moment(raid.time) < moment()) {
                    dealDamagesMegaRaid(raid._id, context.user.id, Math.max(0, damagesDealt), { id: pokemon.id, special: pokemon.special, moves: pokemon.moves }).then((res) => {
                      checkMegaRaid(context.client, raid._id.toString());
                    }).catch((error) => {
                      reject(error);
                    });
                    resolve({});
                  } else {
                    resolve({});
                  }
                }).catch((error) => {
                  reject(error);
                });
              }).catch((error) => {
                reject(error);
              });
            }).catch((error) => {
              reject(error);
            });
          }
        }
      }).catch((error) => {
        reject(error);
      });
    });
  },
};
