import { CommandContext } from 'command';
import { calculateTasks } from '../commands/research';
import { addCoins, addToInventory, createResearch, getInventory, updateResearch } from './database';
import { getPokemon } from './pokedex';
import { sendEmbed } from './utils';

export enum Research {
    catch = 0,
    used = 1,
    feed = 2,
    evolving = 3,
};

export const catchAmount = [5, 15, 50, 100, 500];
export const catchRaidAmount = [1, 3, 9, 20, 50];
export const usedAmount = [20, 50, 400, 900, 2000];
export const feedAmount = [3, 10, 25, 75, 200];
export const evolvedAmount = [1, 5, 10, 20, 50];

export async function increaseResearch(context: CommandContext, discordId: string, type: Research, dexId: number, currentData: any) {
    let needToCreate = false;
    if (currentData === null || currentData === undefined) {
        needToCreate = true;
        currentData = {};
    }
    let tasks = calculateTasks(dexId, currentData[dexId] ?? {});
    let research = currentData[dexId];
    if (research === undefined) {
        research = {};
    }
    research[type] = research[type] + 1 || 1;
    currentData[dexId] = research;
    let tasksAfter = calculateTasks(dexId, currentData[dexId] ?? {});
    if (tasksAfter[0] > tasks[0]) {
        let pokemon = getPokemon(dexId);
        if (tasksAfter[0] === tasksAfter[1]) {
            /* let ok = false;
            let count = 0;
            do {
                let inv = await getInventory(discordId);
                await addToInventory(discordId, 96, 1);
                let inv2 = await getInventory(discordId);
                if(inv2.inventory[96]?.quantity - 1 === inv.inventory[96]?.quantity) {
                    ok = true;
                }
                console.log(`Give shiny ticket to ${discordId} for ${pokemon.displayName} try ${count + 1}`);
                count++;
            } while (!ok && count < 10); */
            currentData[dexId][-1] = 0;
            await sendEmbed({ context, message: `You completed all tasks for ${pokemon.displayName}. You can claim your Shiny Ticket <:shinyticket:878363313321414676> by doing \`/research claim\`.` });
            console.log(`Research complete for ${discordId} on ${pokemon.displayName}`);
        } else {
            await sendEmbed({ context, message: `You completed a task for ${pokemon.displayName}. You received ${tasksAfter[0] * 500} Pokecoins <:pokecoin:741699521725333534>.` });
            addCoins(discordId, tasksAfter[0] * 500, 'research');
        }
    }
    if (needToCreate) {
        createResearch(discordId, currentData);
    } else {
        updateResearch(discordId, currentData);
    }
}