import { AbilitiesText as AbilitiesImport } from "../../simulator/.data-dist/text/abilities";
import { Command } from "../types/command";
import { SlashCommandBuilder } from "discord.js";
import { sendEmbed } from "../modules/utils";

const Abilities: any = AbilitiesImport;

export const Ability: Command = {
    commandName: "ability",
    displayName: "Ability",
    fullDescription: "Displays informations a given ability.\n\nUsage: `%PREFIX%abilityinfo <ability name>`\nExample: `%PREFIX%moveinfo static` to display informations about Static ability.",
    requireStart: false,
    needPlayer: false,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("ability")
        .setDescription("Displays informations about an ability.")
        .addStringOption(option => option.setName("ability").setDescription("Ability name").setRequired(true))
        .setDMPermission(true)
    ,
    handler(context) {
        const abilityName = context.interaction.options.getString("ability", true);
        const ability = <any>Object.values(Abilities).find((x: any) => x.name.toLocaleLowerCase().startsWith(abilityName));
        if (ability) {
            sendEmbed(context, { description: `**${ability.name}**\n\n${ability.desc ?? ability.shortDesc}` });
        } else {
            sendEmbed(context, { description: `No ability found for ${abilityName}` });
        }
    },
};
