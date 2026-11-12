import express from 'express';

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

// Vehicle detail page
router.get('/vehicle/:id', (req, res) => {
    res.render('vehicle');
});
