import { gql } from 'graphql-request';

export const POKEMON_DATA = gql`
    fragment PokemonData on Pokemon {
        _id
        name
        nickname
        dexId
        owner
        firstOwner
        level
        shiny
        moves
        ivs {
            hp
            atk
            def
            spa
            spd
            spe
        }
        rarity
        fav
        special
        forme
        nature
        abilitySlot
        gender
        item
        experience
        evolutionLock
        mint
        luckyEgg
        locked
        uniqueId
        friendship
    }
`;

export const POKEMON_LIST_DATA = gql`
    fragment PokemonListData on Pokemon {
        _id
        dexId
        fav
        nickname
        shiny
        item
        level
        special
        forme
        rarity
        firstOwner
        owner
        friendship
    }
`;

export const GET_ALL_POKEMONS = gql`
    query getAllPokemons($owner: String, $sort: SortFindManyPokemonInput) {
        pokemons(filter: {owner: $owner}, sort: $sort, limit: 10000) {
            ...PokemonListData
        }
    }
    ${POKEMON_LIST_DATA}
`;

export const GET_POKEMON_BY_NUMBER = gql`
    query getPokemonByNumber($owner: String, $number: Int, $sort: SortFindOnePokemonInput) {
        pokemon(filter: {owner: $owner}, skip: $number, sort: $sort) {
            ...PokemonData
        }
    }
    ${POKEMON_DATA}
`;

export const GET_SELECTED_POKEMON = gql`
    query getPlayerPokemon($discord_id: String) {
        player(filter:{discord_id: $discord_id}) {
            selectedPokemon {
                ...PokemonData
            }
        }
    }
    ${POKEMON_DATA}
`;

export const GET_POKEMON_BY_ID = gql`
    query getPokemonById($id: MongoID) {
        pokemon(filter: {_id: $id}) {
            ...PokemonData
        }
    }
    ${POKEMON_DATA}
`;

export const GET_POKEMON_BY_NICKNAME = gql`
    query getPokemonByNickname($owner: String, $nickname: String) {
        pokemonByNickname(discord_id: $owner, nickname: $nickname) {
            ...PokemonData
        }
    }
    ${POKEMON_DATA}
`;

export const CREATE_POKEMON = gql`
    mutation createPokemon($pokemon: CreateOnePokemonInput!) {
        createPokemon(record: $pokemon) {
            recordId
        }
    }
`;

export const UPDATE_POKEMON = gql`
    mutation updatePokemon($pokemon: UpdateOnePokemonInput!, $filter: FilterUpdateOnePokemonInput) {
        updatePokemon(record: $pokemon, filter: $filter) {
            recordId
        }
    }
`;

export const UPDATE_POKEMONS = gql`
    mutation updatePokemons($data: UpdateManyPokemonInput!, $filters: FilterUpdateManyPokemonInput) {
        updatePokemons(record: $data, filter: $filters) {
            numAffected
        }
    }
`;

export const DELETE_POKEMON = gql`
    mutation deletePokemon($id: MongoID) {
        deletePokemon(filter: { _id: $id }) {
            recordId
        }
    }
`;

export const DELETE_POKEMONS = gql`
    mutation deletePokemons($ids: [MongoID]) {
        deletePokemons(ids: $ids) {
            ok
        }
    }
`;

export const ADD_FRIENDSHIP = gql`
    mutation addFriendship($pokemon: MongoID, $amount: Int) {
        addFriendship(pokemon: $pokemon, amount: $amount) {
            ok
        }
    }
`;