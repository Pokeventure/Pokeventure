import { Market } from "../models/market";


function generateNextId(lastId: string, idLength: number = 4) {
    if (lastId.length !== idLength) {
        throw new Error(`Last ID '${lastId}' length should be same as requested length '${idLength}'`);
    }
    // The digits in the space are aliased by these characters:
    const charPool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm',
        'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '2', '3', '4', '5', '6', '7', '8', '9'];
    const base = charPool.length;
    // Translate the last ID from our custom character pool to its corresponding
    // numeric value in the correct base.
    let lastIdNumber: string = '';
    for (let i = 0; i < idLength; i++) {
        lastIdNumber += charPool.indexOf(lastId[i]).toString(base);
    }
    // Switch to Base 10 and add our custom increment to get the next ID.
    // If the size of charPool changes, make sure "increment" is
    // relatively prime with the new base.
    let lastNum: number = parseInt(lastIdNumber, base);
    const increment: number = 3 * Math.pow(base, 3) + 11 * Math.pow(base, 2) + 9 * base + 21;
    let nextNum: number = (lastNum + increment) % Math.pow(base, idLength);
    // switch back to designated base
    //nextNum = nextNum.toString(base);
    // Pad the number with zeroes so we always get the correct length.
    const nextNumStr = ('0'.repeat(idLength) + nextNum).substr((-1) * idLength, idLength);
    // Translate from the designated base to our custom character pool.
    let nextId: string = '';
    for (let i = 0; i < idLength; i++) {
        nextId += charPool[parseInt(nextNumStr[i], base)];
    }
    return nextId;
}

export async function checkMarket() {
    let lastOffer = await Market.findOne({ marketId: { $exists: true } }).sort({ _id: -1 }).exec();
    let offersWithoutId = await Market.find({ marketId: { $exists: false } });
    let id = generateNextId(lastOffer?.marketId ?? 'aaaa', 4);
    offersWithoutId.forEach((offer) => {
        offer.marketId = id;
        offer.save();
        id = generateNextId(id, 4);
    });
    /*const marketCollection = db.collection('market');

    const lastId = (await marketCollection.find({ marketId: { $exists: true } }).sort({ _id: -1 }).toArray())[0];
    let id = generateNextId(lastId?.marketId ?? 'aaaa', 4);
    marketCollection.find({ marketId: { $exists: false } }).toArray((err, res) => {
        if (res.length === 0) { return; }
        const toUpdate: any[] = [];
        res.forEach((element) => {
            toUpdate.push({
                updateOne: {
                    filter: {
                        _id: new ObjectID(element._id),
                    },
                    update: {
                        $set: {
                            marketId: id,
                        },
                    },
                },
            });
            id = generateNextId(id, 4);
        });
        marketCollection.bulkWrite(toUpdate);
    });*/
}