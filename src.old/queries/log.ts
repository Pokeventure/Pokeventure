import { gql } from 'graphql-request';

export const CREATE_MARKET_LOG = gql`
    mutation createMarketLog($data: CreateOneMarketLogInput!) {
        createMarketLog(record: $data) {
            recordId
        }
    }
`;

export const CREATE_MONEY_LOG = gql`
    mutation createMoneyLog($data: CreateOneMoneyLogInput!) {
        createMoneyLog(record: $data) {
            recordId
        }
    }
`;

export const CREATE_TRADE_LOG = gql`
    mutation createTradeLog($data: JSON, $date: Date) {
        createTradeLog(record: {trade: $data, date: $date}) {
            recordId
        }
    }
`;

export const DEAL_RAID_DAMAGE = gql`
    mutation dealRaidDamage($discord_id: String, $raid_id: MongoID, $damage: Int, $pokemonData: JSON) {
        dealRaidDamage(discord_id: $discord_id, raid_id: $raid_id, damage: $damage, pokemonData: $pokemonData) {
            ok
        }
    }
`;

export const DEAL_MEGA_RAID_DAMAGE = gql`
    mutation dealMegaRaidDamage($discord_id: String, $raid_id: MongoID, $damage: Int, $pokemonData: JSON) {
        dealMegaRaidDamage(discord_id: $discord_id, raid_id: $raid_id, damage: $damage, pokemonData: $pokemonData) {
            ok
        }
    }
`;

export const GET_RAID_LOGS = gql`
    query getRaidLogs {
        raidLogs(filter: { ok: false }, sort: DAMAGEDEALT_DESC, limit: 100000) {
            discord_id
            damageDealt
        }
    }
`;

export const GET_MEGA_RAID_LOGS = gql`
    query getMegaRaidLogs {
        megaRaidLogs(filter: { ok: false }, sort: DAMAGEDEALT_DESC, limit: 100000) {
            discord_id
            damageDealt
        }
    }
`;

export const GET_MEGA_RAID_LOG = gql`
    query getMegaRaidLog($discord_id: String) {
        megaRaidLog(filter: { discord_id: $discord_id, ok: false }) {
            ok
        }
    }
`;