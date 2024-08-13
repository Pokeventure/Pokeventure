import { ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { makeImageData, sendEmbed } from "../modules/utils";
import { getPokemonByNumber } from "../modules/database";
import { getPokemon } from "../modules/pokedex";
import { Team as TeamModel } from "../models/team";

const TEAM_LIMIT = 9;

export const Team: Command = {
    commandName: "team",
    displayName: "Team",
    fullDescription: "Manage your Pokémon team. You team can contain up to 3 Pokémon to fight in Gyms or in PvP battles. (Note: Teams can contain only one Mega)\n\nUsage: `%PREFIX%team` to see your selected team and other teams.\nUsage: `%PREFIX%team create <name>` to create a new team (up to 9)\nUsage: `%PREFIX%team add <pokemon id>` to add a Pokémon in your slected team.\nUsage: `%PREFIX%team remove <slot>` to remove a Pokémon from your selected team.\nUsage: `%PREFIX%team rename <name>` to rename you current team.\nUsage: `%PREFIX%team delete <name>` to remove a team.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("team")
        .setDescription("Manage your teams")
        .addSubcommand(option => option.setName("view").setDescription("View your teams"))
        .addSubcommand(option => option.setName("add").setDescription("Add Pokémon to a team")
            .addIntegerOption(option => option.setName("pokemon").setDescription("Pokémon ID").setRequired(true))
            .addIntegerOption(option => option.setName("slot").setDescription("Slot to place Pokémon")))
        .addSubcommand(option => option.setName("remove").setDescription("Remove a Pokémon to a team")
            .addIntegerOption(option => option.setName("slot").setDescription("Slot to place Pokémon").setRequired(true)))
        .addSubcommand(option => option.setName("create").setDescription("Create a team")
            .addStringOption(option => option.setName("name").setDescription("Team name").setRequired(true)))
        .addSubcommand(option => option.setName("select").setDescription("Select a team")
            .addStringOption(option => option.setName("name").setDescription("Team name").setRequired(true)))
        .addSubcommand(option => option.setName("rename").setDescription("Rename current team").addStringOption(option => option.setName("name").setDescription("Name to rename your team to").setRequired(true)))
        .addSubcommand(option => option.setName("delete").setDescription("Delete a team").addStringOption(option => option.setName("name").setDescription("Name of the team to remove").setRequired(true)))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getSubcommand() === "add") {
            await context.player.populate("selectedTeam");
            if (!context.player.selectedTeam) {
                return sendEmbed(context, { description: "You must create or select a team before adding a Pokémon to the team. Create it with `/team create <team name>`." });
            }
            const pokemonId: number = context.interaction.options.getInteger("pokemon", true);
            // Add pokemon to team
            const team = context.player.selectedTeam;
            const pokemon = await getPokemonByNumber(context.player, pokemonId - 1);
            if (!pokemon) {
                return sendEmbed(context, { description: "No Pokémon match to this number. Check number with `/pokemons`." });
            }
            const pokemonData = getPokemon(pokemon.dexId, pokemon.special);
            if (context.interaction.options.getInteger("slot") === null) {
                let teamText = "Current team:\n";
                for (let i = 0; i < 3; i++) {
                    if (team.team[i] !== undefined && team.team[i] !== null && pokemon._id.toString() !== team.team[i]._id.toString() && (pokemon.special === "mega" && team.team[i].special === "mega")) {
                        return sendEmbed(context, { description: "You team can contain already a Mega Pokémon. Remove it before." });
                    }
                    teamText += `${i + 1}. `;
                    if (team.team[i]) {
                        const pokemonData = getPokemon(team.team[i].dexId, team.team[i].special);
                        teamText += `${pokemonData.displayName} (Lvl. ${team.team[i].level})`;
                    }
                    teamText += "\n";
                }
                sendEmbed(context, {
                    description: teamText, title: `In which slot do you want to add ${pokemon.nickname !== null ? pokemon.nickname : pokemonData.displayName}?`
                }, [
                    {
                        style: ButtonStyle.Primary,
                        customId: "1",
                        label: "Slot 1",
                    }, {
                        style: ButtonStyle.Primary,
                        customId: "2",
                        label: "Slot 2",
                    }, {
                        style: ButtonStyle.Primary,
                        customId: "3",
                        label: "Slot 3",
                    }
                ]).then((message) => {
                    const collector = message.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 60000,
                    });

                    collector.on("collect", async (interaction) => {
                        if (interaction.user.id !== context.user.id) return;
                        const slot = parseInt(interaction.customId);
                        if (slot < 1 || slot > 3) return;
                        team.team[slot - 1] = pokemon;
                        await team.save();
                        interaction.reply(`${pokemonData.displayName} has been added in slot #${slot} of your team!`);
                    });
                });
            } else {
                const slot = context.interaction.options.getInteger("slot", true);
                if (slot < 1 && slot > 3) {
                    return sendEmbed(context, { description: "Slot number should be between between 1 and 3" });
                }
                await context.player.populate("selectedTeam");
                context.player.selectedTeam.team[slot - 1] = pokemon;
                await context.player.selectedTeam.save();
                sendEmbed(context, { description: `${pokemonData.displayName} has been added in slot #${slot} of your team!` });
            }

        } else if (context.interaction.options.getSubcommand() === "remove") {
            // Remove pokemon from team
            await context.player.populate("selectedTeam");
            if (!context.player.selectedTeam) {
                return sendEmbed(context, { description: "You must create a team before removing a Pokémon to the team. Create it with `/team create <team name>`." });
            }
            const slot: number = context.interaction.options.getInteger("slot", true);
            if (slot < 1 && slot > 3) {
                return sendEmbed(context, { description: "Invalid slod." });
            }
            context.player.selectedTeam.team[slot - 1] = null;
            await context.player.selectedTeam.save();
            sendEmbed(context, { description: `Slot #${slot} has been emptied.` });
        } else if (context.interaction.options.getSubcommand() === "create") {
            const teams = await TeamModel.find({ discord_id: context.user.id }).exec();
            if (teams.length >= TEAM_LIMIT) {
                return sendEmbed(context, { description: `You can"t have more than ${TEAM_LIMIT} teams simultaneously.` });
            }
            const teamName = context.interaction.options.getString("name", true);
            const createdTeam = new TeamModel();
            createdTeam.discord_id = context.user.id;
            createdTeam.name = teamName;
            await createdTeam.save();
            if (context.player.selectedTeam === null) {
                context.player.selectedTeam = createdTeam;
                context.player.save();
                return sendEmbed(context, { description: `Your team **${teamName}** has been created and has been selected.`, });
            }
            sendEmbed(context, { description: `Your team **${teamName}** has been created.` });
        } else if (context.interaction.options.getSubcommand() === "select") {
            const teamName: string = context.interaction.options.getString("name", true);
            const team = await TeamModel.findOne({ discord_id: context.user.id, name: teamName }).exec();
            if (!team) {
                return sendEmbed(context, { description: "No team matches this name." });
            }
            context.player.selectedTeam = team;
            context.player.save();
            sendEmbed(context, { description: `You have selected team ${teamName}.`, image: null, thumbnail: null, author: context.user });
        } else if (context.interaction.options.getSubcommand() === "rename") {
            const teamName = context.interaction.options.getString("name", true);
            if (teamName === "") {
                return sendEmbed(context, { description: "Your team name cannot be empty." });
            }
            await context.player.populate("selectedTeam");
            if (!context.player.selectedTeam) {
                return sendEmbed(context, { description: "You don't have selected a team." });
            }
            context.player.selectedTeam.name = teamName;
            context.player.selectedTeam.save();
            sendEmbed(context, { description: `Your selected team has been renamed to **${teamName}**.` });
        } else if (context.interaction.options.getSubcommand() === "delete") {
            const teamName = context.interaction.options.getString("name", true);
            const team = await TeamModel.findOne({ discord_id: context.user.id, name: teamName }).exec();
            if (!team) {
                return sendEmbed(context, { description: "No team matches this name." });
            }
            await team.deleteOne();
            sendEmbed(context, { description: `You have deleted team ${teamName}.` });
        } else {
            await context.player.populate("selectedTeam");
            const teams = await TeamModel.find({ discord_id: context.user.id }).exec();
            if (teams.length === 0) {
                return sendEmbed(context, { description: "You don't have any team!\nYou can create a new one with `/teams create <team name>`", title: `${context.user.username}"s teams` });
            }
            const embed = new EmbedBuilder();
            for (let i = 0; i < teams.length; i++) {
                let teamPokemons = "";

                for (let j = 0; j < 3; j++) {
                    if (!teams[i].team[j]) {
                        teamPokemons += "-\n";
                        continue;
                    }
                    const pokemonData = getPokemon(teams[i].team[j].dexId, teams[i].team[j].special);
                    teamPokemons += `- ${pokemonData.displayName} - Lv. ${teams[i].team[j].level}\n`;
                }
                embed.addFields({
                    name: `${teams[i].name}`,
                    value: teamPokemons,
                    inline: true,
                });
            }
            embed.setTitle(`${context.user.username}'s teams`);
            embed.setDescription(`Selected team: ${context.player.selectedTeam?.name ?? "None"}`);
            embed.setImage(`http://image.pokeventure.com/gym_show.php?d=${makeImageData(context.player.selectedTeam?.team ?? null)}`);
            context.interaction.editReply({ embeds: [embed] });
        }
    },
};
