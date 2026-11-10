import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import router from './router.js';

// Obtener la ruta del directorio actual (src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configurar Mustache para procesar archivos .html
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

// Sube un nivel ('..') para encontrar la carpeta 'views' fuera de 'src'
app.set('views', path.join(__dirname, '..', 'views'));

// Servir archivos estáticos también desde la raíz
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', router);

app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));