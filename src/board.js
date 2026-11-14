import { MongoClient } from 'mongodb'; // Import the MongoClient class from the mongodb package

const client = new MongoClient('mongodb://localhost:27017'); // Create a new MongoClient instance with the connection string to the local MongoDB server
await client.connect();  // Connect to the MongoDB server

const db = client.db('Car dealership'); // Get a reference to the 'car dealership' database or if it doesn't exist, create it
const vehicles = db.collection('Vehicles'); // Get a reference to the 'vehicles' collection or if it doesn't exist, create it

export async function findDuplicateVehicles(brand, model) {
    return await vehicles.findOne({brand: brand, model: model}); //Async function to find duplicate vehicles
}

export async function addVehicle(vehicle) { 
    return await vehicles.insertOne(vehicle); //Async function to add new vehicle
}