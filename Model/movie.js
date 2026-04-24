const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const limitedString = {
    type: String,
    trim: true,
    maxlength: 100
};

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