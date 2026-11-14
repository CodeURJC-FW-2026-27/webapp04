import express from 'express';
import multer from 'multer';
const upload = multer({ dest: 'public/assets/img/'});


const router = express.Router();
export default router;

// Main page: vehicle catalog
router.get('/', (req, res) => {
    res.render('index');
});

// New vehicle form
// It must be declared before '/vehicle/:id' so that "new" is not taken as an id
router.get('/vehicle/new', (req, res) => {
    res.render('new-vehicle');
});

router.post('/vehicle/new', upload.array('image'), (req, res) => {
    const {brand, model, year, lowestPrice, fuelType, bodyType, description} = req.body; //Save the form data to a database

    let images = ['/assets/img/golf.jpg']; // Default image if no images are uploaded
    if ((req.files) && (req.files.length > 0)) {
        images = req.files.map(file => '/assets/img/' + file.filename);
    } //See if there are images uploaded and then save them to the database along with the other form data

    const errors = [];
    if (!brand || !model || !year || !lowestPrice || !fuelType || !bodyType || !description) {
        errors.push('Todos los campos son obligatorios.'); // All fields are required
    }

    if (brand && !/^[A-ZÁÉÍÓÚÑ]/.test(brand)) {
        errors.push('La marca debe comenzar con una letra mayúscula.'); //The brand must begin with capital letters
    } 

    if (description && (description.length < 10 || description.length > 300)) {
        errors.push('La descripción debe tener un mínimo de 10 caracteres y un máximo de 300.'); //The description must be between 10-300 chars
    }

    const numYear = Number(year);
    const numPrice = Number(lowestPrice);

    if (isNaN(numYear) || numYear < 1900 || numYear > 2026) {
        errors.push('El año debe ser un número válido entre 1900 y 2026.'); //The year has to be between 1900-2026 and has to be a number
    }

    if (isNaN(numPrice) || numPrice <= 0) {
        errors.push('El precio debe ser mayor que 0'); //The price has to be a number and greater than 0
    }


})

// Vehicle detail page
router.get('/vehicle/:id', (req, res) => {
    res.render('vehicle');
});
