
import { ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
    kanto, johto, hoenn, sinnoh, unova, kalos, alola, galar,
} from "../../data/gyms";
import { Command, CommandContext } from "../types/command";
import { Gym as GymModel } from "../models/gym";
import moment from "moment";
import { sendEmbed, sleep } from "../modules/utils";
import { getMoves, getPokemon, typeEmoji } from "../modules/pokedex";
import { randomNature } from "../modules/world";
import { Fight } from "../modules/fight";
import { addBattlePoints, addStats } from "../modules/database";
import { incrementQuest } from "../modules/quests";
import { Pokemon } from "../models/pokemon";

const region: any = [
    kanto,
    johto,
    hoenn,
    sinnoh,
    unova,
    kalos,
    alola,
    galar,
];

const regionName: string[] = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Unova",
    "Kalos",
    "Alola",
    "Galar",
];

const league = [
    "Standard League",
    "Expert League",
    "Master League",
    "Nightmare League",
    "Ultra Nightmare League",
];

const keyword = [
    "standard",
    "expert",
    "master",
    "nightmare",
    "ultranightmare",
];

const levelPerLeague = [
    50,
    75,
    100,
    120,
    120,
];

function makeImageData(pokemons: any) {
    const data: any = {
        pokemons: [],
    };
    pokemons.forEach((element: any) => {
        const pokemon = {
            name: "",
            level: 1,
            shiny: false,
        };
        const info = getPokemon(element.dexId, element.special);
        pokemon.name = info.displayName;
        pokemon.level = element.level;
        data.pokemons.push(pokemon);
    });
    return Buffer.from(JSON.stringify(data)).toString("base64");
}

function promptRegion(context: CommandContext) {
    sendEmbed(
        context, { description: "Select your region where you want to fight gyms for this reset", title: "Gym" },
        [
            {
                customId: "0",
                label: "Kanto",
                style: ButtonStyle.Primary,
            }, {
                customId: "1",
                label: "Johto",
                style: ButtonStyle.Primary,
            }, {
                customId: "2",
                label: "Hoenn",
                style: ButtonStyle.Primary,
            }, {
                customId: "3",
                label: "Sinnoh",
                style: ButtonStyle.Primary,
            }, {
                customId: "4",
                label: "Unova",
                style: ButtonStyle.Primary,
            }, {
                customId: "5",
                label: "Kalos",
                style: ButtonStyle.Primary,
            }, {
                customId: "6",
                label: "Alola",
                style: ButtonStyle.Primary,
            }, {
                customId: "7",
                label: "Galar",
                style: ButtonStyle.Primary,
            },
        ]
    ).then((message) => {
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on("collect", i => {
            if (i.user.id === context.user.id) {
                const regionId = parseFloat(i.customId);
                i.reply(`You selected **${regionName[regionId]}** region.\n\nYou can now fight all trainers in this region to get some rewards.\n\nDo \`/gym view\` to see what are trainers available to fight or \`/gym fight\` to start fighting.`);
                const newGym = new GymModel({
                    discord_id: context.user.id,
                    join: new Date(),
                    selectedRegion: regionId,
                    difficultyLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                    selectedDifficulty: 0,
                });
                newGym.save();
            }
        });

    });
}

