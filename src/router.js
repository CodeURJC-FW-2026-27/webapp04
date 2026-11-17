import express from 'express';
import multer from 'multer';
import { findDuplicateVehicles, addVehicle, updateVehicle, getVehicle, getVehicles, countVehicles, deleteVehicle, addOfferToVehicle, updateOfferInVehicle, deleteOfferFromVehicle, UPLOADS_FOLDER, PAGE_SIZE } from './vehicles.js';

// Saves the images sent in the vehicle and offer forms into the uploads folder
const upload = multer({ dest: UPLOADS_FOLDER });

const router = express.Router();
export default router;

// Texts shown to the user for the fuel and body type values stored in the database
const FUEL_LABELS = { gasoline: 'Gasolina', diesel: 'Diésel', hybrid: 'Híbrido', electric: 'Eléctrico' };
const BODY_LABELS = { suv: 'SUV', sedan: 'Berlina', compact: 'Compacto', coupe: 'Coupé' };
const SITE_LABELS = { cochesnet: 'Coches.net', wallapop: 'Wallapop', milanuncios: 'Milanuncios', autoscout24: 'AutoScout24' };

// Mileage limits offered in the main page filter
const KILOMETER_LIMITS = [25000, 50000, 100000, 150000, 200000];

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

// Builds a main page URL that keeps the given search, category and filters (e.g. "/?search=golf&bodyType=compact")
function catalogUrl(criteria) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(criteria)) {
        // Lists (like several fuel types) are added once per value, and empty values are left out
        for (const item of [].concat(value)) {
            if (item !== '' && item !== null && item !== undefined) {
                params.append(name, item);
            }
        }
    }
    return params.size > 0 ? '/?' + params.toString() : '/';
}

// Reads a whole number from the URL (e.g. "?yearFrom=2018"). Missing, negative or wrong values are ignored (null)
function readNumber(value) {
    const number = Number(value);
    return typeof value === 'string' && value.trim() !== '' && Number.isInteger(number) && number >= 0 ? number : null;
}

// Reads a group of checkboxes from the URL (none, one or several values) and keeps only the allowed values
function readList(value, allowedValues) {
    const values = [].concat(value ?? []).filter(item => allowedValues.includes(item));
    return [...new Set(values)]; // Without repeated values
}

// Main page: vehicle catalog, paginated, searchable by brand or model and filtered by category
router.get('/', async (req, res) => {
    // Text typed in the search box (?search=golf). Anything that is not a single text is ignored
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    // Category chosen with the buttons (?bodyType=suv). Unknown body types are ignored
    const bodyType = typeof req.query.bodyType === 'string' && Object.hasOwn(BODY_LABELS, req.query.bodyType) ? req.query.bodyType : '';
    // Sidebar filters
    const yearFrom = readNumber(req.query.yearFrom);
    const yearTo = readNumber(req.query.yearTo);
    const fuelType = readList(req.query.fuelType, Object.keys(FUEL_LABELS));
    const priceMin = readNumber(req.query.priceMin);
    const priceMax = readNumber(req.query.priceMax);
    const kilometers = readNumber(req.query.maxKilometers);
    const maxKilometers = KILOMETER_LIMITS.includes(kilometers) ? kilometers : null; // Only the limits of the list
    const site = readList(req.query.site, Object.keys(SITE_LABELS));
    const criteria = { search, bodyType, yearFrom, yearTo, fuelType, priceMin, priceMax, maxKilometers, site };

    const totalPages = Math.max(1, Math.ceil(await countVehicles(criteria) / PAGE_SIZE));

    // Page requested in the URL (?page=2). Missing or wrong values go to the nearest valid page
    let page = Number.parseInt(req.query.page, 10) || 1;
    page = Math.min(Math.max(page, 1), totalPages);

    const vehicles = await getVehicles(criteria, page);

    // Start of the pagination links, so that changing page keeps the search, category and filters (e.g. "search=golf&")
    const currentUrl = catalogUrl(criteria);
    const filterQuery = currentUrl === '/' ? '' : currentUrl.slice(2) + '&';

    // Category buttons: "Todos" plus one per body type. They keep the search and filters and mark the active category
    const categories = [{ label: 'Todos', url: catalogUrl({ ...criteria, bodyType: '' }), active: bodyType === '' }];
    for (const [value, label] of Object.entries(BODY_LABELS)) {
        categories.push({ label, url: catalogUrl({ ...criteria, bodyType: value }), active: value === bodyType });
    }

    // "Limpiar filtros" removes the sidebar filters but keeps the search and the category
    const clearFiltersUrl = catalogUrl({ search, bodyType });

    // Fuel type checkboxes, marking the ones that are checked
    const fuelOptions = Object.entries(FUEL_LABELS).map(([value, label]) => ({ value, label, checked: fuelType.includes(value) }));

    // Mileage options, marking the chosen one
    const kilometerOptions = KILOMETER_LIMITS.map(limit => ({
        value: limit,
        label: 'Hasta ' + limit.toLocaleString('es-ES') + ' km',
        selected: limit === maxKilometers
    }));

    // Source website checkboxes, marking the ones that are checked
    const siteOptions = Object.entries(SITE_LABELS).map(([value, label]) => ({ value, label, checked: site.includes(value) }));

    // One link per page, marking the current one so the view can highlight it
    const pages = [];
    for (let number = 1; number <= totalPages; number++) {
        pages.push({ number, current: number === page });
    }

    res.render('index', {
        vehicles: vehicles.map(toVehicleView),
        search,
        bodyType,
        yearFrom,
        yearTo,
        fuelOptions,
        priceMin,
        priceMax,
        kilometerOptions,
        siteOptions,
        isFiltered: currentUrl !== '/',
        categories,
        clearFiltersUrl,
        filterQuery,
        pages,
        hasPrevious: page > 1,
        previousPage: page - 1,
        hasNext: page < totalPages,
        nextPage: page + 1
    });
});

