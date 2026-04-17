// 1. IMPORTACIONES (todo en una línea)
const express = require("express"), mongoose = require("mongoose"), passport = require("passport"),
    LocalStrategy = require('passport-local').Strategy, session = require("express-session"),
    path = require("path");
const User = require("./Model/user"), Movie = require("./Model/movie");
const app = express();

// 2. CONEXIÓN A MONGODB
mongoose.connect("mongodb://127.0.0.1:27017/moviesDB")
    .then(() => console.log("Conectado a MongoDB"))
    .catch(err => console.log("Error de conexión:", err));

// 3. MIDDLEWARES (todos combinados en un solo app.use)
app.use(
    express.urlencoded({ extended: true }),  // Para leer datos de formularios
    express.json(),                          // Para leer JSON
    express.static(path.join(__dirname, "pelicula")),  // Archivos HTML/CSS/JS
    express.static(path.join(__dirname, "Imagenes"))   // Imágenes
);

// 4. SESIONES Y PASSPORT (autenticación)
app.use(
    session({ secret: "Rusty is a dog", resave: false, saveUninitialized: false }),
    passport.initialize(),    // Iniciar Passport
    passport.session()        // Usar sesiones
);

// Configuración de la estrategia local de autenticación
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());   // Cómo guardar usuario en sesión
passport.deserializeUser(User.deserializeUser()); // Cómo recuperar usuario

// Variable global para usar el usuario en las vistas
app.use((req, res, next) => { res.locals.currentUser = req.user; next(); });

// 5. APIs (devuelven JSON)
// Obtener todas las películas
app.get("/api/movies", async (req, res) => {
    try {
        res.json(await Movie.find({}));
    } catch {
        res.status(500).json({ error: "Error al cargar películas" });
    }
});

// Obtener una película por ID
app.get("/api/movies/:id", async (req, res) => {
    try {
        res.json(await Movie.findById(req.params.id));
    } catch {
        res.status(500).json({ error: "Error" });
    }
});

// Obtener el usuario actual
app.get("/api/user", (req, res) => {
    res.json({ user: req.user });
});

// 6. MIDDLEWARES DE AUTORIZACIÓN (funciones auxiliares)
// Verifica si el usuario está logueado
const isLoggedIn = (req, res, next) =>
    req.isAuthenticated() ? next() : res.redirect("/login");

// Verifica si el usuario es el autor de la película o admin
const isAuthor = async (req, res, next) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).send("Película no encontrada");
        if (!movie.author || movie.author.equals(req.user._id) || req.user?.role === 'admin')
            return next();
        res.status(403).send("No tienes permisos para modificar esta película");
    } catch {
        res.status(500).send("Error");
    }
};

// Valida que la reseña no tenga más de 100 palabras
const validateReview = (review) =>
    !review || review.trim().split(/\s+/).length <= 100;

// 7. RUTAS DE PELÍCULAS (páginas HTML)
// Ver todas las películas
app.get("/movies", isLoggedIn, (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "movies.html")));

// Formulario para crear nueva película
app.get("/movies/new", isLoggedIn, (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "new.html")));

// Crear una nueva película
app.post("/movies", isLoggedIn, async (req, res) => {
    try {
        if (!validateReview(req.body.review))
            return res.status(400).send("La reseña no puede tener más de 100 palabras.");

        await Movie.create({
            name: req.body.name,
            year: req.body.year,
            director: req.body.director,
            review: req.body.review,
            actors: req.body.actors ? req.body.actors.split(",").map(a => a.trim()) : [],
            image: req.body.image,
            author: req.user._id  // Asigna el autor automáticamente
        });
        res.redirect("/movies");
    } catch {
        res.status(400).send("Error al guardar la película");
    }
});

// Formulario para editar película
app.get("/movies/:id/edit", isLoggedIn, isAuthor, (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "edit.html")));

// Actualizar una película existente
app.post("/movies/:id", isLoggedIn, isAuthor, async (req, res) => {
    try {
        if (!validateReview(req.body.review))
            return res.status(400).send("La reseña no puede tener más de 100 palabras.");

        await Movie.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            year: req.body.year,
            director: req.body.director,
            review: req.body.review,
            actors: req.body.actors ? req.body.actors.split(",").map(a => a.trim()) : [],
            image: req.body.image
        });
        res.redirect("/movies");
    } catch {
        res.status(400).send("Error al actualizar la película");
    }
});

// Eliminar una película
app.post("/movies/:id/delete", isLoggedIn, isAuthor, async (req, res) => {
    try {
        await Movie.findByIdAndDelete(req.params.id);
        res.redirect("/movies");
    } catch {
        res.status(500).send("Error al eliminar la película");
    }
});

// 8. RUTAS DE AUTENTICACIÓN (registro, login, logout)
// Página de inicio
app.get("/", (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "index.html")));

// Formulario de registro
app.get("/register", (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "register.html")));

// Procesar registro de nuevo usuario
app.post("/register", async (req, res) => {
    try {
        const newUser = new User({
            username: req.body.username,
            name: req.body.name,
            email: req.body.email
        });
        await User.register(newUser, req.body.password);  // Passport guarda usuario con hash
        passport.authenticate("local")(req, res, () => res.redirect("/movies")); // Login automático
    } catch {
        res.redirect("/register");
    }
});

// Formulario de login
app.get("/login", (req, res) =>
    res.sendFile(path.join(__dirname, "pelicula", "login.html")));

// Procesar login
app.post("/login", passport.authenticate("local", {
    successRedirect: "/movies",   // Si éxito, va a películas
    failureRedirect: "/login"     // Si falla, vuelve a login
}));

// Cerrar sesión
app.get("/logout", (req, res, next) => {
    req.logout(err => err ? next(err) : res.redirect("/"));
});

// 9. INICIAR SERVIDOR
app.listen(3000, () => console.log("Servidor corriendo en el puerto 3000"));