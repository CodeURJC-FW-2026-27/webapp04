import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import router from './router.js';

// Get the path of the current directory (src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure Mustache to render .html files
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

// Go up one level ('..') to find the 'views' folder outside 'src'
app.set('views', path.join(__dirname, '..', 'views'));

// Serve static files from the 'public' folder at the root URL (e.g. /css/styles.css)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', router);

app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));