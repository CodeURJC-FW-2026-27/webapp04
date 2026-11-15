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

export async function getVehicles(page) {
    return await vehicles.find()
        .sort({ _id: 1 }) // Always the same order, so a vehicle never appears on two pages
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(); // Async function to get only the vehicles of one page
}

export async function countVehicles() {
    return await vehicles.countDocuments(); // Async function to count the stored vehicles
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