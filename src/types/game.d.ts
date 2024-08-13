import { IPokemon } from "./pokemon";

export interface IQuest {
    discord_id: string;
    type: string;
    value: number;
    objective: number;
    data?: any;
    reward: any;
    tutorial?: boolean;
    event?: boolean;
    patreon?: boolean;
    repeatable?: boolean;
}

export interface IInventory {
    discord_id: string;
    inventory: {
        [itemId: string]: {
            quantity: number
        }
    };
    lootbox: {
        [lootboxId: string]: number
    };
}

export interface IRaid {
    pokemon: IPokemon;
    hp: number;
    maxHp: number;
    time?: Date;
}

export interface IMegaRaid extends IRaid {
    drop: number;
}

export interface IClanRaid extends IRaid {
    clan: Schema.Types.ObjectId;
}

export interface ITrade {
    tradingWith: string;
    selectedPokemon?: any;
    money?: number;
    accepted: boolean;
}

export interface IClan {
    name: string,
    balance: number,
    owner: string,
    experience: number,
    banner: string,
    logo: string,
    motd: string,
    color: string,
    perks: any,
    channel: string,
    dojoPoints: number,
    ranking: number,
    rewards: any
}

export interface ITeam {
    name: string,
    discord_id: string,
    team: Pokemon[],
}