import { Chance } from 'chance';
import { randomPokemon } from './world';
import clanRaids from '../../data/clanRaids';
import { Channel, MessageEmbed } from 'discord.js';
import Client from './client';
import { Routes } from 'discord-api-types/v9';
import Logger from './logger';
import { rarity } from './pokedex';

export async function broadcastClanMessage(client: Client, channel: string, backupChannel: string, message: string, title: string, image: string = '') {
    let embed = new MessageEmbed();
    embed.setDescription(message)
        .setImage(image)
        .setTitle(title);
    if (channel === '') {
        client.restClient.post(Routes.channelMessages(backupChannel), {
            body: {
                embeds: [
                    embed
                ]
            }
        }).catch((error) => {
            Logger.error(error);
        });
    } else if (channel !== null && channel !== undefined) {
        client.restClient.post(Routes.channelMessages(channel), {
            body: {
                embeds: [
                    embed
                ]
            }
        }).catch((error) => {
            client.restClient.post(Routes.channelMessages(backupChannel), {
                body: {
                    embeds: [
                        embed
                    ]
                }
            });
            Logger.error(error);
        });
    }
}

export function generateClanRaid(clanRaidLevel: number, clanLevel: number, forceRarity?: number, forceShiny?: boolean) {
    let chance = new Chance();
    const oddsPerLevel = [[5, 4, 1], [4, 5, 1], [3, 6, 1], [2, 6, 2], [2, 6, 3], [2, 5, 4]];
    let rarityLevel = chance.weighted([0, 1, 2], oddsPerLevel[clanRaidLevel]);
    const shinyOdds = [0, 1, 3, 9, 27, 81];
    if (forceRarity !== undefined) {
        rarityLevel = forceRarity;
    }
    //rarityLevel = 0;

    const filteredRaids: any = clanRaids.filter((x: any) => x.rarity === rarityLevel);

    const rand = chance.integer({ min: 0, max: filteredRaids.length });

    let special = null;
    if (filteredRaids[rand].forme !== null) {
        special = chance.pickset(filteredRaids[rand].forme, 1)[0];
    } else {
        special = filteredRaids[rand].special;
    }
    return {
        ...randomPokemon(filteredRaids[rand].id, 100, ['rest', 'explosion', 'lifedew', 'recover', 'wish', 'bellydrum', 'finalgambit', 'swallow', 'leechseed', 'gigadrain', 'leechlife', 'memento', 'metronome', 'healingwish', 'lunardance', 'mistyexplosion', 'selfdestruct', 'steelbeam'], forceShiny ? 1000 : shinyOdds[clanRaidLevel], special, 0, undefined),
        rarityLevel,
    };
}