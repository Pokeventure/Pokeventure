import { InteractionResponse, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../types/command";
import { askConfirmation, sendDM, sendEmbed } from "../modules/utils";
import { Player } from "../models/player";

const fights: any = [];
const collectors: any = [];

export const Battle: Command = {
    commandName: "battle",
    displayName: "Battle",
    fullDescription: "Will start a duel with an other user. You will need to have a team. To create a team, use the command `%PREFIX%team`. Battle will happen in DMs. You need to have your DMs open to the bot on a least one server.\n\nUsage: `%PREFIX%battle @player`\nUsage: `%PREFIX%battle @player broadcast` to display fight result in the current channel",
    requireStart: true,
    needPlayer: true,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Start a Player vs Player battle.")
        .addSubcommand((input) => input.setName("start").setDescription("Start a fight battle against player")
            .addUserOption((input) => input.setName("player").setDescription("Player to battle").setRequired(true))
            .addBooleanOption((input) => input.setName("broadcast").setDescription("Broadcast fight in this channel"))
        )
        .addSubcommand((input) => input.setName("cancel").setDescription("Cancel your current battle."))
        .setDMPermission(true),
    handler: async (context: CommandContext) => {
        if (context.interaction.options.getSubcommand() === "start") {
            const mention = context.interaction.options.getUser("player", true);
            if (collectors[context.user.id] !== undefined) {
                collectors[context.user.id].stop();
                delete collectors[context.user.id];
            }
            if (mention.id === context.user.id) {
                return sendEmbed(context, { description: "You can't challenge yourself." });
                return;
            }
            if (mention.bot) {
                return sendEmbed(context, { description: "You can't challenge bot." });
            }
            if (fights[context.user.id] !== undefined) {
                return sendEmbed(context, { description: "You are already in a battle. If you are stuck, use `%PREFIX%battle cancel`." });
            }
            if (fights[mention.id] !== undefined) {
                return sendEmbed(context, { description: `<@${mention.id}> is already in a battle.` });
            }

            sendEmbed(context, { description: `Hi <@${mention.id}>! <@${context.user.id}> has challenged you to a battle.`, footer: { text: "Invitation will expire in 60 seconds." } }).then((message) => {
                if (message instanceof InteractionResponse) return;
                askConfirmation(message, context, async () => {
                    const player1 = context.player;
                    await player1.populate("selectedTeam");
                    const team1 = player1.selectedTeam;
                    if (!team1) {
                        return sendEmbed(context, { description: `<@${context.user.id}> has no team. Make one with \`%PREFIX%team\`` });
                    }
                    if (team1.team.length === 0) {
                        return sendEmbed(context, { description: `<@${context.user.id}> has no Pokémon in their team. Make one with \`%PREFIX%team\`` });
                    }
                    const player1Team: any[] = [];

                    for (let i = 0; i < 3; i++) {
                        if (team1.team[i]) {
                            player1Team.push(team1.team[i]);
                        }
                    }

                    // Player 2

                    const player2 = await Player.findOne({ discord_id: mention.id }).exec();
                    if (!player2) {
                        return sendEmbed(context, { description: `<@${mention.id}> has not start their adventure.` });
                    }
                    await player2.populate("selectedTeam");
                    const team2 = player2.selectedTeam;
                    if (!team2) {
                        return sendEmbed(context, { description: `<@${mention.id}> has no team. Make one with \`%PREFIX%team\`` });
                    }
                    if (team2.team.length === 0) {
                        return sendEmbed(context, { description: `<@${mention.id}> has no Pokémon in their team. Make one with \`%PREFIX%team\`` });
                    }
                    const player2Team: any[] = [];
                    for (let i = 0; i < 3; i++) {
                        if (team2.team[i]) {
                            player2Team.push(team2.team[i]);
                        }
                    }
                    // Probe DMs
                    let messagep1 = undefined;
                    let messagep2 = undefined;
                    try {
                        messagep1 = await sendDM(context.client, context.user.id, { content: `Your battle with <@${mention.id}> will begin soon.` });
                    } catch (e) {
                        sendEmbed(context, { description: `An error occured. It seems that I can"t send DMs to <@${context.user.id}>. Please enable them if you want to battle.` });
                        return;
                    }
                    try {
                        messagep2 = await sendDM(context.client, mention.id, { content: `Your battle with <@${context.user.id}> will begin soon.` });
                    } catch (e) {
                        sendEmbed(context, { description: `An error occured. It seems that I can"t send DMs to <@${mention.id}>. Please enable them if you want to battle.` });
                        return;
                    }
                    if (messagep1 !== undefined && messagep2 !== undefined) {
                        const p1Context: any = {
                            message: messagep1,
                            userID: context.user.id,
                            username: context.user.username,
                        };
                        const p2Context: any = {
                            message: messagep2,
                            userID: mention.id,
                            username: mention.username,
                        };

                        context.client.startBattle(JSON.stringify({
                            p1: p1Context,
                            p2: p2Context,
                            p1Team: player1Team,
                            p2Team: player2Team,
                            channel: context.interaction.channelId,
                            broadcast: context.interaction.options.getBoolean("broadcast") ?? false,
                        }));
                    }
                });
            });
        } else if (context.interaction.options.getSubcommand() === "cancel") {
            if (fights[context.user.id] !== undefined && fights[context.user.id].fight !== undefined) {
                fights[context.user.id].fight.kill();
                delete fights[context.user.id];
            }
            if (fights[context.user.id] !== undefined && fights[fights[context.user.id].opponent] !== undefined) {
                fights[fights[context.user.id].opponent].fight.kill();
                delete fights[fights[context.user.id].opponent];
            }
            sendEmbed(context, { description: "Battle has been canceled" });
        }
    },
};
