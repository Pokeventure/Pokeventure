import { gql } from 'graphql-request';
import { POKEMON_DATA } from './pokemon';

export const GET_PLAYER = gql`
  query getPlayer($discord_id: String) {
    player(filter: {discord_id: $discord_id}) {
      location
      reward
      money
      sort
      tradeLocked
      patronLevel
      remindVote
      voted
      voteStreak
      rarityScanner
      shinyScanner
      premiumRarityScanner
      premiumShinyScanner
      pokemonReward
      event
      clan {
        _id
        name
        perks
        level
        channel
        members {
          discord_id
        }
      }
      selectedPokemon {
        ...PokemonData
      }
      selectedTeam {
        _id
        name
        team
        teamPopulated {
          ...PokemonData
        }
      }
      started_at
      research {
        data
      }
    }
  }
  ${POKEMON_DATA}
`;

export const GET_PLAYER_QUESTS = gql`
  query getPlayer($discord_id: String) {
    player(filter: {discord_id: $discord_id}) {
      quests {
        _id
        type
        value
        objective
        reward
        data
        event
        repeatable
        patreon
      }
    }
  }
`;

export const GET_PLAYER_TEAMS = gql`
  query getPlayerTeams($discord_id: String) {
    teams(filter: {discord_id: $discord_id}) {
      _id
      name
      team
      teamPopulated {
        ...PokemonData
      }
    }
  }
  ${POKEMON_DATA}
`;

export const SET_PLAYER_SELECTED_TEAM = gql`
  mutation setPlayerSelectedTeam($discord_id: String, $teamId: MongoID) {
    updatePlayer(filter:{discord_id: $discord_id}, record:{selectedTeam: $teamId}) {
      recordId
    }
  }
`;

export const ADD_COINS = gql`
  mutation addCoins($discord_id: String, $quantity: Int) {
    addCoins(discord_id: $discord_id, quantity: $quantity) {
      ok
    }
  }
`;

export const ADD_BATTLE_POINTS = gql`
  mutation addBattlePoints($discord_id: String, $quantity: Int) {
    addBattlePoints(discord_id: $discord_id, quantity: $quantity) {
      ok
    }
  }
`;

export const ADD_CURRENCY = gql`
  mutation addCurrency($discord_id: String, $quantity: Int) {
    addCurrency(discord_id: $discord_id, quantity: $quantity) {
      ok
    }
  }
`;

export const CREATE_PLAYER = gql`
  mutation createPlayer($player: CreateOnePlayerInput!) {
    createPlayer(record: $player) {
      recordId
    }
  }
`;

export const UPDATE_PLAYER = gql`
  mutation updatePlayer($player: UpdateOnePlayerInput!, $discord_id: String) {
    updatePlayer(record: $player, filter: { discord_id: $discord_id }) {
      recordId
    }
  }
`;

export const UPDATE_PLAYERS = gql`
  mutation updatePlayers($record: UpdateManyPlayerInput!, $filter: FilterUpdateManyPlayerInput) {
    updatePlayers(record: $record, filter: $filter) {
      numAffected
    }
  }
`;

export const COUNT_PLAYERS = gql`
  query countPlayers {
    playerPagination {
      count
    }
  }
`;

export const GET_STATS = gql`
  query getStats($discord_id: String) {
    stats(filter: { discord_id: $discord_id }) {
      stats
    }
  }
`;

export const ADD_STAT = gql`
  mutation addStat($discord_id: String, $stat: String, $amount: Int) {
    addStat(discord_id: $discord_id, stat: $stat, amount: $amount) {
      ok
    }
  }
`;

export const GET_PATRONS = gql`
  query getPatrons {
    players(filter: { _operators: { patronLevel: { gt: 0 } } }, limit: 10000) {
      patronLevel
      discord_id
      username
    }
  }
`;

export const GET_PLAYER_CLAN = gql`
  query getPlayerClan($discord_id: String) {
    player(filter: {discord_id: $discord_id}) {
      clan {
        _id
        level
        name
        balance
        experience
        logo
        owner
        members {
          discord_id
        }
        banner
        logo
        motd
        color
        requiredExperience
        history {
          experience
          coins
          role
          createdAt
          stamina
          staminaFull
          dojoPoints
          dojoPointsAllTime
        }
        histories {
          discord_id
          role
        }
        perks
        channel
        dojoPoints
        ranking
        rewards
      }
    }
  }
`;