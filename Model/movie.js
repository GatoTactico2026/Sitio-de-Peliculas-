const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const movieSchema = new Schema({
    name: { type: String, required: true },
    year: Number,
    director: String,
    review: String,
    actors: [String], // Arreglo de nombres
    image: String,     // URL de la imagen
    author: { type: Schema.Types.ObjectId, ref: 'User' } // Agregar autor
});

module.exports = mongoose.model('Movie', movieSchema);