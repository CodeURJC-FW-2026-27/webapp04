import express from 'express';
import multer from 'multer';
import { findDuplicateVehicles, addVehicle, getVehicle, getVehicles, countVehicles, deleteVehicle, addOfferToVehicle, updateOfferInVehicle, deleteOfferFromVehicle, UPLOADS_FOLDER, PAGE_SIZE } from './board.js';

const upload = multer({ dest: 'public/assets/img/'});
const offerUpload = multer({ dest: UPLOADS_FOLDER });

const router = express.Router();
export default router;

// Texts shown to the user for the fuel and body type values stored in the database
const FUEL_LABELS = { gasoline: 'Gasolina', diesel: 'Diésel', hybrid: 'Híbrido', electric: 'Eléctrico' };
const BODY_LABELS = { suv: 'SUV', sedan: 'Berlina', compact: 'Compacto', coupe: 'Coupé' };
const SITE_LABELS = { cochesnet: 'Coches.net', wallapop: 'Wallapop', milanuncios: 'Milanuncios', autoscout24: 'AutoScout24' };

// Adds to a vehicle the formatted texts that the views display
function toVehicleView(vehicle) {
    const offersCount = vehicle.offers ? vehicle.offers.length : 0;
    return {
        ...vehicle,
        fuelLabel: FUEL_LABELS[vehicle.fuelType],
        bodyLabel: BODY_LABELS[vehicle.bodyType],
        priceText: vehicle.lowestPrice.toLocaleString('es-ES'),
        offersText: offersCount + (offersCount === 1 ? ' oferta' : ' ofertas')
    };
}

// Main page: vehicle catalog, paginated and searchable by brand or model
router.get('/', async (req, res) => {
    // Text typed in the search box (?search=golf). Anything that is not a single text is ignored
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const criteria = { search };

    const totalPages = Math.max(1, Math.ceil(await countVehicles(criteria) / PAGE_SIZE));

    // Page requested in the URL (?page=2). Missing or wrong values go to the nearest valid page
    let page = Number.parseInt(req.query.page, 10) || 1;
    page = Math.min(Math.max(page, 1), totalPages);

    const vehicles = await getVehicles(criteria, page);

    // Start of the pagination links, so that changing page keeps the search (e.g. "search=golf&")
    const params = new URLSearchParams();
    if (search) {
        params.set('search', search);
    }
    const filterQuery = params.size > 0 ? params.toString() + '&' : '';

    // One link per page, marking the current one so the view can highlight it
    const pages = [];
    for (let number = 1; number <= totalPages; number++) {
        pages.push({ number, current: number === page });
    }

    res.render('index', {
        vehicles: vehicles.map(toVehicleView),
        search,
        filterQuery,
        pages,
        hasPrevious: page > 1,
        previousPage: page - 1,
        hasNext: page < totalPages,
        nextPage: page + 1
    });
});

// New vehicle form
// It must be declared before '/vehicle/:id' so that "new" is not taken as an id
router.get('/vehicle/new', (req, res) => {
    res.render('new-vehicle');
});

router.post('/vehicle/new', upload.array('image'), async (req, res) => {
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

    if (brand && model) {  
        const duplicado = await findDuplicateVehicles(brand.trim(), model.trim());  //Check if the vehicles are not duplicate
        if (duplicado){
            errors.push('Ya existe este vehículo');  
        }
    }

    if (errors > 0){
        return res.render('new-vehicle', {errors, brand, model, year, lowestPrice, fuelType, bodyType, description}); //If there is an error, then repeat the form
    }

    const newVehicle = {
        brand: brand.trim(),
        model: model.trim(),
        year: numYear,
        lowestPrice: numPrice,
        fuelType,
        bodyType,
        description: description.trim(),
        image: imagePath
    };

    const result = await addVehicle(newVehicle);

    res.render('confirmation', {id: result.insertedId});
});

// Vehicle detail page
// Vehicle detail page
router.get('/vehicle/:id', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'El vehículo solicitado no existe o ha sido eliminado.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    const formattedOffers = (vehicle.offers || []).map(offer => ({
        ...offer,
        vehicleId: vehicle._id,
        siteLabel: SITE_LABELS[offer.site] || offer.site,
        priceText: Number(offer.price).toLocaleString('es-ES'),
        kmText: Number(offer.kilometers).toLocaleString('es-ES')
    }));

    res.render('vehicle', {
        ...toVehicleView(vehicle),
        offers: formattedOffers
    });
});

// Delete main vehicle
router.post('/vehicle/:id/delete', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'No se pudo encontrar el vehículo que intentas borrar.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    await deleteVehicle(req.params.id);

    res.render('confirmation', {
        title: '¡Vehículo eliminado!',
        message: `El vehículo ${vehicle.brand} ${vehicle.model} ha sido eliminado correctamente.`,
        redirectUrl: '/',
        buttonText: 'Volver a la página principal'
    });
});

