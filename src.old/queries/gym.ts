import { gql } from 'graphql-request';

export const GET_GYM = gql`
  query getGym($discord_id: String) {
    gym(filter: { discord_id: $discord_id }) {
        difficultyLevels
        join
        selectedDifficulty
        selectedRegion
    }
  }
`;

export const CREATE_GYM = gql`
    mutation createGym($data: CreateOneGymInput!) {
        createGym(record: $data) {
            recordId
        }
    }
`;

export const UPDATE_GYM = gql`
    mutation updateGym($discord_id: String, $data: UpdateOneGymInput!) {
        updateGym(record: $data, filter: {discord_id: $discord_id}) {
            recordId
        }
    }
`;

export const DELETE_GYM = gql`
    mutation deleteGym($discord_id: String) {
        deleteGym(filter: {discord_id: $discord_id}) {
            recordId
        }
    }
`;