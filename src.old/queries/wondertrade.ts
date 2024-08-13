import { gql } from 'graphql-request';

export const GET_WONDERTRADE = gql`
    query getWondertrade($discord_id: String){
        wondertrade(filter: {discord_id: $discord_id}) {
            _id
            discord_id
            pokemon
        }
    }
`;

export const GET_WONDERTRADES = gql`
    query getWondertrade {
        wondertrades {
            _id
            discord_id
            pokemon
        }
    }
`;

export const CREATE_WONDERTRADE = gql`
    mutation createWondertrade($discord_id: String, $pokemon: JSON) {
        createWondertrade(record: {discord_id: $discord_id, pokemon: $pokemon}) {
            recordId
        }
    }
`;

export const DELETE_WONDERTRADE = gql`
    mutation deleteWondertrade($id: MongoID) {
        deleteWondertrade(filter:{_id: $id}) {
            numAffected
        }
    }
`;