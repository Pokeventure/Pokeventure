import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { getPokemon, pokedexBase } from "../modules/pokedex";
import { Pokedex } from "../../simulator/.data-dist/pokedex";
import { encounters } from "../modules/world";
import { catchAmount, catchRaidAmount, evolvedAmount, feedAmount, Research as ResearchEnum, usedAmount } from '../modules/research';
import { catchable, raidable, cannotEvolve, lureCatchable } from '../../data/research';
import { getImage, pagination, sendEmbed } from "../modules/utils";
import { addToInventory, updateResearch } from "../modules/database";

function taskResult(value: number, amounts: number[]) {
    let res = '';
    amounts.forEach((task, index) => {
        if (value >= task && index === amounts.length - 1) {
            res += '✅';
        } else if (value >= task) {
            res += '✅ - ';
        } else if (index === amounts.length - 1) {
            res += `${task}`;
        } else {
            res += `${task} - `;
        }
    });
    return res;
}

function countTask(value: number, amounts: number[]) {
    let res = 0;
    amounts.forEach((task) => {
        if (value >= task) {
            res += 1;
        }
    });
    return res;
}

export function calculateTasks(pokemon: any, data: any) {
    let completed = 0;
    let total = 0;
    if (encounters.indexOf(pokemon) !== -1) {
        completed += countTask(data[ResearchEnum.catch] ?? 0, catchAmount);
        total += catchAmount.length;
    } else if (raidable.indexOf(pokemon) !== -1 || lureCatchable.indexOf(pokemon) !== -1) {
        completed += countTask(data[ResearchEnum.catch] ?? 0, catchRaidAmount);
        total += catchRaidAmount.length;
    }
    completed += countTask(data[ResearchEnum.used] ?? 0, usedAmount);
    total += usedAmount.length;
    completed += countTask(data[ResearchEnum.feed] ?? 0, feedAmount);
    total += feedAmount.length;
    if (cannotEvolve.indexOf(pokemon) === -1) {
        completed += countTask(data[ResearchEnum.evolving] ?? 0, evolvedAmount);
        total += evolvedAmount.length;
    }
    return [completed, total];
}

export const Research: Command = {
    commandName: "research",
    displayName: "Research",
    fullDescription: "Research a new technology to unlock new features.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("research")
        .setDescription('Display your tasks progression on Pokémons')
        .addSubcommand(input => input.setName('tasks').setDescription('Check your Pokemon tasks').addStringOption(option => option.setName('pokemon').setDescription('Pokémon name').setAutocomplete(true)))
        .addSubcommand(input => input.setName('claim').setDescription('Claim rewards from researches'))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getString('pokemon') !== null) {
            let pokemon = null;
            pokemon = getPokemon(context.interaction.options.getString('pokemon', true).toLowerCase());
            if (pokemon === null) {
                pokemon = Object.entries(Pokedex).find((x: any) => x[1].name.toLowerCase().includes(context.interaction.options.getString('pokemon', true)));
                if (pokemon) {
                    pokemon = getPokemon((<any>pokemon[1]).num, (<any>pokemon[1]).forme);
                } else {
                    pokemon = null;
                }
            }
            if (!pokemon) {
                return context.interaction.editReply('No Pokémon match.');
            }
            let data = context.player?.research?.data[pokemon.dexId] ?? {};
            let tasksAmount = calculateTasks(pokemon.dexId, data);
            let text = `**Research tasks done: ${tasksAmount[0]}/${tasksAmount[1]}**\n\n`;
            if (catchable.indexOf(pokemon.dexId) !== -1) {
                text += `Times caught: (${data[ResearchEnum.catch] ?? 0})\n${taskResult(data[ResearchEnum.catch] ?? 0, catchAmount)}\n`;
            } else if (raidable.indexOf(pokemon.dexId) !== -1 || lureCatchable.indexOf(pokemon.dexId) !== -1) {
                text += `Times caught: (${data[ResearchEnum.catch] ?? 0})\n${taskResult(data[ResearchEnum.catch] ?? 0, catchRaidAmount)}\n`;
            }
            text += `Times used: (${data[ResearchEnum.used] ?? 0})\n${taskResult(data[ResearchEnum.used] ?? 0, usedAmount)}
                Times fed: (${data[ResearchEnum.feed] ?? 0})\n${taskResult(data[ResearchEnum.feed] ?? 0, feedAmount)}\n`;
            if (cannotEvolve.indexOf(pokemon.dexId) === -1) {
                text += `Times evolved: (${data[ResearchEnum.evolving] ?? 0})\n${taskResult(data[ResearchEnum.evolving] ?? 0, evolvedAmount)}\n`;
            }
            sendEmbed(context, {
                description: text, thumbnail: getImage(pokemon, true), title: `${pokemon.displayName} research tasks`
            });
        } else if (context.interaction.options.getSubcommand(true) === 'claim') {
            let data = context.player?.research?.data ?? {};
            let count = 0;
            for (const [key, value] of Object.entries(data)) {
                // @ts-ignore
                if (value[-1] !== undefined) {
                    // @ts-ignore
                    if (value[-1] === 0) {
                        data[key][-1] = 1;
                        console.log(`Give shiny ticket to ${context.user.id} for ${key}`);
                        count++;
                    }
                }
            }
            if (count > 0) {
                await updateResearch(context.user.id, data);
                await addToInventory(context.user.id, 271, Math.max(1, count));
                sendEmbed(context, { description: `You received x${count} Shiny Ticket <:shinyticket:878363313321414676> for completing your researches.` });
            } else {
                sendEmbed(context, { description: 'You have nothing to claim.' });
            }
        } else {
            let startingPage = 0;
            let completion = pokedexBase.map(x => calculateTasks(x.dexId, context.player?.research?.data[x.dexId] ?? {})).reduce((a: number[], b: number[]) => {
                return [a[0] + b[0], a[1] + b[1], a[2] + (b[0] === b[1] ? 1 : 0)];
            }, [0, 0, 0]);
            let pageData: any[] = [];
            const pages: any[] = [];
            for (let i = 0; i < Object.entries(pokedexBase).length; i++) {
                const pokedexData: any = Object.entries(pokedexBase)[i][1];
                if (pokedexData.dexId <= 0) {
                    continue;
                }
                pageData.push({
                    name: pokedexData.name,
                    num: pokedexData.dexId,
                    displayName: pokedexData.displayName,
                });
                if (pageData.length >= 20) {
                    const embed = new EmbedBuilder();
                    let text = '';
                    let text1 = '';
                    for (let j = 0; j < pageData.length && j < 10; j++) {
                        text += `${pageData[j].num}. ${pageData[j].displayName} ${calculateTasks(pageData[j].num, context.player?.research?.data[pageData[j].num] ?? {}).join('/')}\n`;
                    }
                    for (let j = 10; j < pageData.length && j < 20; j++) {
                        text1 += `${pageData[j].num}. ${pageData[j].displayName} ${calculateTasks(pageData[j].num, context.player?.research?.data[pageData[j].num] ?? {}).join('/')}\n`;
                    }
                    embed.addFields(
                        { name: '\u2800', value: text, inline: true },
                        { name: '\u2800', value: '\u2800', inline: true},
                        { name: '\u2800', value: text1, inline: true}
                    );

                    embed.setTitle('Pokédex');
                    embed.setDescription(`Pokémon with all completed tasks: ${completion[2]}/905\nTotal tasks completed: ${completion[0]}/${completion[1]}\n\nComplete all tasks to get rewards!`);
                    pages.push(embed);
                    pageData = [];
                }
            }
            pagination(context, pages);
        }
    }
};