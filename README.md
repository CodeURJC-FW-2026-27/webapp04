# IJAM Motors

## Descripción

**IJAM Motors** es una aplicación web que recopila en un mismo sitio vehículos de segunda mano publicados en otras páginas de compraventa. Permite consultar los vehículos, ver sus características e imágenes y comparar las ofertas de un mismo vehículo en distintas webs. La aplicación no mantiene ninguna comisión ni acuerdo con las páginas de origen. Los datos mostrados no se extraen de dichas webs, sino que son datos de ejemplo ficticios.

## Integrantes

| Nombre | Correo URJC | GitHub |
|---|---|---|
| Julián García Panadero | j.garciap.2024@alumnos.urjc.es | julianjgp23 |
| Alejandro Sánchez Aparisi | a.sancheza.2024@alumnos.urjc.es | aleskyy7 |
| Iñigo Álvaro Sabaté | i.alvaro.2024@alumnos.urjc.es | IniAlv22 |
| Izan Calle Feijoo | i.calle.2024@alumnos.urjc.es | IzanCalle |


# Funcionalidad

## Entidades

### Entidad principal: Vehículo

Representa un modelo de vehículo recopilado en la aplicación, del que pueden existir varias unidades anunciadas en páginas externas.

| Atributo | Tipo | Descripción |
|---|---|---|
| `brand` | String | Marca del vehículo. |
| `model` | String | Modelo del vehículo. |
| `year` | Number | Año del modelo. |
| `fuelType` | String | Tipo de combustible. |
| `bodyType` | String | Tipo de carrocería (SUV, berlina, compacto, coupé...). |
| `lowestPrice` | Number | Precio más bajo entre todas sus ofertas. |
| `image` | String | Imagen o imágenes del vehículo. |

### Entidad secundaria: Oferta

Representa un anuncio de una unidad concreta del vehículo en una página externa.

| Atributo | Tipo | Descripción |
|---|---|---|
| `site` | String | Página donde está publicado el anuncio. |
| `price` | Number | Precio del anuncio. |
| `kilometers` | Number | Kilometraje de esa unidad. |
| `seller` | String | Vendedor (particular o profesional). |
| `url` | String | Enlace al anuncio original. |
| `date` | Date | Fecha de publicación del anuncio. |
| `image` | String | Imagen o imágenes de la unidad anunciada (opcional). |

Cada vehículo podrá tener varias ofertas y cada oferta pertenecerá a un único vehículo.

## Imágenes

- **Vehículo:** cada vehículo tendrá asociadas una o varias imágenes de referencia del modelo, que podrán ser subidas desde el navegador.
- **Oferta:** cada oferta podrá tener opcionalmente una o varias imágenes de la unidad concreta anunciada (exterior e interior), también subidas desde el navegador.

## Buscador, filtrado y categorización

La aplicación permitirá buscar vehículos por **marca o modelo**.

También se podrán aplicar filtros según diferentes características del vehículo:

- Marca.
- Año.
- Combustible.

Y filtros según las características de sus ofertas (se mostrarán los vehículos que tengan al menos una oferta que cumpla el filtro):

- Precio.
- Kilometraje.
- Página de origen (sitio donde está anunciado el vehículo).

Los vehículos podrán categorizarse según su **tipo de carrocería**, por ejemplo:

- SUV.
- Berlina.
- Compacto.
- Coupé.
