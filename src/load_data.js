import fs from 'node:fs/promises';
import { ObjectId } from 'mongodb';
import { addVehicle, countVehicles, UPLOADS_FOLDER } from './vehicles.js';

const DATA_FOLDER = './data';

// Sample data is only loaded when the database is empty,
// so the vehicles created from the web are kept when the app restarts
if (await countVehicles() === 0) {

    // Replace the uploads folder with the sample images
    await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true });
    await fs.mkdir(UPLOADS_FOLDER);
    await fs.cp(DATA_FOLDER + '/images', UPLOADS_FOLDER, { recursive: true });

    const dataString = await fs.readFile(DATA_FOLDER + '/data.json', 'utf8');
    const vehicles = JSON.parse(dataString);

    for (let vehicle of vehicles) {
        // Each offer gets its own id so that it can be edited or deleted later
        vehicle.offers = vehicle.offers.map(offer => ({ _id: new ObjectId(), ...offer }));
        await addVehicle(vehicle);
    }

    console.log('Sample data loaded');
}
