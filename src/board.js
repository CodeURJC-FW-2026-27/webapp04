import { MongoClient, ObjectId } from 'mongodb'; // Import the MongoClient and ObjectId classes from the mongodb package

export const UPLOADS_FOLDER = './uploads'; // Folder where the vehicle images are stored
export const PAGE_SIZE = 6; // Number of vehicles shown on each page of the main page

const client = new MongoClient('mongodb://localhost:27017'); // Create a new MongoClient instance with the connection string to the local MongoDB server
await client.connect();  // Connect to the MongoDB server

const db = client.db('ijam_motors'); // Get a reference to the 'ijam_motors' database or if it doesn't exist, create it (names cannot contain spaces)
const vehicles = db.collection('Vehicles'); // Get a reference to the 'vehicles' collection or if it doesn't exist, create it

export async function findDuplicateVehicles(brand, model) {
    return await vehicles.findOne({brand: brand, model: model}); //Async function to find duplicate vehicles
}

export async function addVehicle(vehicle) {
    return await vehicles.insertOne(vehicle); //Async function to add new vehicle
}

// Builds the MongoDB filter for the main page search, category and sidebar filters:
// every word typed by the user must appear in the brand or in the model (case insensitive),
// if a category is chosen, only the vehicles with that body type are included,
// the year must be inside the chosen range (each limit is optional)
// and the fuel type must be one of the checked ones
function buildVehiclesFilter({ search, bodyType, yearFrom, yearTo, fuelType } = {}) {
    const filter = {};
    if (bodyType) {
        filter.bodyType = bodyType;
    }
    if (fuelType && fuelType.length > 0) {
        filter.fuelType = { $in: fuelType };
    }
    if (yearFrom || yearTo) {
        filter.year = {};
        if (yearFrom) {
            filter.year.$gte = yearFrom;
        }
        if (yearTo) {
            filter.year.$lte = yearTo;
        }
    }
    const words = (search || '').split(/\s+/).filter(word => word !== '');
    if (words.length > 0) {
        filter.$and = words.map(word => {
            // Special characters (like "." or "*") are escaped so they are searched as normal text
            const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            return { $or: [{ brand: regex }, { model: regex }] };
        });
    }
    return filter;
}

export async function getVehicles(criteria, page) {
    return await vehicles.find(buildVehiclesFilter(criteria))
        .sort({ _id: 1 }) // Always the same order, so a vehicle never appears on two pages
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(); // Async function to get only the vehicles of one page that match the search
}

export async function countVehicles(criteria) {
    return await vehicles.countDocuments(buildVehiclesFilter(criteria)); // Async function to count the vehicles that match the search (all of them if there is none)
}

export async function getVehicle(id) {
    if (!ObjectId.isValid(id)) {
        return null; // The id does not have the format of a MongoDB id, so no vehicle can have it
    }
    return await vehicles.findOne({ _id: new ObjectId(id) }); // Async function to get a vehicle by its id
}


// Vehicle deletion & Secondary Entity (Offers)


export async function deleteVehicle(id) { // Delete a main vehicle by its MongoDB id
    if (!ObjectId.isValid(id)) {
        return null;
    }
    return await vehicles.deleteOne({ _id: new ObjectId(id) });
}

// Recalculate and update the lowestPrice field based on current offers
async function updateVehicleLowestPrice(vehicleId) {
    const vehicle = await getVehicle(vehicleId);
    if (!vehicle) return;

    if (vehicle.offers && vehicle.offers.length > 0) {
        const minPrice = Math.min(...vehicle.offers.map(o => Number(o.price)));
        await vehicles.updateOne(
            { _id: new ObjectId(vehicleId) },
            { $set: { lowestPrice: minPrice } }
        );
    }
}

// Add a new embedded offer to a vehicle
export async function addOfferToVehicle(vehicleId, offerData) {
    const newOffer = {
        _id: new ObjectId(),
        ...offerData
    };

    const result = await vehicles.updateOne(
        { _id: new ObjectId(vehicleId) },
        { $push: { offers: newOffer } }
    );

    await updateVehicleLowestPrice(vehicleId);
    return result;
}

// Update an existing embedded offer inside a vehicle
export async function updateOfferInVehicle(vehicleId, offerId, updatedFields) {
    const setFields = {};
    for (const [key, value] of Object.entries(updatedFields)) {
        setFields[`offers.$.${key}`] = value;
    }

    const result = await vehicles.updateOne(
        { _id: new ObjectId(vehicleId), 'offers._id': new ObjectId(offerId) },
        { $set: setFields }
    );

    await updateVehicleLowestPrice(vehicleId);
    return result;
}

// Remove an embedded offer from a vehicle
export async function deleteOfferFromVehicle(vehicleId, offerId) {
    const result = await vehicles.updateOne(
        { _id: new ObjectId(vehicleId) },
        { $pull: { offers: { _id: new ObjectId(offerId) } } }
    );

    await updateVehicleLowestPrice(vehicleId);
    return result;
}