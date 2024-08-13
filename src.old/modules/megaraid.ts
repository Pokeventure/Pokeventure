import moment from 'moment';
import { Chance } from 'chance';
import {
    getMegaRaid, getMegaRaidLogs, createMegaRaid, clearMegaRaidLogs, deleteMegaRaid, startTimerMegaRaid, addToInventory,
} from './database';
import Client from './client';
import megaraids from '../../data/megaraids';
import { getRndInteger, getImage } from './utils';
import { randomPokemon } from './world';
import items from '../../data/items';
import Logger from './logger';
import { MessageEmbed } from 'discord.js';
import { Routes } from 'discord-api-types/v9';

let raidLock = false;

function createRandomMegaRaid(excludeFromGeneration = 0) {
    const chance = new Chance();
    const rarityLevel = chance.weighted([0, 1, 2, 3], [5, 4, 3, 1]);
    const filteredRaids = megaraids.filter((x: any) => x.id !== excludeFromGeneration && x.rarity === rarityLevel);

    const rand = getRndInteger(0, filteredRaids.length);

    return {
        ...randomPokemon(filteredRaids[rand].id, 150, ['rest', 'explosion', 'lifedew', 'recover', 'wish', 'bellydrum', 'finalgambit', 'swallow', 'leechseed', 'gigadrain', 'leechlife', 'memento', 'metronome', 'healingwish', 'lunardance', 'mistyexplosion', 'selfdestruct', 'steelbeam'], 1, filteredRaids[rand].special, 5, undefined, true),
        drop: filteredRaids[rand].drop,
        rarityLevel,
    };
}

async function checkMegaRaid(client: Client, id: string) {
    const raid: any = await getMegaRaid();
    if (raid === null) { return; }
    if (raidLock) { return; }

    if (raid.hp <= 0 || moment() > moment(raid.time).add(3, 'h')) {
        raidLock = true;
        await deleteMegaRaid(id);
        await startTimerMegaRaid();
        const nextRaid = await getMegaRaid();
        let nextPokemon = null;
        if (nextRaid === null) {
            nextPokemon = createRandomMegaRaid(raid.pokemon);
            await createMegaRaid(nextPokemon);
            await startTimerMegaRaid();
        } else {
            nextPokemon = nextRaid.pokemon;
        }
        if (process.env.DEV !== '1') {
            const embed = new MessageEmbed();
            embed.setDescription(`New Mega Raid will start in 60 minutes!\nWill you defeat **${nextPokemon.displayName}?**`)
                .setImage(getImage(nextPokemon, true, nextPokemon.shiny, nextPokemon.special))
                .setTitle('Mega Raid announcement')
                .setTimestamp();
            client.restClient.post(Routes.channelMessages('800663858234130432'), {
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
        const newRaidPokemon = createRandomMegaRaid(raid.pokemon);
        createMegaRaid(newRaidPokemon);
        getMegaRaidLogs().then((res) => {
            clearMegaRaidLogs();
            const { length } = res;
            const top = Math.floor(length * 0.20) + 1;
            const middle = Math.floor(length * 0.50);
            res.forEach(async (element: any, index: any) => {
                let rank = 1;
                if (index < top) {
                    rank = 3;
                } else if (index < top + middle) {
                    rank = 2;
                }
                addToInventory(element.discord_id, raid.pokemon.drop, rank);
            });

            res.forEach(async (element: any, index: any) => {
                let rank = 1;
                if (index < top) {
                    rank = 3;
                } else if (index < top + middle) {
                    rank = 2;
                }
                client.restClient.post(Routes.userChannels(), {
                    body: {
                        recipient_id: element.discord_id,
                    }
                }).then((userChannel: any) => {
                    const embed = new MessageEmbed();
                    embed.setDescription(`You dealt **${element.damageDealt}** HP!\nYou are ranked **#${index + 1}** out ${res.length} trainers in damage on this raid.\n\nThanks to your effort, you received x${rank} ${items[raid.pokemon.drop].emoji} ${items[raid.pokemon.drop].name}`)
                        .setImage(getImage(raid.pokemon, true, raid.pokemon.shiny, raid.pokemon.special))
                        .setTitle('MEGA RAID HAS ENDED');
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
            });
            raidLock = false;
        }).catch((error) => {
            Logger.error(error);
        });
    }
}

export {
    checkMegaRaid, createRandomMegaRaid,
};
