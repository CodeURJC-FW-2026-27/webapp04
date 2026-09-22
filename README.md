# IJAM Motors

## Descripción

**IJAM Motors** es una aplicación web de un concesionario de vehículos de segunda mano. Permitirá consultar los vehículos disponibles, visualizar sus características e imágenes y consultar las reseñas asociadas.

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

Representa cada vehículo disponible en el concesionario.

| Atributo | Tipo | Descripción |
|---|---|---|
| `brand` | String | Marca del vehículo. |
| `model` | String | Modelo del vehículo. |
| `price` | Number | Precio de venta. |
| `year` | Number | Año del vehículo. |
| `kilometers` | Number | Kilometraje. |
| `fuelType` | String | Tipo de combustible. |
| `image` | String | Imagen o imágenes del vehículo. |

### Entidad secundaria: Reseña

Representa la valoración de un usuario sobre un vehículo.

| Atributo | Tipo | Descripción |
|---|---|---|
| `author` | String | Autor de la reseña. |
| `text` | String | Contenido de la reseña. |
| `rating` | Number | Valoración del vehículo. |
| `date` | Date | Fecha de la reseña. |

Cada vehículo podrá tener varias reseñas y cada reseña pertenecerá a un único vehículo.

## Imágenes

Cada vehículo tendrá asociadas una o varias imágenes que podrán ser subidas desde el navegador. Estas imágenes mostrarán el exterior y el interior del vehículo.

## Buscador, filtrado y categorización

La aplicación permitirá buscar vehículos por **marca o modelo**.

También se podrán aplicar filtros según diferentes características:

- Marca.
- Precio.
- Año.
- Kilometraje.
- Combustible.

Los vehículos podrán categorizarse según su **tipo de carrocería**, por ejemplo:

- SUV.
- Berlina.
- Compacto.
- Coupé.
