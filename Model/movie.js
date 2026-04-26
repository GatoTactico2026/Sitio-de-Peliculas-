// Modelo de peliculas.
// Define los campos persistidos en MongoDB y refuerza el limite de 100 caracteres.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Configuracion comun para campos de texto cortos.
const limitedString = {
    type: String,
    trim: true,
    maxlength: 100
};

// Esquema principal de Movie.
// author referencia al usuario propietario para aplicar permisos de edicion y borrado.
const movieSchema = new Schema({
    name: { ...limitedString, required: true },
    year: Number,
    director: limitedString,
    review: limitedString,
    actors: [{ ...limitedString }], // Arreglo de nombres
    image: limitedString,     // URL de la imagen
    author: { type: Schema.Types.ObjectId, ref: 'User' } // Agregar autor
});

module.exports = mongoose.model('Movie', movieSchema);