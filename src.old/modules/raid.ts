import moment from 'moment';
import { Chance } from 'chance';
import {
  getRaid, getRaidLogs, createRaid, clearRaidLogs, deleteRaid, startTimerRaid, addStats,
} from './database';
import Client from './client';
import raids from '../../data/raids';
import { getRndInteger, getImage } from './utils';
import { randomPokemon } from './world';
import Logger from './logger';
import { Routes } from 'discord-api-types/v9';
import { MessageEmbed } from 'discord.js';

export const raidMoves: any = {
  'Water': ['aquatail', 'hydropump'],
  'Electric': ['thunderpunch', 'thunder'],
  'Raid': ['wait', 'wait'],
  'Fire': ['blazekick', 'flamethrower'],
  'Ground': ['earthquake', 'earthpower'],
  'Grass': ['leafblade', 'energyball'],
  'Psychic': ['psychicfangs', 'psystrike'],
  'Bug': ['megahorn', 'bugbuzz'],
  'Dark': ['crunch', 'darkpulse'],
  'Steel': ['irontail', 'flashcannon'],
  'Dragon': ['dragonrush', 'dracometeor'],
  'Fairy': ['playrough', 'moonblast'],
  'Fighting': ['closecombat', 'aurasphere'],
  'Poison': ['crosspoison', 'sludgebomb'],
  'Rock': ['stoneedge', 'powergem'],
  'Flying': ['aeroblast', 'drillpeck'],
  'Ghost': ['shadowpunch', 'shadowball'],
  'Ice': ['icepunch', 'icebeam'],
  'Normal': ['bodyslam', 'swift']
};

let raidLock = false;

function createRandomRaid(excludeFromGeneration = 0) {
  let chance = new Chance();
  const rarityLevel = chance.weighted([0, 1, 2], [4, 3, 2]);

  let weekNumber = parseInt(moment().format('w'));
  const filteredRaids: any = raids[weekNumber % 4].filter((x: any) => x.rarity === rarityLevel && x.id !== excludeFromGeneration);

  const rand = getRndInteger(0, filteredRaids.length);

  let special = null;
  if (filteredRaids[rand].forme !== null) {
    special = chance.pickset(filteredRaids[rand].forme, 1)[0];
  } else {
    special = filteredRaids[rand].special;
  }
  return {
    ...randomPokemon(filteredRaids[rand].id, 100, ['rest', 'explosion', 'lifedew', 'recover', 'wish', 'bellydrum', 'finalgambit', 'swallow', 'leechseed', 'gigadrain', 'leechlife', 'memento', 'metronome', 'healingwish', 'lunardance', 'mistyexplosion', 'selfdestruct', 'steelbeam', 'mindblown'], -1, special, 0, undefined, true),
    rarityLevel,
  };
}

async function checkRaid(client: Client, id: string) {
  const raid: any = await getRaid();
  if (raid === null) { return; }
  if (raidLock) { return; }

  if (moment() > moment(raid.time).add(20, 'minutes')) {
    raidLock = true;
    client.redis.set('raid', JSON.stringify(raid.pokemon)).catch((error: any) => {
      Logger.error(error);
    });
    await deleteRaid(id);
    await startTimerRaid();
    const nextRaid = await getRaid();
    let nextPokemon = null;
    if (nextRaid === null) {
      nextPokemon = createRandomRaid(raid.pokemon);
      await createRaid(nextPokemon);
      await startTimerRaid();
    } else {
      nextPokemon = nextRaid.pokemon;
    }
    if (process.env.DEV !== '1') {
      const embed = new MessageEmbed();
      embed.setDescription(`New raid will start in 15 minutes!\nWill you defeat **${nextPokemon.displayName}?**`)
        .setImage(getImage(nextPokemon, true, nextPokemon.shiny, nextPokemon.special))
        .setTitle('Raid announcement')
        .setTimestamp();
      client.restClient.post(Routes.channelMessages('768862636799819816'), {
        body: {
          embeds: [
            embed
          ]
        }
      }).then((res: any) => {
        client.restClient.post(Routes.channelMessageCrosspost(res.channel_id, res.id), {
          body: {
            embeds: [
              embed
            ]
          }
        });
      }).catch((error) => {
        Logger.error(error);
      });
    }
    const newRaidPokemon = createRandomRaid(raid.pokemon);
    createRaid(newRaidPokemon);
    getRaidLogs().then((logs) => {
      clearRaidLogs();
      logs.forEach((element: any) => {
        client.redis.set(`tries-${element.discord_id}`, '3', 'EX', 60 * 15).catch((error: any) => {
          Logger.error(error);
        });
        addStats(element.discord_id, 'raids', 1).catch(() => { });
        addStats(element.discord_id, 'raidsDamage', element.damageDealt).catch(() => { });
      });
      logs.forEach(async (element: any, index: number) => {
        const embed = new MessageEmbed();
        embed.setDescription(`Raid is finished. You dealt **${element.damageDealt}** damage to raid!\nYou are ranked **#${index + 1}** out ${logs.length} trainers in damage amount on this raid.\n\n__**You have now 3 tries to catch the pokemon! Catch it before next raids starts!**__`)
          .setImage(getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special))
          .setTitle('Raid');
        client.restClient.post(Routes.userChannels(), {
          body: {
            recipient_id: element.discord_id,
          }
        }).then((userChannel: any) => {
          client.restClient.post(Routes.channelMessages(userChannel.id), {
            body: {
              embeds: [
                embed
              ]
            }
          });
        }).catch((error) => {
          Logger.error(error);
        });

        /* const user = await client.discordClient.getRESTUser(element.discord_id);
        if (user !== undefined) {
          user.getDMChannel().then((channel) => {
            const embed = new MessageEmbed();
            embed.setDescription(`Raid is finished. You dealt **${element.damageDealt}** damage to raid!\nYou are ranked **#${index + 1}** out ${logs.length} trainers in damage amount on this raid.\n\n__**You have now 3 tries to catch the pokemon! Catch it before next raids starts!**__`)
              .setImage(getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special))
              .setTitle('Raid');
            channel.createMessage(embed.getObject());
          }).catch((error) => {
            Logger.error(error);
          });
        } */
      });
      raidLock = false;
    }).catch((error) => {
      Logger.error(error);
    });
  }
}

export {
  checkRaid, createRandomRaid,
};
