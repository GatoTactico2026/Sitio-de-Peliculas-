const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Asegúrate de que esta línea esté así:
const passportLocalMongoose = require('passport-local-mongoose').default;

const limitedString = {
    type: String,
    trim: true,
    maxlength: 100
};

const userSchema = new Schema({
    name: limitedString,
    email: limitedString,
    role: { type: String, default: 'user', maxlength: 100 } // Agregar campo de rol
});

// El primer parámetro debe ser la función que importamos arriba
userSchema.plugin(passportLocalMongoose, {
    usernameLowerCase: true,
    limitAttempts: true,
    usernameMaxLength: 100
}); 

module.exports = mongoose.model('User', userSchema);