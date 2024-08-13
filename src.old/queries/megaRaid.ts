import { gql } from 'graphql-request';

export const GET_MEGA_RAID = gql`
    query getMegaRaid($filter: FilterFindOneMegaRaidInput){
        megaRaid(filter: $filter) {
            _id
            pokemon
            hp
            maxHp
            time
        }
    }
`;

export const START_MEGA_RAID_TIMER = gql`
    mutation startMegaRaidTimer {
        startMegaRaidTimer {
            ok
        }
    }
`;

export const DELETE_MEGA_RAID = gql`
    mutation deleteMegaRaid($raid_id: MongoID) {
        deleteMegaRaid(filter: { _id: $raid_id }) {
            recordId
        }
    }
`;

export const CREATE_MEGA_RAID = gql`
    mutation createMegaRaid($pokemon: JSON, $hp: Float, $maxHp: Float) {
        createMegaRaid(record: { pokemon: $pokemon, hp: $hp, maxHp: $maxHp }) {
            recordId
        }
    }
`;

export const CLEAR_MEGA_RAID_LOG = gql`
    mutation updateMegaRaidLogs {
        updateMegaRaidLogs(filter: {}, record: { ok: true }) {
            numAffected
        }
    }
`;