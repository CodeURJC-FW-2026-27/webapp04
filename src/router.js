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
    const {brand, model, year, lowestPrice, fuelType, bodyType} = req.body; //Save the form data to a database

    let images = ['/assets/img/golf.jpg']; // Default image if no images are uploaded
    if ((req.files) && (req.files.length > 0)) {
        images = req.files.map(file => '/assets/img/' + file.filename);
    }
})

// Vehicle detail page
router.get('/vehicle/:id', (req, res) => {
    res.render('vehicle');
});
