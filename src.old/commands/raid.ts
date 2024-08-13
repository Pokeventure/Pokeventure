import { Command, CommandContext } from 'command';
import moment from 'moment';
import { getImage, sendEmbed } from '../modules/utils';
import Fight from '../modules/fight';
import { incrementQuest } from '../modules/quests';
import {
  getRaid, createRaid, giveExperience, addCoins, dealDamagesRaid, holdItem, startTimerRaid, addExperienceToClan,
} from '../modules/database';
import { getPokemon, sendInfo } from '../modules/pokedex';
import { checkRaid, createRandomRaid } from '../modules/raid';
import { broadcastClanMessage } from '../modules/clan';
import Logger from '../modules/logger';
import { SlashCommandBuilder } from '@discordjs/builders';
import { increaseResearch, Research } from '../modules/research';

const patronMultiplicator = [
  1,
  1.5,
  1.5,
  1.75,
  1.75,
  2,
];

export const Raid: Command = {
  name: 'Raid',
  keywords: ['raid', 'r'],
  category: 'Fight',
  fullDesc: 'Command will start an automated fight against the raid Pokémon.\nYou will participate to take it down and you will earn a reward according to your contribution. Once the raid Pokémon has been taken down, you will have 3 tries to catch it with the `%PREFIX%catch` command.\n(Note: holdable items will be consumed during Raid fights)\n\nExample: `%PREFIX%raid`\nUsage: `%PREFIX%raid info` to get informations about moves and more. (The Pokémon that you will be able to catch will be different)',
  requireStart: true,
  needPlayer: true,
  showInHelp: true,
  earlyAccess: false,
  canBeBlocked: true,
  betaRestricted: true,
  commandData: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Fight against current raid')
    .addBooleanOption(option => option.setName('info').setDescription('Get informations about current raid')),

  handler(context: CommandContext): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let raid: any = await getRaid();
      if (raid === null) {
        await createRaid(createRandomRaid());
        await startTimerRaid();
        raid = await getRaid();
      }

      if (raid.hp <= 0) {
        resolve({});
        return;
      }
      if (moment(raid.time) > moment()) {
        if (moment(raid.time).diff(new Date(), 'seconds') > 60) {
          sendEmbed({ context, message: `Next raid will start in ${moment(raid.time).diff(new Date(), 'minutes')} minutes`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, footer: null, title: 'Raid' });
        } else {
          sendEmbed({ context, message: `Next raid will start in ${moment(raid.time).diff(new Date(), 'seconds')} seconds`, image: getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special), thumbnail: null, author: context.user, footer: null, title: 'Raid' });
        }
      } else {
        if (context.commandInterction.options.getBoolean('info')) {
          await sendInfo(raid.pokemon, context, false);
          await sendEmbed({ context, message: `Raid will end ${moment(raid.time).add(20, 'minutes').fromNow()}.` });
          resolve({});
          return;
        }
        const delay = parseInt(<string>process.env.DELAY_RAID);
        const timer = await context.client.redis.get(`raidtimer-${context.user.id}`);
        if (timer !== null && Date.now() - (parseInt(timer)) <= 0) {
          const timeLeft = Math.round((parseInt(timer) + delay - Date.now()) / 1000);
          sendEmbed({ context, message: `You can fight in the Raid in ${timeLeft}s`, image: null, thumbnail: null, author: context.user });
        } else {
          const patronLevel = context.player?.patronLevel || 0;
          const patronBonusExperience = patronMultiplicator[patronLevel];

          const fight: Fight = new Fight();
          const pokemon = context.player?.selectedPokemon;
          if (pokemon === null) {
            sendEmbed({ context, message: 'You must select a Pokémon before.', author: context.user });
            resolve({});
            return;
          }
          raid.pokemon.level = pokemon.level < 100 ? pokemon.level + Math.round(pokemon.level / 100) : 110;
          raid.pokemon.item = 'raidreduction';
          fight.start(context, [pokemon], [raid.pokemon], 1, raid.maxHp, raid.hp).then(async (result: any) => {
            context.client.redis.set(`raidtimer-${context.user.id}`, Date.now() + result.turn * delay, 'EX', result.turn * delay / 1000);
            if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
              holdItem(pokemon._id, null);
            }
            const experience = Math.round(
              (1 // a
                * (pokemon.firstOwner === pokemon.owner ? 1 : 1.5) // t 1.5 if it's traded
                * (pokemon.luckyEgg === 1 ? 1.25 : 1) // e 1.5 if pokemon has lucky egg
                * getPokemon(raid.pokemon.dexId).base_experience // b
                * raid.pokemon.level // L
                / 7
                * 0.75)
              * patronBonusExperience,
            );
            const clanExperience = Math.floor(experience * 0.1);
            if (context.player?.clan !== null) {
              addExperienceToClan(context.player?.clan._id, context.user.id, clanExperience).then((result) => {
                if (result.levelup) {
                  broadcastClanMessage(context.client, context.player?.clan.channel, context.channel?.id ?? '', `Clan leveled up to level ${context.player?.clan.level + 1}`, 'Level up! 🎉');
                }
              }).catch((error) => {
                Logger.error(error);
              });
            }
            let damagesDealt = result.victory === 1 ? raid.hp : Math.max(0, raid.hp - result.hp);
            if (damagesDealt > 100000) {
              damagesDealt = damagesDealt * 0.75;
            } else if (damagesDealt > 10000) {
              damagesDealt = damagesDealt * 0.85;
            } else if (damagesDealt > 1000) {
              damagesDealt = damagesDealt * 0.95;
            }
            damagesDealt = Math.round(damagesDealt);

            addCoins(context.user.id, Math.round(damagesDealt), 'raid');
            let pokemonRaid = getPokemon(raid.pokemon.dexId, raid.pokemon.special);
            await sendEmbed({ context, message: `You dealt ${damagesDealt} damage to **${pokemonRaid.displayName}** in ${result.turn} turns.\nYou can fight raid again in ${(result.turn * delay) / 1000} seconds.\n\n${pokemon.name} gained ${experience} Exp. points.\n${context.player?.clan !== null ? `Your clan has gained ${clanExperience} Exp. points.\n` : ''}You earned ${Math.round(damagesDealt)} <:pokecoin:741699521725333534> coins.`, image: result.image, thumbnail: null, author: context.user });
            giveExperience(pokemon, experience, context);
            incrementQuest(context, context.user, 'raid', 1);
            await increaseResearch(context, context.user.id, Research.used, pokemon.dexId, context.player?.research?.data);
            getRaid().then(async (raid) => {
              if (moment(raid.time) < moment()) {
                checkRaid(context.client, raid._id);
                dealDamagesRaid(raid._id, context.user.id, Math.max(0, damagesDealt), { dexId: pokemon.dexId, special: pokemon.special, moves: pokemon.moves }).then(() => {
                  resolve({});
                }).catch((error) => {
                  reject(error);
                });
              } else {
                checkRaid(context.client, raid._id);
                const hasTries = await context.client.redis.get(`tries-${context.user.id}`);
                if (hasTries === null) {
                  context.client.redis.set(`tries-${context.user.id}`, '3', 'EX', 60 * 15).catch((e: any) => {
                    Logger.error(e);
                  });
                }
                resolve({});
              }
            }).catch((error) => {
              reject(error);
            });
          }).catch((error) => {
            reject(error);
          });
        }
      }
    });
  },
};
