import { MongoClient, ObjectId } from 'mongodb'; // Import the MongoClient and ObjectId classes from the mongodb package

export const UPLOADS_FOLDER = './uploads'; // Folder where the vehicle images are stored

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

export async function getVehicles() {
    return await vehicles.find().toArray(); // Async function to get all the vehicles
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