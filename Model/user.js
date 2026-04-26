// Modelo de usuarios.
// Usa passport-local-mongoose para autenticacion y limita campos de texto sensibles.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Plugin que agrega username hash/salt y metodos authenticate/register.
const passportLocalMongoose = require('passport-local-mongoose').default;

// Configuracion comun para campos de texto.
const limitedString = {
    type: String,
    trim: true,
    maxlength: 100
};

// Datos adicionales del perfil. El username/password lo gestiona el plugin.
const userSchema = new Schema({
    name: limitedString,
    email: limitedString,
    role: { type: String, default: 'user', maxlength: 100 } // Rol para permisos (user/admin)
});

// Configuracion de login: username en minusculas y bloqueo por intentos fallidos.
userSchema.plugin(passportLocalMongoose, {
    usernameLowerCase: true,
    limitAttempts: true,
    usernameMaxLength: 100
}); 

module.exports = mongoose.model('User', userSchema);