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
        errors.push('La marca debe comenzar con una letra mayúscula.');
    } 

    








})

// Vehicle detail page
router.get('/vehicle/:id', (req, res) => {
    res.render('vehicle');
});