// Options of a select in the vehicle form, marking the value the vehicle already has (when editing)
function formOptions(labels, selectedValue = '') {
    return Object.entries(labels).map(([value, label]) => ({ value, label, selected: value === selectedValue }));
}

// New vehicle form (the same view is used to edit a vehicle)
// It must be declared before '/vehicle/:id' so that "new" is not taken as an id
router.get('/vehicle/new', (req, res) => {
    res.render('new-vehicle', {
        formAction: '/vehicle/new',
        cancelUrl: '/',
        fuelOptions: formOptions(FUEL_LABELS),
        bodyOptions: formOptions(BODY_LABELS)
    });
});

// Checks the data sent in the vehicle form and returns the list of errors (empty if everything is right).
// It is shared by the routes that create and edit a vehicle: when editing, editedVehicleId stops the
// vehicle from being reported as a duplicate of itself
async function validateVehicleData(body, editedVehicleId = null) {
    const {brand, model, year, lowestPrice, fuelType, bodyType, description} = body;

    const errors = [];
    if (!brand || !model || !year || !lowestPrice || !fuelType || !bodyType || !description) {
        errors.push('Todos los campos son obligatorios.'); // All fields are required
    }

    if (brand && !/^[A-ZÁÉÍÓÚÑ]/.test(brand.trim())) {
        errors.push('La marca debe comenzar con una letra mayúscula.'); //The brand must begin with capital letters
    } 

    if (model && !/^[A-ZÁÉÍÓÚÑ]/.test(model.trim())) {
        errors.push('El modelo debe comenzar con una letra mayúscula.'); //The model must begin with capital letters
    }

    if (fuelType && !Object.hasOwn(FUEL_LABELS, fuelType)) {
        errors.push('El combustible seleccionado no es válido.'); // The fuel type must be one of the list (the form can be edited in the browser)
    }

    if (bodyType && !Object.hasOwn(BODY_LABELS, bodyType)) {
        errors.push('La carrocería seleccionada no es válida.'); // The body type must be one of the list (the form can be edited in the browser)
    }

    if (description && (description.trim().length < 10 || description.trim().length > 300)) {
        errors.push('La descripción debe tener un mínimo de 10 caracteres y un máximo de 300.'); //The description must be between 10-300 chars
    }

    const numYear = Number(year);
    const numPrice = Number(lowestPrice);

    if (!Number.isInteger(numYear) || numYear < 1900 || numYear > 2026) {
        errors.push('El año debe ser un número válido entre 1900 y 2026.'); //The year has to be a whole number between 1900-2026
    }

    if (isNaN(numPrice) || numPrice <= 0) {
        errors.push('El precio debe ser mayor que 0.'); //The price has to be a number and greater than 0
    }

    if (brand && model) {  
        const duplicateVehicle = await findDuplicateVehicles(brand.trim(), model.trim());  //Check if the vehicles are not duplicate
        if (duplicateVehicle && duplicateVehicle._id.toString() !== editedVehicleId){
            errors.push('Ya existe este vehículo.');
        }
    }

    return errors;
}

