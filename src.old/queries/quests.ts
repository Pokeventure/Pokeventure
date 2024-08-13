import { gql } from 'graphql-request';

export const CREATE_QUEST = gql`
    mutation createQuest($quest: CreateOneQuestInput!) {
        createQuest(record: $quest) {
            recordId
        }
    }
`;

export const UPDATE_QUEST = gql`
    mutation updateQuest($questId: MongoID, $quest: UpdateOneQuestInput!) {
        updateQuest(record: $quest, filter: {_id: $questId}) {
            recordId
        }
    }
`;

export const DELETE_QUEST = gql`
    mutation deleteQuest($questId: MongoID) {
        deleteQuest(filter: {_id: $questId}) {
            recordId
        }
    }
`;

export const DELETE_QUESTS = gql`
    mutation deleteQuests($filter: FilterRemoveManyQuestInput!) {
        deleteQuests(filter: $filter, limit: 999999999) {
            numAffected
        }
    }
`;