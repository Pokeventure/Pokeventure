import items from "../../data/items";
import { SlashCommandBuilder } from "discord.js";
import { Pokemon } from "../models/pokemon";
import { addToInventory } from "../modules/database";
import { sendEmbed } from "../modules/utils";
import { Inventory } from "../models/inventory";
import { Command, CommandContext } from "../types/command";

function removeItem(userId: string, pokemon: Pokemon) {
    if (!pokemon.item) return null;
    let itemToAddBack = Object.entries(items).find((x) => x[1].holdname === pokemon.item);
    if (itemToAddBack) {
        addToInventory(userId, itemToAddBack[0], 1);
        pokemon.item = undefined;
        pokemon.save();
        return itemToAddBack;
    }
    return null;
}

export const Hold: Command = {
    commandName: "hold",
    displayName: "Hold",
    fullDescription: "Give an item from your inventory to your Pokémon so it can be used during fights. You can see what's in your inventory by using the command `%PREFIX%inventory`.\n\nUsage: `%PREFIX%hold <name of item to use>`\n\nExample: `%PREFIX%hold leftovers` to give Leftovers to your Pokémon.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("hold")
        .setDescription("Give or remove an item from your Pokémon.")
        .addStringOption(
            (input) => input
                .setName("item")
                .setDescription("Item to hold"))
        .setDMPermission(true),

    async handler(context: CommandContext) {
        if (!context.player) return;
        const itemName: string | null = context.interaction.options.getString("item");
        if (itemName) {
            let inventory = await Inventory.findOne({ discord_id: context.user.id }).exec();

            for (const [key, item] of Object.entries(items)) {
                if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                    if (!item.canHold) {
                        return sendEmbed(context, { description: `You can't hold ${item.name}.` });
                    }
                    if (inventory === null || inventory.inventory[key]?.quantity <= 0) {
                        return sendEmbed(context, { description: `You don't have any ${item.name}.` });
                    }
                    let pokemon = context.player.selectedPokemon;
                    let itemToAddBack = null;
                    if (pokemon.item !== null) {
                        itemToAddBack = removeItem(context.user.id, pokemon);
                    }
                    await addToInventory(context.user.id, key, -1);
                    //await holdItem(context.player?.selectedPokemon._id, item.holdname);
                    return sendEmbed(context, { description: `Your Pokémon is now holding **${item.name}**.${itemToAddBack ? `\n\n**${itemToAddBack[1].name}** has been put in your inventory.` : ""}` });
                }
            }
        } else {
            const pokemon = context.player?.selectedPokemon;
            if (pokemon.item !== null) {
                const itemToAddBack = removeItem(context.user.id, pokemon);
                if (itemToAddBack) {
                    sendEmbed(context, { description: `You take **${itemToAddBack[1].name}** from you Pokémon.` });
                }
            } else {
                sendEmbed(context, { description: "Your Pokémon is not holding an item." });
            }
        }
    },
};
