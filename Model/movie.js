// Modelo de peliculas.
// Define los campos persistidos en MongoDB y limita la reseña a 200 palabras.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Configuracion comun para campos de texto cortos.
const limitedString = {
    type: String,
    trim: true,
    maxlength: 100
};

const reviewString = {
    type: String,
    trim: true,
    maxlength: 2000,
    validate: {
        validator(value) {
            if (!value) return true;
            return value.trim().split(/\s+/).filter(Boolean).length <= 200;
        },
        message: 'La reseña no puede tener más de 200 palabras.'
    }
};

// Esquema principal de Movie.
// author referencia al usuario propietario para aplicar permisos de edicion y borrado.
const movieSchema = new Schema({
    name: { ...limitedString, required: true },
    year: Number,
    director: limitedString,
    review: reviewString,
    actors: [{ ...limitedString }], // Arreglo de nombres
    image: limitedString,     // URL de la imagen
    author: { type: Schema.Types.ObjectId, ref: 'User' } // Agregar autor
});

module.exports = mongoose.model('Movie', movieSchema);