// Shows the shared error page with a message and a button to the page where the user can continue
function renderError(res, status, errorMessage, redirectUrl, buttonText) {
    return res.status(status).render('error', { errorMessage, redirectUrl, buttonText });
}

// Processes the vehicle form, both to create a vehicle (/vehicle/new) and to edit one (/vehicle/:id/edit),
// so the same code validates and saves the data in both cases
async function saveVehicleForm(req, res) {
    const vehicleId = req.params.id; // Only exists when editing
    const formUrl = vehicleId ? `/vehicle/${vehicleId}/edit` : '/vehicle/new';

    const editedVehicle = vehicleId ? await getVehicle(vehicleId) : null;
    if (vehicleId && !editedVehicle) {
        return renderError(res, 404, 'El vehículo que intentas editar no existe.', '/', 'Volver al catálogo');
    }

    const errors = await validateVehicleData(req.body, vehicleId);

    if (errors.length > 0){
        // Same error page as the offer forms, with a button to go back to the form
        return renderError(res, 400, errors.join(' '), formUrl, 'Volver al formulario');
    }

    const {brand, model, year, lowestPrice, fuelType, bodyType, description} = req.body; //Save the form data to a database

    let imageFilename;
    if (req.file) {
        imageFilename = req.file.filename;
    } else if (editedVehicle) {
        imageFilename = editedVehicle.imageFilename || null; // When editing without a new image, the previous one is kept
    } else {
        imageFilename = null;
    }

    const vehicleData = {
        brand: brand.trim(),
        model: model.trim(),
        year: Number(year),
        lowestPrice: Number(lowestPrice),
        fuelType,
        bodyType,
        description: description.trim(),
        imageFilename: imageFilename
    };

    if (editedVehicle) {
        await updateVehicle(vehicleId, vehicleData);
        return res.render('confirmation', {
            title: '¡Vehículo actualizado!',
            message: `Los cambios en el vehículo ${vehicleData.brand} ${vehicleData.model} se han guardado correctamente.`,
            redirectUrl: `/vehicle/${vehicleId}`,
            buttonText: 'Volver al detalle del vehículo'
        });
    }

    const result = await addVehicle(vehicleData);

    res.render('confirmation', {id: result.insertedId.toString()});
}

router.post('/vehicle/new', upload.single('image'), saveVehicleForm);

// Edit vehicle form: the same view as the new vehicle form, filled with the current data
router.get('/vehicle/:id/edit', async (req, res) => {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) {
        return renderError(res, 404, 'El vehículo que intentas editar no existe.', '/', 'Volver al catálogo');
    }

    res.render('new-vehicle', {
        ...vehicle,
        editing: true,
        vehicleId: vehicle._id.toString(),
        formAction: `/vehicle/${vehicle._id}/edit`,
        cancelUrl: `/vehicle/${vehicle._id}`,
        fuelOptions: formOptions(FUEL_LABELS, vehicle.fuelType),
        bodyOptions: formOptions(BODY_LABELS, vehicle.bodyType)
    });
});

// Edit vehicle: processed by the same code as creating a vehicle
router.post('/vehicle/:id/edit', upload.single('image'), saveVehicleForm);

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
        // Always set, so that Mustache does not use the vehicle image when the offer has no image
        imageFilename: offer.imageFilename || null,
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
router.post('/vehicle/:id/offers', upload.single('image'), async (req, res) => {
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
router.post('/vehicle/:id/offers/:offerId/edit', upload.single('image'), async (req, res) => {
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
