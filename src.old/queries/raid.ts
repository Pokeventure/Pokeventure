import { gql } from 'graphql-request';

export const GET_RAID = gql`
    query getRaid($filter: FilterFindOneRaidInput){
        raid(filter: $filter) {
            _id
            pokemon
            hp
            maxHp
            time
        }
    }
`;

export const START_RAID_TIMER = gql`
    mutation startRaidTimer {
        startRaidTimer {
            ok
        }
    }
`;

export const DELETE_RAID = gql`
    mutation deleteRaid($raid_id: MongoID) {
        deleteRaid(filter: { _id: $raid_id }) {
            recordId
        }
    }
`;

export const CREATE_RAID = gql`
    mutation createRaid($pokemon: JSON, $hp: Float, $maxHp: Float) {
        createRaid(record: { pokemon: $pokemon, hp: $hp, maxHp: $maxHp }) {
            recordId
        }
    }
`;

export const CLEAR_RAID_LOG = gql`
    mutation updateRaidLogs {
        updateRaidLogs(filter: {}, record: { ok: true }) {
            numAffected
        }
    }
`;