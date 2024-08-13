import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../types/command";
import { CommandContext } from "../types/command";
import { pagination } from "../modules/utils";

export const Guide: Command = {
    commandName: 'guide',
    displayName: 'Guide',
    fullDescription: 'Give you a guide to start well.\nUsage: `%PREFIX%guide` to display guide.',
    requireStart: false,
    needPlayer: false,
    showInHelp: true,
    data: () => new SlashCommandBuilder()
        .setName('guide')
        .setDescription('Guide to start well you adventure.'),

    handler(context: CommandContext): any {
        const text = [];

        text.push(`▶️  If you are brand new to the game, to get started use /start command and follow the tutorial quests.

▶️ 🚶 **__Explorin__g** 🚶 
**/map** - will list all locations 
**/move** location:<location #>
**/wild** - spawns wild pokémon
**/fight** (or button) - fights spawned pokémon
**/catch** (or buttons) - attempt to catch

If you are looking to hunt for a particular pokémon, use **/pokedex pokemon:<name>** to find out where they are located on the map! If no location is listed, it may either be a mystery spawn or unavailable.

**/research pokémon:<pokémon>** - will show tasks you can do for a particular pokémon to earn rewards! these tasks include using a pokémon, catching, evolving & feeding them.

__List of rarities & their base spawn rates:__
<:n_:744200749600211004> - Normal 700/1851
<:u_:744200749541621851> - Uncommon 500/1851
<:r_:744200749554073660> - Rare 300/1851
<:sr:744200749189431327> - Super Rare 250/1851
<:ur:744200749537558588> - Ultra Rare 100/1851
<:lr:746745321660481576> - Legendary Rare 1/1851

__Rarity is based off of the pokémon’s total ivs, below are the ranges for each rarity:__
<:n_:744200749600211004> - between 0 and 44 IVs
<:u_:744200749541621851> - between 45 and 59 IVs
<:r_:744200749554073660> - between 60 and 99 IVs
<:sr:744200749189431327> - between 100 and and 149 IVs
<:ur:744200749537558588> - between 150 and 185 IVs
<:lr:746745321660481576> - 186 IVs

✨ default shiny rate is 1/1000 but can be increased with shiny scanner and/or clan perks.`);

        text.push(`▶️ <:pokeball:741809195338432612> **__Pokemon__** <:pokeball:741809195338432612> 
Pokémon go by ID numbers listed in your box. Each of these are placed along side the rating of LR, UR, SR, R, etc. 

**/box** - shows your pokémon
\u3000/box rarity: lr, ur, sr, r, u, n
\u3000/box shiny, legendary, mythical, ultrabeast, event
\u3000/box fav, traded, nickname, item, type
\u3000/sort - will reset sort order to default (catch date)
\u3000/sort order: level, rarity, shiny, fav, number (aka pokédex #) - sorts in ascending order
\u3000\u3000*any of the sort orders above + opposite: true - sorts in descending order*

**/select number: OR nickname:** - selects that pokémon.
/info - displays its info
/nickname rename - give a nickname to your selected pokémon
/nickname reset - removes the nickname
/learn - shows the list of moves it can learn at its current level
/learn move:<movename> slot:<move#> - teaches a move (if move name is more than one word, ignore the space. ex. /learn move:shadowball slot:4)
/lockevolution - locks evolution

**/favorite** - to favourite pokémon 
\u3000/favorite all - favourite all pokémon in your box
\u3000/favorite legendary, mythical, ultrabeast - will favourite all of the chosen filter
\u3000/favorite shiny, event - will favourite all shiny or event pokémon
\u3000/favorite rarity - favourite all pokémon of a certain rarity
\u3000/favorite id: 1,2,3 - favourite by id

**/release**- to release unwanted pokémon
\u3000/release all - all but favourites
\u3000/release <rarity> - releases all but favourites of a certain rarity
\u3000/release id: 1,2,3 - release by id

**/use item:<item name>** - to use stones, food, etc.
**/hold item:<item name>** - to hold a bp shop item
\u3000**/hold** will also take held item from a pokémon

**you can use food to give your pokémon friendship points**
\u3000**/shop category:treats** - to see available treats & how many points they give
\u3000the more friendship your pokémon has, the stronger it will be. if you are at max friendship, your pokémon will have 100% evs in each stat.`);

        text.push(`▶️ <:pokecoin:741699521725333534> **__Shop__** <:pokecoin:741699521725333534> 
/shop - regular shop categories
\u3000/shop balls, evolution, usable, treats - view prices/item numbers 
\u3000/buy item:<item id>
\u3000/iteminfo item:<name>

/bpshop - battle point shop categories
\u3000/bpshop holdable, usable - view prices/item numbers
\u3000/bpbuy item:<item id> 
\u3000/iteminfo item:<name>

/balance - shows your pokécoin and battle point balances
/inventory - shows your item inventory`);

        text.push(`▶️ 💸 **__Market__** 💸
Putting Pokémon on the market goes by ID, while searching goes by names

/market
\u3000/market offers name:<pokémon name>
\u3000/market rarity: lr, ur, sr, r, u, n
\u3000/market shiny, mega

/market sort
\u3000/market offers sort: price, level, rarity

/market sell <ID#> <price>
\u3000/market sell pokemon:4 price:10000
\u3000\u3000sells pokémon with id #4, for 10,000pc

/market view offer:<offerID> - infos the marketplace offer
/market buy offer:<offerID> - to purchase a pokémon
/market me - shows your current marketplace listings
/market cancel offer:<offerID> - cancels an offer`);

        text.push(`▶️ 🤝 **__Trading__** 🤝
/trade view - shows current trade
\u3000/trade pokemon - add a pokémon to trade
\u3000/trade money - add coins to a trade 
\u3000/trade accept - finalizes trade 
\u3000/trade cancel - cancels trade 

/give - to gift coins to another player

/wondertrade
\u3000/wondertrade pokemon:<id> - send a pokémon to a random trainer, and receive one in return`);

        text.push(`▶️ 👾 **__Raiding__** 👾
There are regular raids and mega raids. Regular raids are the main way to make money in Pokéventure, you get one coin for each hp of damage.

Raid length is fixed to 20 minutes. There are 15 minutes between the end of one raid and the start of the next. 
\u3000/raid - joins the raid
\u3000/raid info:true - shows the info of the raid boss
\u3000Afterwards you get 3 chances to catch using /catch

Mega raids are HP based. Max mega raid length is 3 hours if the boss has not taken enough damage before then. There is an hour between each mega raid.
\u3000They require a mega raid pass (one-time use), which you can purchase using bp or get as a reward from voting. 
\u3000/bpbuy item:16 - buys a mega raid pass using BP
\u3000/use item:pass - uses a mega raid pass so you are able to join the raid
\u3000/megaraid - joins a mega raid
\u3000/megaraid info:true - shows the info of the mega raid boss
\u3000You don’t catch after a mega raid, but you do receive stones based on damage.

__Number of stones required for mega evolution__:
<:n_:744200749600211004> - 3 
<:u_:744200749541621851> - 6 
<:r_:744200749554073660> - 9 
<:sr:744200749189431327> - 12
<:ur:744200749537558588> - 15
<:lr:746745321660481576> - 18`);

        text.push(`▶️ 🥊 **__Gyms__** 🥊 
Gyms are against the NPC to gain Battle Points.

/gym view - shows current gyms in whichever region you select
\u3000/gym fight - to battle the next gym
After you defeat a full league, you can switch to the next difficulty to receive a new list with higher leveled mons, using /gym difficulty.
\u3000/gym reset - resets your gym progress, can be done once every 20 hours

/team view - shows your 3 party team
\u3000/team add pokémon:<id> - adds a Pokémon
\u3000/team remove pokémon:<slot#> - removes a Pokémon
\u3000/team create name:<name> - creates a new team
\u3000/team select name:<name> - selects that team
\u3000/team rename name:<new name> - renames your current team
\u3000/team delete name:<name> - deletes that tem

:bp: BP given for clearing gyms :bp: 
\u3000standard league (lv50) - 7 BP
\u3000expert league (lv75) - 9 BP
\u3000master league (lv100) - 12 BP
\u3000nightmare league (lv120) - 25 BP
\u3000ultra nightmare league (lv120 vs. 1) - 40 BP
\u3000\u3000+ 2 BP per gym`);

        text.push(`▶️ 🏰 **__Clans__** 🏰 
Clans are groups made to play together and get bonus as you progress. You can buy perks for you and your friends and increase your chances in various things.

/clan view - to view details about your clan
\u3000/clan create - creates a clan, costs 10 million coins
\u3000/clan invite - invite people to your clan (start with 10 spots)
\u3000/clan donate - donate coins to your clan to be used for raids or perks 
\u3000/clan shop - view buyable perks 
\u3000/clan perks - view your current clan perks

The first level of perks is buyable at level 1 but afterwards, you have to increase your clan's level by fighting Pokémon in the wild. You will get 10% of your fight EXP as Clan EXP.

▶️ 👾 Clan Raids 👾
Clan raids are different than normal raids. First of all, they have chances to be shiny! Secondly, the movesets do not work like normal raids - each Pokémon will have moves defined by their type. (For example, a Pokémon that is :Ground: Ground and :Fighting: Fighting will have one :Ground: Ground move and one :fight: Fighting move.)

The type of move is defined by Atk. and Sp.Atk; if total Atk. is greater, moves will be physical. If total Sp.Atk. is greater, moves will be special. If your Pokémon is monotype, it will have both physical and special. Each moves is Base Power 100, Accuracy 100 and 5 PP.

Raids will start 5 minutes after you pay the fee to start and they will last 15 minutes or until you defeat them. It's not recommend to go in alone.

/clan start-raid - to start a clan raid, costs 100k coins 
\u3000/clan join-raid - to join the raid, costs 100k coins per person
\u3000/clan raid - continue fighting the raid every 10 seconds
\u3000/clan catch - use a premier ball to try to catch the raid pokémon

▶️ 🏯 **__Dojo__** 🏯 
Dojo is a similar feature to Gyms in Pokémon Go.

Starting at level 10, Clans will have a Dojo. You can add one Pokémon to your Clan's Dojo to protect it from other players attacking it. You will have 10 stamina and it will use 1 every time you fight. You get 1 stamina every 30 minutes.

When you attack a Dojo, it will be fighting a random Dojo and depending of the result of the fight you will earn points:
- 2 for fighting a Dojo
- 8 for defeating a Pokémon in a Dojo
- 1 for defending your Dojo

Every Sunday, rewards will be sent for the highest Dojo points.
- 1st place clan gets 1 shiny rare raid + 5 rarity gems for each member
- 2nd & 3rd place get 1 shiny raid + 3 rarity gems each
- 4th & 5th place get 1 rare raid + 2 rarity gems each
- 6th & below get 1 rarity gem each + dojo points x1000 in clan exp

/dojo view - view your clan's dojo pokémon and your stamina
\u3000/dojo add pokemon:<id> - to add a pokémon to your dojo
\u3000/dojo fight - to fight a random clan's dojo`);

        const pages = [];
        for (let i = 0; i < text.length; i++) {
            pages[i] = new EmbedBuilder();
            pages[i].setDescription(text[i]);
        }

        pagination(context, pages);
    },
};
