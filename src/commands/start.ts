import { Command, CommandContext } from "../types/command";
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { getRegion, randomPokemon } from "../modules/world";
import { calculateLevelExperience, getImage, upperCaseFirstLetter } from "../modules/utils";
import { getPokemon } from "../modules/pokedex";
import { addQuest, addQuests, createPlayer, createPokemon, updatePlayer } from "../modules/database";
import { Player } from "../models/player";

export const Start: Command = {
    commandName: "start",
    displayName: "Start",
    fullDescription: "Starts your journey in the world of Pokémons. You will be asked to choose a starter Pokémon from all regions so... choose wisely.\nExample: `/start`",
    requireStart: false,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("start")
        .setDescription("Start your Pokeventure journey."),

    handler(context: CommandContext) {
        if (context.hasPlayer === false) {
            const embed = new EmbedBuilder();
            embed.setDescription(`Welcome to the beautiful world of Pokémon ${context.user.username}! Select the region where you want your starter from:`)
                .setThumbnail("https://pokeventure-image.s3.amazonaws.com/pokeventure.png")
                .setTitle("Pokeventure")
                .setFooter({ text: "Write the number to select a region" })
                .setImage("https://pokeventure-image.s3.amazonaws.com/starters.png")
                .addFields([
                    { name: "#1", value: "Kanto", inline: true },
                    { name: "#2", value: "Johto", inline: true },
                    { name: "#3", value: "Hoenn", inline: true },
                    { name: "#4", value: "Sinnoh", inline: true },
                    { name: "#5", value: "Unova", inline: true },
                    { name: "#6", value: "Kalos", inline: true },
                    { name: "#7", value: "Alola", inline: true },
                    { name: "#8", value: "Galar", inline: true },
                    { name: "#9", value: "Paldea", inline: true },
                ]);


            const row1 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("1")
                        .setLabel("Kanto")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("2")
                        .setLabel("Johto")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("3")
                        .setLabel("Hoenn")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("4")
                        .setLabel("Sinnoh")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("5")
                        .setLabel("Unova")
                        .setStyle(ButtonStyle.Primary),
                );
            const row2 = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("6")
                        .setLabel("Kalos")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("7")
                        .setLabel("Alola")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("8")
                        .setLabel("Galar")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("9")
                        .setLabel("Paldea")
                        .setStyle(ButtonStyle.Primary),
                );
            context.interaction.editReply({ embeds: [embed], components: [row1, row2] }).then((interaction) => {
                const regionCollector = interaction.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
                regionCollector.on("collect", regionInteraction => {
                    if (regionInteraction.user.id === context.interaction.user.id) {
                        regionCollector.stop();
                        const regionValue = regionInteraction.customId;
                        const region = getRegion(parseInt(regionValue));
                        const embed = new EmbedBuilder();
                        embed.setDescription(`You selected **${region.name}**. Select you starter :`)
                            .addFields([
                                { name: "#1 Grass starter", value: `${upperCaseFirstLetter(region.starter[0])}`, inline: true },
                                { name: "#2 Fire starter", value: `${upperCaseFirstLetter(region.starter[1])}`, inline: true },
                                { name: "#3 Water starter", value: `${upperCaseFirstLetter(region.starter[2])}`, inline: true },
                            ])
                            .setImage(`https://pokeventure-image.s3.amazonaws.com/${regionValue}.png`);
                        const components = new ActionRowBuilder<ButtonBuilder>();
                        components.addComponents(
                            new ButtonBuilder()
                                .setCustomId("1")
                                .setStyle(ButtonStyle.Success)
                                .setLabel(upperCaseFirstLetter(region.starter[0])),
                            new ButtonBuilder()
                                .setCustomId("2")
                                .setStyle(ButtonStyle.Success)
                                .setLabel(upperCaseFirstLetter(region.starter[1])),
                            new ButtonBuilder()
                                .setCustomId("3")
                                .setStyle(ButtonStyle.Success)
                                .setLabel(upperCaseFirstLetter(region.starter[2])),
                        );
                        regionInteraction.reply({ embeds: [embed], components: [components], fetchReply: true }).then((interaction) => {
                            const startCollector = interaction.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
                            startCollector.on("collect", starterInteraction => {
                                if (starterInteraction.user.id === context.interaction.user.id) {
                                    startCollector.stop();
                                    const choice: number = parseInt(starterInteraction.customId);
                                    const starter = getPokemon(region.starter[choice - 1]);

                                    createPlayer(context.user.id).then((player: Player) => {
                                        const pokemon = randomPokemon(starter.dexId, 5);
                                        addQuest(
                                            {
                                                discord_id: context.user.id,
                                                type: "tutorialMove",
                                                value: 0,
                                                objective: 1,
                                                tutorial: true,
                                                reward: [
                                                    {
                                                        coins: 3000,
                                                    },
                                                    {
                                                        quest: {
                                                            type: "tutorialWild",
                                                            value: 0,
                                                            objective: 1,
                                                            tutorial: true,
                                                            reward: [
                                                                {
                                                                    item: 0,
                                                                    quantity: 10,
                                                                },
                                                                {
                                                                    quest:
                                                                    {
                                                                        type: "tutorialFight",
                                                                        value: 0,
                                                                        objective: 1,
                                                                        tutorial: true,
                                                                        reward: [
                                                                            {
                                                                                item: 4,
                                                                                quantity: 1,
                                                                            },
                                                                            {
                                                                                quest: {
                                                                                    type: "tutorialCatch",
                                                                                    value: 0,
                                                                                    objective: 1,
                                                                                    tutorial: true,
                                                                                    reward: [
                                                                                        {
                                                                                            item: 1,
                                                                                            quantity: 5,
                                                                                        },
                                                                                        {
                                                                                            quest:
                                                                                            {
                                                                                                type: "tutorialShop",
                                                                                                value: 0,
                                                                                                objective: 1,
                                                                                                tutorial: true,
                                                                                                reward: [
                                                                                                    {
                                                                                                        coins: 3000,
                                                                                                    },
                                                                                                    {
                                                                                                        quest: {
                                                                                                            type: "tutorialReward",
                                                                                                            value: 0,
                                                                                                            objective: 1,
                                                                                                            tutorial: true,
                                                                                                            reward: [
                                                                                                                {
                                                                                                                    lootbox: 1,
                                                                                                                    quantity: 1,
                                                                                                                },
                                                                                                                {
                                                                                                                    quest: {
                                                                                                                        type: "tutorialLootbox",
                                                                                                                        value: 0,
                                                                                                                        objective: 1,
                                                                                                                        tutorial: true,
                                                                                                                        reward: [
                                                                                                                            {
                                                                                                                                item: 4,
                                                                                                                                quantity: 1,
                                                                                                                            },
                                                                                                                        ],
                                                                                                                    },
                                                                                                                },
                                                                                                            ],
                                                                                                        },
                                                                                                    },
                                                                                                ],
                                                                                            },
                                                                                        },
                                                                                    ],
                                                                                },
                                                                            },
                                                                        ],
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                ],
                                            },
                                        );

                                        createPokemon(context.user.id, {
                                            dexId: starter.dexId,
                                            level: 5,
                                            shiny: false,
                                            moves: pokemon.moves,
                                            ivs: {
                                                hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15,
                                            },
                                            rarity: 3,
                                            abilitySlot: pokemon.abilitySlot,
                                            nature: pokemon.nature,
                                            gender: pokemon.gender,
                                            fav: false,
                                            experience: calculateLevelExperience(5),
                                            friendship: 0,
                                            owner: context.user.id,
                                            firstOwner: context.user.id
                                        }).then((pokemon) => {
                                            player.selectedPokemon = pokemon;
                                            player.save();

                                            const embed = new EmbedBuilder();
                                            embed
                                                .setDescription(`You selected ${starter.displayName}!\n\n**You have been given some quests to help you to begin! Use \`/quests\` to see your quests.**\n\nIt"s recommended to read the guide first so you can learn the basics (\`/guide\`).\n\nUse \`/help\` to see all available commands.\nUse \`/move <ID>\` to go to a region and find wild pokemons.\nUse \`/map\` to see regions.\nUse \`/wild\` to find wild Pokémons.\nUse \`/fight\` to fight the wild Pokémon you are facing.`)
                                                .setThumbnail(getImage(starter, true, false))
                                                .setAuthor({ name: context.user.username, iconURL: context.user.avatarURL() ?? context.user.defaultAvatarURL });
                                            starterInteraction.reply({ embeds: [embed] });
                                        });
                                    });
                                }
                            });
                        });
                    }
                });
            });
        } else {
            const embed = new EmbedBuilder();
            embed.setDescription("You already started your journey!");
            context.interaction.editReply({ embeds: [embed] });
        }
    },

};