// Server-side validation helper for secondary entity (offers)
function validateOfferData(body, existingOffers = [], currentOfferId = null) {
    const { site, price, kilometers, seller, url, date } = body;
    const errors = [];
    const allowedSites = ['cochesnet', 'wallapop', 'milanuncios', 'autoscout24'];

    if (!site || !price || !kilometers || !seller || !url || !date) {
        errors.push('Todos los campos obligatorios deben estar rellenos.');
    }

    if (site && !allowedSites.includes(site)) {
        errors.push('La página de origen seleccionada no es válida.');
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice > 1000000) {
        errors.push('El precio debe ser un número válido mayor que 0.');
    }

    const numKm = Number(kilometers);
    if (isNaN(numKm) || numKm < 0 || numKm > 2000000) {
        errors.push('El kilometraje debe ser un número válido igual o mayor que 0.');
    }

    if (seller && (seller.trim().length < 2 || seller.trim().length > 80)) {
        errors.push('El nombre del vendedor debe tener entre 2 y 80 caracteres.');
    }

    if (url) {
        try {
            new URL(url);
        } catch {
            errors.push('El enlace al anuncio original no tiene un formato de URL válido.');
        }
    }

    if (date && isNaN(Date.parse(date))) {
        errors.push('La fecha de publicación no es válida.');
    }

    // Check duplicate offer (same site, seller and price on the same vehicle)
    const isDuplicate = existingOffers.some(offer => {
        if (currentOfferId && offer._id.toString() === currentOfferId) return false;
        return (
            offer.site === site &&
            offer.seller.trim().toLowerCase() === (seller || '').trim().toLowerCase() &&
            Number(offer.price) === numPrice
        );
    });

    if (isDuplicate) {
        errors.push('Ya existe una oferta idéntica (mismo portal, vendedor y precio) para este vehículo.');
    }

    return errors;
}

// Create secondary entity (Offer)
router.post('/vehicle/:id/offers', offerUpload.single('image'), async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'El vehículo al que intentas añadir la oferta no existe.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    const errors = validateOfferData(req.body, vehicle.offers || []);
    if (errors.length > 0) {
        return res.status(400).render('error', {
            errorMessage: errors.join(' '),
            redirectUrl: `/vehicle/${req.params.id}`,
            buttonText: 'Volver al vehículo'
        });
    }

    const { site, price, kilometers, seller, url, date } = req.body;
    const offerData = {
        site,
        price: Number(price),
        kilometers: Number(kilometers),
        seller: seller.trim(),
        url: url.trim(),
        date,
        imageFilename: req.file ? req.file.filename : null
    };

    await addOfferToVehicle(req.params.id, offerData);

    res.render('confirmation', {
        title: '¡Oferta añadida!',
        message: 'La nueva oferta se ha vinculado correctamente al vehículo.',
        redirectUrl: `/vehicle/${req.params.id}`,
        buttonText: 'Volver al detalle del vehículo'
    });
});

// Delete secondary entity (Offer)
router.post('/vehicle/:id/offers/:offerId/delete', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'El vehículo solicitado no existe.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    await deleteOfferFromVehicle(req.params.id, req.params.offerId);

    res.render('confirmation', {
        title: '¡Oferta eliminada!',
        message: 'La oferta ha sido eliminada de este vehículo.',
        redirectUrl: `/vehicle/${req.params.id}`,
        buttonText: 'Volver al detalle del vehículo'
    });
});

// Show edit form for a specific offer
router.get('/vehicle/:id/offers/:offerId/edit', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'El vehículo solicitado no existe.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    const offer = (vehicle.offers || []).find(o => o._id.toString() === req.params.offerId);
    if (!offer) {
        return res.status(404).render('error', {
            errorMessage: 'La oferta que intentas editar no existe.',
            redirectUrl: `/vehicle/${req.params.id}`,
            buttonText: 'Volver al vehículo'
        });
    }

    res.render('edit-offer', {
        vehicleId: vehicle._id,
        vehicleName: `${vehicle.brand} ${vehicle.model}`,
        offer,
        isCochesnet: offer.site === 'cochesnet',
        isWallapop: offer.site === 'wallapop',
        isMilanuncios: offer.site === 'milanuncios',
        isAutoscout24: offer.site === 'autoscout24'
    });
});

// Process edit form for a specific offer
router.post('/vehicle/:id/offers/:offerId/edit', offerUpload.single('image'), async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).render('error', {
            errorMessage: 'El vehículo solicitado no existe.',
            redirectUrl: '/',
            buttonText: 'Volver al catálogo'
        });
    }

    const existingOffer = (vehicle.offers || []).find(o => o._id.toString() === req.params.offerId);
    if (!existingOffer) {
        return res.status(404).render('error', {
            errorMessage: 'La oferta que intentas modificar no existe.',
            redirectUrl: `/vehicle/${req.params.id}`,
            buttonText: 'Volver al vehículo'
        });
    }

    const errors = validateOfferData(req.body, vehicle.offers || [], req.params.offerId);
    if (errors.length > 0) {
        return res.status(400).render('error', {
            errorMessage: errors.join(' '),
            redirectUrl: `/vehicle/${req.params.id}/offers/${req.params.offerId}/edit`,
            buttonText: 'Volver al formulario de edición'
        });
    }

    const { site, price, kilometers, seller, url, date } = req.body;
    const updatedFields = {
        site,
        price: Number(price),
        kilometers: Number(kilometers),
        seller: seller.trim(),
        url: url.trim(),
        date,
        // Keep previous image if no new file is uploaded
        imageFilename: req.file ? req.file.filename : (existingOffer.imageFilename || null)
    };

    await updateOfferInVehicle(req.params.id, req.params.offerId, updatedFields);

    res.render('confirmation', {
        title: '¡Oferta actualizada!',
        message: 'Los cambios en la oferta se han guardado correctamente.',
        redirectUrl: `/vehicle/${req.params.id}`,
        buttonText: 'Volver al detalle del vehículo'
    });
});


// Vehicle image, sent from the uploads folder
router.get('/vehicle/:id/image', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);

    // The file name cannot contain folder separators, so only files inside uploads can be sent
    if (!vehicle || !vehicle.imageFilename || /[\\/]/.test(vehicle.imageFilename)) {
        return res.status(404).send('Image not found');
    }

    res.download(UPLOADS_FOLDER + '/' + vehicle.imageFilename);
});