async function gymFight(context: CommandContext, choice: number) {
    const gym = await GymModel.findOne({ discord_id: context.user.id }).exec();
    let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let selectedRegion = 0;
    let selectedDifficulty = 0;
    if (gym === null) {
        promptRegion(context);
        return;
    }
    if (gym !== null) {
        difficultyLevels = gym.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
        selectedRegion = gym.selectedRegion || 0;
        selectedDifficulty = gym.selectedDifficulty || 0;
    }
    if (choice === -1) {
        choice = difficultyLevels[selectedDifficulty];
    }
    const selectedGym = region[selectedRegion][choice];
    if (choice > difficultyLevels[selectedDifficulty]) {
        sendEmbed(context, { description: `You need to defeat previous trainers. Next fight is **${region[selectedRegion][difficultyLevels[selectedDifficulty]].name}**.` });
        return;
    } if (choice < 0 || choice >= 13 || isNaN(choice)) {
        sendEmbed(context, { description: "Invalid choice" });
        return;
    }
    await context.player.populate("selectedTeam");
    const team = context.player.selectedTeam;
    const playerTeam: any[] = [];
    if (selectedDifficulty === 4) {
        const selectedPokemon = context.player.selectedPokemon;
        playerTeam.push(selectedPokemon);
    } else {
        if (team === null) {
            return sendEmbed(context, { description: "Before fighting, you need to create a team before fighting in a Gym. Use the command `%PREFIX%team` to build your team." });
        }
        for (let j = 0; j < 3; j++) {
            if (team.team[j]) {
                playerTeam.push(team.team[j]);
            }
        }
    }
    if (playerTeam.length <= 0) {
        return sendEmbed(context, { description: "Before fighting, you need to add Pokémons to your team. Use the command `%PREFIX%team` to build your team." });
    }
    const enemyTeam: any[] = [];
    selectedGym.pokemons.forEach((pokemon: any) => {
        const data = getPokemon(pokemon);
        const moves = [];
        let moveset = getMoves(data.dexId, data.forme);
        moveset = moveset.filter((x: any) => (x.category === "Special" || x.category === "Physical") && x.power >= 50);
        const movesetCount = moveset.length;
        for (let i = 0; i < Math.min(4, movesetCount); i++) {
            moves.push(moveset.splice(context.client.chance.integer({ min: 0, max: moveset.length }), 1)[0].move);
        }
        const pokemonResult: any = {
            dexId: data.dexId,
            displayName: data.displayName,
            name: data.displayName,
            special: data.forme,
            moves,
            level: levelPerLeague[selectedDifficulty],
            ivs: {
                hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31,
            },
            shiny: false,
            forme: undefined,
            nature: randomNature(),
            ability: "0",
        };
        enemyTeam.push(pokemonResult);
    });
    sendEmbed(context, { description: `**${selectedGym.name}**, wants to fight!`, image: `http://image.pokeventure.com/gym_show.php?d=${makeImageData(enemyTeam)}` });
    const fight: Fight = new Fight();
    //context.client.fights[context.user.id] = fight;
    sleep(100).then(() => {
        fight.start(context, playerTeam, enemyTeam, 0, -1, -1, -1, context.user.username, selectedGym.name, true).then(async (result: any) => {
            if (gym !== null) {
                difficultyLevels = gym.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
                selectedRegion = gym.selectedRegion || 0;
                selectedDifficulty = gym.selectedDifficulty || 0;
            }
            if (result.consumedItem !== undefined && result.consumedItem.length > 0) {
                for (let i = 0; i < result.consumedItem.length; i++) {
                    const pokemon = await Pokemon.findById(playerTeam[result.consumedItem[i]]._id).exec();
                    if (pokemon) {
                        pokemon.item = undefined;
                        pokemon.save();
                    }
                }
            }
            /* if (context.client.fights[context.user.id] !== undefined) {
                delete context.client.fights[context.user.id];
            } */
            if (result.inactive !== undefined) {
                sendEmbed(context, { description: "You left the fight due to inactivity." });
                return;
            }
            if (result.victory) {
                let firstClear = false;
                if (difficultyLevels[selectedDifficulty] === choice) {
                    difficultyLevels[selectedDifficulty]++;
                    gym.difficultyLevels = difficultyLevels;
                    gym.save();
                    firstClear = true;
                }
                if (firstClear) {
                    addStats(context.user.id, "gyms", 1);
                    if (choice === region[selectedRegion].length - 1) {
                        incrementQuest(context, context.user, "gymClearDifficulty", 1, selectedDifficulty);
                        incrementQuest(context, context.user, "gymClearRegion", 1, selectedRegion);
                        const battlePoints = [7, 9, 12, 25, 40];

                        addBattlePoints(context.player, battlePoints[selectedDifficulty]);
                        sendEmbed(context, { description: `You defeated **${selectedGym.name}**!\n\nYou defeated the ${league[selectedDifficulty]}! ${selectedDifficulty < league.length - 1 ? `You can now try a more challenging league and fight for the ${league[selectedDifficulty + 1]}. Join it by doing \`%PREFIX%gym ${keyword[selectedDifficulty + 1]}\`` : ""}!\n\nYou got x${battlePoints[selectedDifficulty]} BP <:bp:797019879337230356> for beating it today.`, title: "Congratulations!", color: 2263842 });
                    } else {
                        addBattlePoints(context.player, 2);
                        sendEmbed(context, { description: `You defeated ${selectedGym.name}**!\nYou earned 2 BP <:bp:797019879337230356>!\n\n You can now fight against ${region[selectedRegion][choice + 1].name}** ${typeEmoji[region[selectedRegion][choice + 1].type]}.`, title: "Congratulations!", color: 2263842 });
                    }
                } else {
                    sendEmbed(context, { description: `You defeated **${selectedGym.name}**!`, title: "Congratulations!", color: 2263842 });
                }
            } else {
                sendEmbed(context, { description: "You should train more your Pokémons or get stronger Pokémon!\nDon\"t forget about weaknesses and use them to fight against trainers.", title: "Oh no! You have lost." });
            }
        });
    });
}


export const Gym: Command = {
    commandName: "gym",
    displayName: "Gym",
    fullDescription: "Participate to Gym fights! Prepare your team with the command `/team` and try to defeat every trainers! You can reset your progression to get rewards again every 24 hours.\n(Note: holdable items will be consumed during Gym fights)\n\nUsage: `%PREFIX%gym`\nUsage: `%PREFIX%gym <league>` to change League (league can be `standard`, `expert`, `master`, `nightmare`)\nUsage: `%PREFIX%gym reset` to reset your progression once a day.",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("gym")
        .setDescription("Send money to an other play.")
        .addSubcommand(input => input.setName("view").setDescription("View gyms"))
        .addSubcommand(input => input.setName("difficulty").setDescription("Change gym difficulty")
            .addStringOption(option => option.setName("difficulty").setDescription("Difficulty")
                .addChoices({
                    name: "Standard League",
                    value: "standard"
                }, {
                    name: "Expert League",
                    value: "expert"
                }, {
                    name: "Master League",
                    value: "master"
                }, {
                    name: "Nightmare League",
                    value: "nightmare"
                }, {
                    name: "Ultra Nightmare League",
                    value: "ultranightmare"
                })
                .setRequired(true)
            ))
        .addSubcommand(input => input.setName("reset").setDescription("View gyms"))
        .addSubcommand(input => input.setName("fight").setDescription("Fight gym")
            .addIntegerOption(option => option.setName("trainer").setDescription("Trainer to fight")))
        .setDMPermission(true),

    async handler(context: CommandContext) {
        if (context.interaction.options.getSubcommand(true) === "reset") {
            const gym = await GymModel.findOne({ discord_id: context.user.id }).exec();
            if (gym !== null && gym.join !== null) {
                const resetTime = moment(gym.join).add(20, "hour");
                if (moment() > resetTime) {
                    GymModel.deleteOne({ discord_id: context.user.id });
                    sendEmbed(context, { description: "Gym progression has been reseted." });
                } else {
                    sendEmbed(context, { description: `You will able be to reset in ${moment().to(resetTime)}` });
                }
            } else {
                sendEmbed(context, { description: "You have to start participating to Gyms before reseting." });
            }
        } else if (context.interaction.options.getSubcommand(true) === "fight") {
            const choice = (context.interaction.options.getInteger("trainer") ?? 0) - 1;
            gymFight(context, choice);
        } else if (context.interaction.options.getSubcommand(true) === "difficulty") {
            const gym = await GymModel.findOne({ discord_id: context.user.id }).exec();
            let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            if (gym === null) {
                promptRegion(context);
                return;
            }
            if (gym !== null) {
                difficultyLevels = gym.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
            }
            const selectedLeague = keyword.indexOf(context.interaction.options.getString("difficulty", true));
            if (selectedLeague === 0 || difficultyLevels[selectedLeague - 1] >= region[selectedLeague - 1].length) {
                gym.selectedDifficulty = selectedLeague;
                gym.save();
                sendEmbed(context, { description: `Switched to **${league[selectedLeague]}**.` });
            } else {
                sendEmbed(context, { description: `You didn"t unlock **${league[selectedLeague]}** yet. Beat the previous League to access it.` });
            }
        } else {
            const gym = await GymModel.findOne({ discord_id: context.user.id }).exec();
            let difficultyLevels = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            let selectedRegion = 0;
            let selectedDifficulty = 0;
            if (gym === null) {
                promptRegion(context);
                return;
            }
            if (gym !== null) {
                difficultyLevels = gym.difficultyLevels || [0, 0, 0, 0, 0, 0, 0, 0, 0];
                selectedRegion = gym.selectedRegion || 0;
                selectedDifficulty = gym.selectedDifficulty || 0;
            }

            const nextTrainer = difficultyLevels[selectedDifficulty];
            const embed = new EmbedBuilder();
            embed.addFields({
                name: "Gyms",
                value: `\`#1\` ${region[selectedRegion][0].name} ${typeEmoji[region[selectedRegion][0].type[0]]} ${nextTrainer > 0 ? ":white_check_mark: " : ":x:"}\n\`#2\` ${region[selectedRegion][1].name} ${typeEmoji[region[selectedRegion][1].type[0]]} ${nextTrainer > 1 ? ":white_check_mark: " : ":x:"}\n\`#3\` ${region[selectedRegion][2].name} ${typeEmoji[region[selectedRegion][2].type[0]]} ${nextTrainer > 2 ? ":white_check_mark: " : ":x:"}\n\`#4\` ${region[selectedRegion][3].name} ${typeEmoji[region[selectedRegion][3].type[0]]} ${nextTrainer > 3 ? ":white_check_mark: " : ":x:"}`,
                inline: true,
            }, {
                name: "\u2800",
                value: `\`#5\` ${region[selectedRegion][4].name} ${typeEmoji[region[selectedRegion][4].type[0]]} ${nextTrainer > 4 ? ":white_check_mark: " : ":x:"}\n\`#6\` ${region[selectedRegion][5].name} ${typeEmoji[region[selectedRegion][5].type[0]]} ${nextTrainer > 5 ? ":white_check_mark: " : ":x:"}\n\`#7\` ${region[selectedRegion][6].name} ${typeEmoji[region[selectedRegion][6].type[0]]} ${nextTrainer > 6 ? ":white_check_mark: " : ":x:"}\n\`#8\` ${region[selectedRegion][7].name} ${typeEmoji[region[selectedRegion][7].type[0]]} ${nextTrainer > 7 ? ":white_check_mark: " : ":x:"}`,
                inline: true,
            }, {
                name: "\u2800",
                value: "\u2800",
                inline: true
            }, {
                name: "Elite Four",
                value: `\`#9\` ${region[selectedRegion][8].name} ${typeEmoji[region[selectedRegion][8].type[0]]} ${nextTrainer > 8 ? ":white_check_mark: " : ":x:"}\n\`#10\` ${region[selectedRegion][9].name} ${typeEmoji[region[selectedRegion][9].type[0]]} ${nextTrainer > 9 ? ":white_check_mark: " : ":x:"}`,
                inline: true,
            }, {
                name: "\u2800",
                value: `\`#11\` ${region[selectedRegion][10].name} ${typeEmoji[region[selectedRegion][10].type[0]]} ${nextTrainer > 10 ? ":white_check_mark: " : ":x:"}\n\`#12\` ${region[selectedRegion][11].name} ${typeEmoji[region[selectedRegion][11].type[0]]} ${nextTrainer > 11 ? ":white_check_mark: " : ":x:"}`,
                inline: true,
            }, {
                name: "\u2800",
                value: "\u2800",
                inline: true,
            }, {
                name: "Champion",
                value: `\`#13\` ${region[selectedRegion][12].name} ${typeEmoji[region[selectedRegion][12].type[0]]} ${nextTrainer > 12 ? ":white_check_mark: " : ":x:"}`,
                inline: true,
            });

            let canReset = false;
            let timeLeftBeforeReset = "";
            if (gym !== undefined && gym.join !== undefined) {
                const resetTime = moment(gym.join).add(20, "hours");
                if (moment() > resetTime) {
                    canReset = true;
                } else {
                    timeLeftBeforeReset = moment().to(resetTime);
                }
            }
            let nextText = "";
            if (difficultyLevels[selectedDifficulty] >= region[selectedDifficulty].length && selectedDifficulty < league.length - 1) {
                nextText = `\n**__You can access to next League by doing \`/gym ${keyword[selectedDifficulty + 1]}\`__**`;
            }
            embed.setDescription(`What gym do you want to run for?\n\n**${regionName[selectedRegion]} ${league[selectedDifficulty]} [${difficultyLevels[selectedDifficulty]}/13]**${canReset ? "\n\nYou can reset your Gym progression to run for rewards again.\nSay `/gym reset`" : timeLeftBeforeReset !== "" ? `\n\nYou will be able to reset your progression ${timeLeftBeforeReset}` : ""}${nextText}`);
            embed.setColor("#00ffff");
            embed.setTitle("Gym");
            embed.setFooter({ text: `${nextTrainer <= 12 ? `Next fight is #${nextTrainer + 1}. Do "/gym fight" to fight it.` : "You finished to fight this league. You can go to next one or fight again in this league"}` });

            context.interaction.editReply({ embeds: [embed] });
        }
    },
};
