const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Asegúrate de que esta línea esté así:
const passportLocalMongoose = require('passport-local-mongoose').default;

const userSchema = new Schema({
    name: String,
    email: String,
    role: { type: String, default: 'user' } // Agregar campo de rol
});

// El primer parámetro debe ser la función que importamos arriba
userSchema.plugin(passportLocalMongoose); 

module.exports = mongoose.model('User', userSchema);