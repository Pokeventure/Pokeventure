import { CommandContext } from 'command';
import { debounce } from 'throttle-debounce';
import { formatPokemonForFight, sendEmbed, updateMessage } from './utils';
import { BattleStream, getPlayerStreams } from '../../simulator/.sim-dist/battle-stream.js';
import { RandomPlayerAI } from '../../simulator/.sim-dist/tools/random-player-ai.js';
import { DiscordPlayer } from '../../simulator/.sim-dist/tools/discord-player.js';
import { getPokemon, normalizeName } from './pokedex';
import Logger from './logger';
import Teams from '../../simulator/.sim-dist/teams';
import { MessageEmbed } from 'discord.js';

export default class Fight {
  needToKill = false;

  isAutomatic = true;

  streams: any;

  constructor() {
    this.streams = undefined;
  }

  kill() {
    this.needToKill = true;
    try {
      this.streams.omniscient.write('>forcetie');
      this.inactiveTimer.cancel();
    } catch (e) {
      Logger.error(e);
    }
  }

  generateImage(fightData: any, location: number, isRaid: number) {
    const object = {
      p1: {
        name: fightData.currentPokemonP1.name,
        pokemon: fightData.currentPokemonP1.displayName,
        level: fightData.currentPokemonP1.level,
        shiny: fightData.currentPokemonP1.shiny,
        health: fightData.currentPokemonP1.hp,
        forme: fightData.currentPokemonP1.forme,
        gender: fightData.currentPokemonP1.gender,
        substitute: fightData.currentPokemonP1.substitute,
      },
      p2: {
        name: fightData.currentPokemonP2.name,
        pokemon: fightData.currentPokemonP2.displayName,
        level: isRaid > 0 && isRaid <= 2 ? '?' : fightData.currentPokemonP2.level,
        shiny: fightData.currentPokemonP2.shiny,
        health: isRaid === 1 ? '???/???' : fightData.currentPokemonP2.hp,
        forme: fightData.currentPokemonP2.forme,
        gender: fightData.currentPokemonP2.gender,
        substitute: fightData.currentPokemonP2.substitute,
      },
      location,
    };
    return Buffer.from(JSON.stringify(object)).toString('base64');
  }

  inactiveTimer: any = null;

  warningTimer: any = null;

  broadcastMessage: any = null;

