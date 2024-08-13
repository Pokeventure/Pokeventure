import { gql } from 'graphql-request';

export const CREATE_TEAM = gql`
  mutation createTeam($discord_id: String, $name: String) {
    createTeam(record: { discord_id: $discord_id, name: $name }) {
      recordId
      error {
        message
      }
    }
  }
`;

export const GET_TEAM_BY_NAME = gql`
  query getTeamByName($discord_id: String, $name: String) {
    team(filter: {discord_id: $discord_id, name: $name}) {
      _id
      name
    }
  }
`;

export const ADD_TO_TEAM = gql`
  mutation addToTeam($team: MongoID, $pokemon: MongoID, $slot: Int) {
    addToTeam(team: $team, pokemon: $pokemon, slot: $slot) {
      ok
    }
  }
`;

export const REMOVE_FROM_TEAM = gql`
  mutation removeFromTeam($team: MongoID, $slot: Int) {
    removeFromTeam(team: $team, slot: $slot) {
      ok
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation updateTeam($team_id: MongoID, $data: UpdateOneTeamInput!) {
    updateTeam(filter: {_id: $team_id}, record: $data) {
      recordId
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation deleteTeam($team_id: MongoID) {
    deleteTeam(filter: {_id: $team_id}) {
      recordId
    }
  }
`;