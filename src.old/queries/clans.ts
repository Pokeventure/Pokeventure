import { gql } from 'graphql-request';

export const CREATE_CLAN = gql`
  mutation createClan($name: String, $owner: String) {
    createClan(record: { name: $name, owner: $owner}) {
      recordId
    }
  }
`;

export const DELETE_CLAN = gql`
  mutation deleteClan($id: MongoID) {
    deleteClan(filter: { _id: $id }) {
      recordId
    }
  }
`;

export const UPDATE_CLAN = gql`
  mutation updateClan($id: MongoID, $data: UpdateOneClanInput!) {
    updateClan(filter: { _id: $id }, record: $data) {
      recordId
    }
  }
`;

export const ADD_COINS_TO_CLAN = gql`
  mutation addCoinsToClan($clan_id: String, $quantity: Int) {
    addCoinsToClan(clan_id: $clan_id, quantity: $quantity) {
      ok
    }
  }
`;

export const ADD_EXPERIENCE_TO_CLAN = gql`
  mutation addExperienceToClan($clan_id: String, $quantity: Int) {
    addExperienceToClan(clan_id: $clan_id, quantity: $quantity) {
      levelup
      ok
    }
  }
`;

export const ADD_COINS_TO_CLAN_HISTORY = gql`
  mutation addCoinsToClanHistory($discord_id: String, $quantity: Int) {
    addCoinsToClanHistory(discord_id: $discord_id, quantity: $quantity) {
      ok
    }
  }
`;

export const ADD_EXPERIENCE_TO_CLAN_HISTORY = gql`
  mutation addExperienceToClanHistory($discord_id: String, $quantity: Int) {
    addExperienceToClanHistory(discord_id: $discord_id, quantity: $quantity) {
      ok
    }
  }
`;

export const CREATE_CLAN_HISTORY = gql`
  mutation createClanHistory($clan: MongoID, $discord_id: String) {
    createClanHistory(record: { clan: $clan, discord_id: $discord_id }) {
      recordId
    }
  }
`;

export const GET_CLAN_HISTORY = gql`
  query clan($clan: MongoID, $discord_id: String) {
    clan(filter: {clan: $clan, discord_id: $discord_id}) {
      experience
      coins
      role
    }
  }
`;

export const DELETE_CLAN_HISTORY = gql`
  mutation deleteClanHistory($clan: MongoID, $discord_id: String) {
    deleteClanHistory(filter: { clan: $clan, discord_id: $discord_id }) {
      recordId
    }
  }
`;

export const DELETE_CLAN_HISTORIES = gql`
  mutation deleteClanHistoryies($clan: MongoID) {
    deleteClanHistoryies(filter: { clan: $clan }) {
      numAffected
    }
  }
`;

export const UPDATE_CLAN_HISTORY = gql`
  mutation updateClanHistory($clan: MongoID, $discord_id: String, $data: UpdateOneClanHistoryInput!) {
    updateClanHistory(record: $data, filter: { clan: $clan, discord_id: $discord_id }) {
      recordId
    }
  }
`;

export const CREATE_CLAN_RAID = gql`
  mutation createClanRaid($data: CreateOneClanRaidInput!) {
    createClanRaid(record: $data) {
      recordId
    }
  }
`;

export const GET_CLAN_RAID = gql`
  query getClanRaid($clan: MongoID) {
    clanRaid(filter: {clan: $clan}) {
      _id
      pokemon
      hp
      maxHp
      time
    }
  }
`;

export const DEAL_CLAN_RAID_DAMAGE = gql`
  mutation dealClanRaidDamage($discord_id: String, $raid: MongoID, $damage: Int, $pokemonData: JSON) {
    dealClanRaidDamage(raid_id: $raid, damage: $damage, discord_id: $discord_id, pokemonData: $pokemonData) {
      ok
      ended
      died
    }
  } 
`;

export const GET_CLAN_RAID_LOGS = gql`
  query clanRaidLogs($raid: MongoID) {
    clanRaidLogs(filter: { raid: $raid }, sort: DAMAGEDEALT_DESC) {
      discord_id
      damageDealt
      hits
    }
  }
`;

export const GET_CLAN_RAID_LOG = gql`
  query clanRaidLog($raid: MongoID, $discord_id: String) {
    clanRaidLog(filter: {raid: $raid, discord_id: $discord_id}) {
      discord_id
      damageDealt
      hits
    }
  }
`;


export const ADD_POKEMON_TO_CLAN_GYM = gql`
  mutation addPokemonToGym($discord_id: String, $clan: MongoID, $pokemon: JSON) {
    addPokemonToGym(discord_id: $discord_id, clan: $clan, pokemon: $pokemon) {
      ok
    }
  }
`;

export const REMOVE_POKEMON_FROM_CLAN_GYM = gql`
  mutation removePokemonFromGym($discord_id: String, $clan: MongoID) {
    removePokemonFromGym(discord_id: $discord_id, clan: $clan) {
      ok
    }
  }
`;

export const GET_CLAN_GYM = gql`
  query clanGym($clan: MongoID) {
    clanGym(filter: {clan: $clan}) {
      pokemons {
        pokemon
        owner
        hp
        maxHp
      }
    }
  }
`;

export const GET_RANDOM_GYM_TO_FIGHT = gql`
  query getRandomGymToFight($clan: MongoID) {
    getRandomGymToFight(clan: $clan) {
      clan
    }
  }
`;

export const DEAL_CLAN_GYM_DAMAGE = gql`
  mutation dealClanGymDamage($clan: MongoID, $pokemon: String, $damage: Int) {
    dealClanGymDamage(clan: $clan, pokemon: $pokemon, damage: $damage) {
      killed
    }
  }
`;

export const GET_CLAN = gql`
  query clan($clan: MongoID) {
    clan(filter: {_id: $clan}) {
      _id
      name
    }
  }
`;

export const USE_GYM_STAMINA = gql`
  mutation useGymStamina($discord_id: String) {
    useGymStamina(discord_id: $discord_id) {
      ok
    }
  }
`;

export const ADD_DOJO_POINTS = gql`
  mutation addDojoPoints($discord_id: String, $amount: Int) {
    addDojoPoints(discord_id: $discord_id, amount: $amount) {
      ok
    }
  }
`;

export const UPDATE_RANKING = gql`
  mutation updateRanking {
    updateRanking {
      ok
    }
  }
`;

export const GET_TEN_BEST_CLANS = gql`
  query bestClans {
    clans(sort:RANKING_DESC, limit: 10, filter: { notzero: true }) {
      _id
      name
      ranking
      dojoPoints
    }
  }
`;

export const GET_CLANS = gql`
  query clans {
    clans(sort:RANKING_DESC, filter:{notzero:true}, limit: 10000) {
      _id
      name
      ranking
      rewards
      channel
      dojoPoints
      histories {
        discord_id
        dojoPoints
      }
    }
  }
`;

export const RESET_DOJO = gql`
  mutation resetDojo {
    resetDojo {
      ok
    }
  }
`;

export const RESET_STAMINA = gql`
  mutation resetStamina {
    resetStamina {
      ok
    }
  }
`;