  async start(context: CommandContext, p1PokemonsRaw: any[], p2PokemonsRaw: any[], isRaid: number, maxHp = 0, currentHp = 0, location = -1, trainer1 = 'You', trainer2 = '', isAutomatic = true, pvpSettings?: { p1: any, p2: any, broadcast: boolean }) {
    return new Promise(async (resolve) => {
      this.inactiveTimer = debounce(120000, () => {
        this.kill();
        resolve({ inactive: 1 });
      });

      this.streams = getPlayerStreams(new BattleStream());

      const spec = {
        formatid: (isRaid ? 'gen8raid' : 'gen8customgame'),
      };

      const p1Pokemons = [];
      const p2Pokemons = [];
      const consumedItem: any = [];

      for (let i = 0; i < p1PokemonsRaw.length; i++) {
        p1Pokemons[i] = formatPokemonForFight(p1PokemonsRaw[i], i);
      }

      for (let i = 0; i < p2PokemonsRaw.length; i++) {
        p2Pokemons[i] = formatPokemonForFight(p2PokemonsRaw[i], i);
      }

      if (isRaid) {
        if (p1Pokemons[0].ability === 'Perish Body' || p1Pokemons[0].ability === 'perishbody') {
          p1Pokemons[0].ability = 'Weak Armor';
        }
        p1Pokemons[0].moves = p1Pokemons[0].moves.filter((x: string) => ['rollout', 'iceball', 'fissure', 'guillotine', 'horndrill', 'sheercold', 'perishsong', 'curse', 'gigaimpact', 'painsplit', 'superfang', 'naturesmadness', 'endeavor', 'destinybond', 'metronome'].indexOf(x) < 0);
      }
      if (p1Pokemons[0].moves.length <= 0) {
        p1Pokemons[0].moves = ['struggle'];
      }

      const p1spec = {
        name: 'you',
        team: Teams.pack(p1Pokemons),
      };
      const p2spec = {
        name: 'ai',
        team: Teams.pack(p2Pokemons),
        raid: isRaid,
        maxHp,
        currentHp,
      };

      let p1 = null;
      let p2 = null;
      if (isAutomatic) {
        p1 = new RandomPlayerAI(this.streams.p1);
        p2 = new RandomPlayerAI(this.streams.p2);
      } else if (pvpSettings?.p2 !== undefined && pvpSettings?.p2 !== null) {
        p1 = new DiscordPlayer(this.streams.p1, {}, false, pvpSettings?.p1);
        p2 = new DiscordPlayer(this.streams.p2, {}, false, pvpSettings?.p2);
      } else {
        p1 = new DiscordPlayer(this.streams.p1, { hideWaitingForOpponent: true }, false, pvpSettings?.p1);
        p2 = new RandomPlayerAI(this.streams.p2);
      }
      this.isAutomatic = isAutomatic;

      let currentPokemonP1: any = p1Pokemons[0];
      let currentPokemonP2: any = p2Pokemons[0];

      if (pvpSettings?.broadcast) {
        this.broadcastMessage = await sendEmbed({ context, message: 'Fight will appear here.' });
      }

      let pokemonData = getPokemon(normalizeName(p1Pokemons[0].species));
      currentPokemonP1 = {
        data: pokemonData, displayName: pokemonData.displayName, name: p1Pokemons[0].name.split(';')[0], level: p1Pokemons[0].level, shiny: p1Pokemons[0].shiny, forme: p1Pokemons[0].forme, gender: p1Pokemons[0].gender,
      };

      pokemonData = getPokemon(normalizeName(p2Pokemons[0].species));
      currentPokemonP2 = {
        data: pokemonData, displayName: pokemonData.displayName, name: p2Pokemons[0].name.split(';')[0], level: p2Pokemons[0].level, shiny: p2Pokemons[0].shiny, forme: p2Pokemons[0].forme, gender: p2Pokemons[0].gender,
      };

      void p1.start();
      void p2.start();

      function parseProtocol(text: string) {
        const action = text.split('|')[1];
        switch (action) {
          case 'move': {
            const move_data = text.split('|');
            let self = move_data[2].startsWith('p1');
            return { text: `$NAME used ${move_data[3]}`, self, move: true };
            break;
          }
          case '-supereffective':
            return { text: 'It\'s super effective!' };
            break;
          case '-resisted':
            return { text: 'It\'s not very effective...' };
            break;
          case '-crit':
            return { text: 'Critical hit!' };
            break;
          case '-damage': {
            const damage_data = text.split('|');
            let self = damage_data[2].startsWith('p1');
            if (damage_data[4] !== undefined) {
              if (damage_data[4] === '[from] confusion') {
                return { text: 'It damage itself in its confusion!', health: damage_data[3], self };
              } if (damage_data[4] === '[from] psn') {
                return { text: '$NAME was hurt by poison.', health: damage_data[3], self };
              } if (damage_data[4] === '[from] brn') {
                return { text: '$NAME was hurt by its burn.', health: damage_data[3], self };
              } if (damage_data[4] === '[from] recoil') {
                return { text: '$NAME was damaged by the recoil.', health: damage_data[3], self };
              }
              return { text: `$NAME was damaged by ${damage_data[4].replace('[from] ', '')}.`, health: damage_data[3], self };
            }
            return { health: damage_data[3], self };
            break;
          }
          case '-miss':
            return { text: 'But it missed' };
            break;
          case 'faint': {
            const faint_data = text.split('|');
            let self = faint_data[2].startsWith('p1');
            return { text: '$NAME fainted', self };
            break;
          }
          case '-mustrecharge': {
            const recharge_data = text.split('|');
            let self = recharge_data[2].startsWith('p1');
            return { text: '$NAME must recharge', self };
            break;
          }
          case 'cant': {
            const cant_data = text.split('|');
            let self = cant_data[2].startsWith('p1');
            if (cant_data[3] === 'slp') {
              return { text: '$NAME is fast asleep.', self };
            } if (cant_data[3] === 'flinch') {
              return { text: '$NAME flinched and couldn\'t move.', self };
            } if (cant_data[3] === 'par') {
              return { text: '$NAME\'s fully paralyzed.', self };
            } if (cant_data[3] === 'frz') {
              return { text: '$NAME is frozen solid.', self };
            } if (cant_data[3] === 'recharge') {
              return { text: '$NAME must recharge.', self };
            }
            return { text: 'Waiting for next turn...', self };
            break;
          }
          case 'switch': {
            const switch_data = text.split('|');
            let self = switch_data[2].startsWith('p1');
            let name = switch_data[2].split(/(p1a: |p2a: )/)[2];
            const pokemon_data = switch_data[3].replace(/ /g, '').split(',');
            const gender = pokemon_data.includes('M') ? 'M' : pokemon_data.includes('F') ? 'F' : 'N';
            let level = 100;
            if (pokemon_data[1] !== undefined) {
              if (pokemon_data[1].charAt(0) === 'L') {
                level = parseInt(pokemon_data[1].substr(1));
              }
            }
            return {
              text: '$TRAINER sent out $NAME!',
              switch: {
                displayName: pokemon_data[0], name, level, shiny: !!pokemon_data.includes('shiny'), gender,
              },
              health: switch_data[4],
              self,
            };
            break;
          }
          case '-unboost': {
            const unboost_data = text.split('|');
            let self = unboost_data[2].startsWith('p1');
            return { text: `$NAME ${unboost_data[3]} decreased`, self };
            break;
          }
          case '-boost': {
            const boost_data = text.split('|');
            let self = boost_data[2].startsWith('p1');
            return { text: `$NAME ${boost_data[3]} increased`, self };
            break;
          }
          case '-immune': {
            const immune_data = text.split('|');
            let self = immune_data[2].startsWith('p1');
            return { text: 'but $NAME is immunised', self };
            break;
          }
          case '-heal': {
            const heal_data = text.split('|');
            let self = heal_data[2].startsWith('p1');
            return { health: heal_data[3], text: '$NAME\'s HP was restored', self };
            break;
          }
          case '-fail': {
            const fail_data = text.split('|');
            let self = fail_data[2].startsWith('p1');
            return { text: 'but it failed', self };
            break;
          }
          case '-status': {
            const status_data = text.split('|');
            let self = status_data[2].startsWith('p1');
            let status = status_data[3];
            switch (status) {
              case 'psn':
                return { text: '$NAME is poisoned', status: 'psn', self };
              case 'tox':
                return { text: '$NAME is badly poisoned', status: 'tox', self };
              case 'brn':
                return { text: '$NAME is burned', status: 'brn', self };
              case 'frz':
                return { text: '$NAME is frozen solid', status: 'frz', self };
              case 'par':
                return { text: '$NAME is paralyzed. It can\'t move!', status: 'par', self };
              case 'slp':
                return { text: '$NAME fell asleep!', status: 'slp', self };
              case 'cfs':
                return { text: '$NAME became confused!', self };
              default:
                return null;
            }
            break;
          }
          case '-curestatus':
            break;
          case '-start': {
            const start_data = text.split('|');
            let self = start_data[2].startsWith('p1');
            if (start_data[3] === 'confusion') {
              return { text: '$NAME became confused!', self };
            } if (start_data[3] === 'Substitute') {
              return { text: '$NAME put in a substitute!', self, substitute: true };
            }
            break;
          }
          case '-end': {
            const end_data = text.split('|');
            let self = end_data[2].startsWith('p1');
            if (end_data[3] === 'confusion') {
              return { text: '$NAME is not confused anymore.', self };
            } if (end_data[3] === 'Substitute') {
              return { text: '$NAME\'s substitute faded!', self, substitute: false };
            }
            break;
          }
          case '-activate': {
            const activate_data = text.split('|');
            let self = activate_data[2].startsWith('p1');
            if (activate_data[3] === 'confusion') {
              return { text: '$NAME is confused. ', self };
            }
            break;
          }
          case '-enditem': {
            const item_data = text.split('|');
            let self = item_data[2].startsWith('p1');
            if (item_data[4] === '[eat]') {
              return {
                text: `$NAME ate ${item_data[3]}.`, self, consumedItem: true, consumedBy: item_data[2].split(';')[1],
              };
            }
            break;
          }
          case '-ohko':
            return { text: 'It\'s a one-hit KO!' };
            break;
          case 'drag':
            const drag_data = text.split('|');
            let self = drag_data[2].startsWith('p1');
            let name = drag_data[2].split(/(p1a: |p2a: )/)[2];
            const pokemon_data = drag_data[3].replace(/ /g, '').split(',');
            const gender = pokemon_data.includes('M') ? 'M' : pokemon_data.includes('F') ? 'F' : 'N';
            let level = 100;
            if (pokemon_data[1] !== undefined) {
              if (pokemon_data[1].charAt(0) === 'L') {
                level = parseInt(pokemon_data[1].substr(1));
              }
            }
            return {
              text: '$NAME was dragged out!',
              switch: {
                displayName: pokemon_data[0], name, level, shiny: !!pokemon_data.includes('shiny'), gender,
              },
              health: drag_data[4],
              self,
            };
            break;
          case 'turn':
          case 'upkeep':
          case '':
            return null;
            break;
          default:
            // console.log(`Not handled ${action} (${text})`)
            break;
        }
        return null;
      }

      void (async () => {
        let chunk;
        let turn_count = 0;
        const fight_result: any[] = [];
        let turn_result = [];
        while ((chunk = await this.streams.omniscient.read())) {
          const turn = chunk.split('\n');
          let turn_info = turn[turn.length - 1].split('|');
          if (turn_info[1] === 'debug') {
            turn_info = turn[turn.length - 2].split('|');
          }
          let turnFinished = false;
          switch (turn_info[1]) {
            case 'teampreview':
              for (let i = 0; i < turn.length; i++) {
                // console.log(turn[i])
                // let result = parseProtocol(turn[i])
                // if (result !== null) turn_result.push(result)
              }
              break;

            case 'turn':
              for (let i = 0; i < turn.length; i++) {
                const result = parseProtocol(turn[i]);
                if (result !== null) {
                  if (result.switch !== undefined && turn_count > 0) {
                    fight_result.push(turn_result);
                    turn_result = [];
                  }
                  turn_result.push(result);
                }
              }
              turn_count = parseInt(turn_info[2]);
              turnFinished = true;
              break;

            case 'upkeep':
              turn_info = turn[turn.length - 2].split('|');

              for (let i = 0; i < turn.length; i++) {
                const result = parseProtocol(turn[i]);
                if (result !== null) { turn_result.push(result); }
              }

              if (turn_info[1] === 'win') {
                if (turn_info[2] === 'you') {
                  turn_result.push({ text: 'You won', victory: true, self: true });
                } else {
                  turn_result.push({ text: 'You lost', victory: false, self: false });
                }
                turnFinished = true;
              }
              if (!this.isAutomatic) {
                turnFinished = true;
              }
              break;
            case 'win':
              for (let i = 0; i < turn.length; i++) {
                const result = parseProtocol(turn[i]);
                if (result !== null) { turn_result.push(result); }
              }

              if (turn_info[2] === 'you') {
                turn_result.push({ text: 'You won', victory: true, self: true });
              } else {
                turn_result.push({ text: 'You lost', victory: false, self: false });
              }
              turnFinished = true;
              break;

            default:
              if (turn_count >= 0) {
                for (let i = 0; i < turn.length; i++) {
                  const result = parseProtocol(turn[i]);
                  if (result !== null) { turn_result.push(result); }
                }
              }
              break;
          }
          if (turn_result.length > 0 && turnFinished) {
            fight_result.push(turn_result);
            let victory = -1;
            if (!this.isAutomatic) {
              while (fight_result.length > 0) {
                turn_result = fight_result.shift();
                if (turn_result.length === 0) { continue; }
                let text = '';
                turn_result.forEach((result_line: any) => {
                  if (result_line.switch !== undefined) {
                    const pokemonData = getPokemon(normalizeName(result_line.switch.displayName));
                    if (result_line.self) {
                      currentPokemonP1 = {
                        data: pokemonData, name: result_line.switch.name.split(';')[0], displayName: result_line.switch.displayName, level: result_line.switch.level, shiny: result_line.switch.shiny, gender: result_line.switch.gender,
                      };
                    } else {
                      currentPokemonP2 = {
                        data: pokemonData, name: result_line.switch.name.split(';')[0], displayName: result_line.switch.displayName, level: result_line.switch.level, shiny: result_line.switch.shiny, gender: result_line.switch.gender,
                      };
                    }
                  }
                  if (result_line.status !== undefined) {
                    if (result_line.self) {
                      currentPokemonP1.hp += ` ${result_line.status}`;
                    } else {
                      currentPokemonP2.hp += ` ${result_line.status}`;
                    }
                  }
                  if (result_line.health !== undefined) {
                    if (result_line.self) {
                      currentPokemonP1.hp = result_line.health;
                    } else {
                      currentPokemonP2.hp = result_line.health;
                    }
                    if (result_line.switch === undefined) { return; }
                  }
                  if (result_line.substitute !== undefined) {
                    if (result_line.self) {
                      currentPokemonP1.substitute = result_line.substitute;
                    } else {
                      currentPokemonP2.substitute = result_line.substitute;
                    }
                  }
                  if (result_line.text === undefined) { return; }
                  let replaced = result_line.text?.replace('$NAME', result_line.self ? currentPokemonP1.name.split(';')[0] : currentPokemonP2.name.split(';')[0]);
                  replaced = replaced.replace('$TRAINER', result_line.self ? trainer1 : trainer2);
                  if (result_line.self) {
                    replaced = `${replaced} {p1}`;
                  } else {
                    replaced = `${replaced} {p2}`;
                  }
                  if (result_line.victory !== undefined) {
                    replaced = `{victory ${result_line.self ? 'p1' : 'p2'}}`;
                    victory = result_line.victory;
                  }
                  text += `${replaced}\n`;
                });

                if (pvpSettings?.broadcast) {
                  let embed = new MessageEmbed();
                  embed.setColor('#0000ff')
                    .setImage(`http://image.pokeventure.com/?d=${this.generateImage({ currentPokemonP1, currentPokemonP2 }, location, isRaid)}`)
                    .setDescription(`${text.replace(/{p1}/g, '').replace(/{p2}/g, '').replace(/{victory p1}/, `<@${pvpSettings.p1.userID}> won!`).replace(/{victory p2}/, `<@${pvpSettings.p2.userID}> won!`)}`);
                  updateMessage(context.client, this.broadcastMessage, { embeds: [embed] });
                }

                let embed = new MessageEmbed();
                embed.setColor('#0000ff')
                  .setImage(`http://image.pokeventure.com/?d=${this.generateImage({ currentPokemonP1, currentPokemonP2 }, location, isRaid)}`)
                  .setFooter(`${text.replace(/{p1}/g, '*').replace(/{p2}/g, '').replace(/{victory p1}/, 'You won!').replace(/{victory p2}/, 'You lost.')}`);
                updateMessage(context.client, pvpSettings?.p1.message, { embeds: [embed] });
                // pvpSettings?.p1.channel.createMessage(embed.getObject());

                if (pvpSettings?.p2 !== undefined && pvpSettings?.p2 !== null) {
                  embed.setImage(`http://image.pokeventure.com/?d=${this.generateImage({ currentPokemonP1: currentPokemonP2, currentPokemonP2: currentPokemonP1 }, location, isRaid)}`);
                  embed.setFooter(`${text.replace(/{p1}/g, '').replace(/{p2}/g, '*').replace(/{victory p1}/, 'You lost.').replace(/{victory p2}/, 'You won!')}`);
                  updateMessage(context.client, pvpSettings?.p2.message, { embeds: [embed] });
                }

                if (victory !== -1) {
                  resolve({ victory, hp: parseInt(currentPokemonP2.hp.split('/')[0]) });
                }
              }
            }
            turn_result = [];
            if (!this.isAutomatic && victory === -1) {
              this.inactiveTimer();
              // @ts-ignore
              p1.requestActions();
              if (pvpSettings?.p2 !== undefined && pvpSettings?.p2 !== null) {
                // @ts-ignore
                p2.requestActions();
              }
            }
          }
        }

        if (this.isAutomatic) {
          let pokemonData = getPokemon(normalizeName(p1Pokemons[0].species));
          currentPokemonP1 = {
            data: pokemonData, displayName: pokemonData.displayName, name: p1Pokemons[0].name.split(';')[0], level: p1Pokemons[0].level, shiny: p1Pokemons[0].shiny, forme: p1Pokemons[0].forme, gender: p1Pokemons[0].gender,
          };

          pokemonData = getPokemon(normalizeName(p2Pokemons[0].species));
          currentPokemonP2 = {
            data: pokemonData, displayName: pokemonData.displayName, name: p2Pokemons[0].name.split(';')[0], level: p2Pokemons[0].level, shiny: p2Pokemons[0].shiny, forme: p2Pokemons[0].forme, gender: p2Pokemons[0].gender,
          };

          currentPokemonP1.hp = fight_result[0][0].health;
          currentPokemonP2.hp = fight_result[0][1].health;

          let turn = 0;

          for (let i = 0; i < fight_result.length; i++) {
            const result_lines = fight_result[i];
            let victory = -1;
            result_lines.forEach((result_line: any) => {
              if (result_line.switch !== undefined) {
                const pokemonData = getPokemon(normalizeName(result_line.switch.displayName));
                if (result_line.self) {
                  if (p1Pokemons.length > 1) {
                    currentPokemonP1 = {
                      data: pokemonData, name: result_line.switch.name.split(';')[0], displayName: result_line.switch.displayName, level: result_line.switch.level, shiny: result_line.switch.shiny, gender: result_line.switch.gender,
                    };
                  }
                } else {
                  if (p2Pokemons.length > 1) {
                    currentPokemonP2 = {
                      data: pokemonData, name: result_line.switch.name.split(';')[0], displayName: result_line.switch.displayName, level: result_line.switch.level, shiny: result_line.switch.shiny, gender: result_line.switch.gender,
                    };
                  }
                }
              }
              if (result_line.status !== undefined) {
                if (result_line.self) {
                  currentPokemonP1.hp += ` ${result_line.status}`;
                } else {
                  currentPokemonP2.hp += ` ${result_line.status}`;
                }
              }
              if (result_line.health !== undefined) {
                if (result_line.self) {
                  currentPokemonP1.hp = result_line.health;
                } else {
                  currentPokemonP2.hp = result_line.health;
                }
              }
              if (result_line.substitute !== undefined) {
                if (result_line.self) {
                  currentPokemonP1.substitute = result_line.substitute;
                } else {
                  currentPokemonP2.substitute = result_line.substitute;
                }
              }
              if (result_line.self && result_line.consumedItem !== undefined) {
                consumedItem.push(result_line.consumedBy);
              }
              if (result_line.text === undefined) { return; }
              if (result_line.victory !== undefined) {
                victory = result_line.victory;
                // color = result_line.victory ? 0x00ff00 : 0xff0000;
              }
            });
            turn++;

            if (victory !== -1) {
              resolve({
                victory, hp: parseInt(currentPokemonP2.hp.split('/')[0]), consumedItem, image: `http://image.pokeventure.com/?d=${this.generateImage({ currentPokemonP1, currentPokemonP2 }, location, isRaid)}#`, turn,
              });
            }
          }
        }
        this.inactiveTimer.cancel();
      })();

      void this.streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);
    });
  }
}
