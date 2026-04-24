// Servidor principal de la aplicacion.
// Configura Express, MongoDB, Passport, validacion de entradas y todas las rutas.
// Puntos criticos: normalizeText bloquea contenido sospechoso y limita textos a 100 caracteres.
const express = require("express"), mongoose = require("mongoose"),
    passport = require("passport"), LocalStrategy = require("passport-local").Strategy,
    session = require("express-session"), path = require("path");
const User = require("./Model/user"), Movie = require("./Model/movie");
const app = express();

const MAX_TEXT_LENGTH = 100;
const scriptPattern = /<\s*\/?\s*script\b|javascript:|on\w+\s*=|<[^>]+>/i;
const sqlPattern = /\$where|\bunion\b\s+\bselect\b|\bdrop\b\s+\btable\b|\binsert\b\s+\binto\b|\bdelete\b\s+\bfrom\b|\bupdate\b\s+\w+\s+\bset\b|--|\/\*|\*\//i;

mongoose.connect("mongodb://127.0.0.1:27017/moviesDB").catch(console.error);

app.use(
    express.urlencoded({ extended: true }), express.json(),
    express.static(path.join(__dirname, "pelicula"), { index: false }),
    express.static(path.join(__dirname, "Imagenes")),
    session({ secret: "Rusty is a dog", resave: false, saveUninitialized: false }),
    passport.initialize(), passport.session()
);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => { res.locals.currentUser = req.user; next(); });

// ── Utilidades ────────────────────────────────────────────────────────────────
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const escRx = v => String(v).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const wrap = fn => (req,res,next) => fn(req,res,next).catch(err => res.status(err.status || 500).send(err.message || "Error interno"));
const filter = q => q ? {$or:["name","director","review","actors"].map(f=>({[f]:{$regex:escRx(q),$options:"i"}}))} : {};
const html = (t,b) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${t}</title></head><body>${b}</body></html>`;

const failValidation = message => {
    const error = new Error(message);
    error.status = 400;
    throw error;
};

const normalizeText = (value, label) => {
    if (typeof value !== "string") return "";
    const normalized = value.trim();
    if (normalized.length > MAX_TEXT_LENGTH) {
        failValidation(`${label} no puede tener más de ${MAX_TEXT_LENGTH} caracteres.`);
    }
    if (scriptPattern.test(normalized)) {
        failValidation(`${label} contiene contenido no permitido.`);
    }
    if (sqlPattern.test(normalized)) {
        failValidation(`${label} contiene patrones no permitidos.`);
    }
    return normalized;
};

const parseActors = actors => normalizeText(actors, "Actores")
    .split(",")
    .map(actor => actor.trim())
    .filter(Boolean)
    .map(actor => normalizeText(actor, "Actor"));

const card = (m, u, w=250) => {
    const can = u && (u.role==="admin" || String(m.author)===String(u._id));
    return `<div>
        ${m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)}">`:""}
        <h3>${esc(m.name)}</h3><p><b>Año:</b> ${esc(m.year)}</p><p><b>Director:</b> ${esc(m.director)}</p>
        ${m.review?`<p><b>Reseña:</b> ${esc(m.review)}</p>`:""}
        <p><a href="/movie/${m._id}">Ver detalle</a></p>
        ${can?`<p><a href="/movies/${m._id}/edit">Editar</a></p>
        <form action="/movies/${m._id}/delete" method="POST">
        <button type="submit" onclick="return confirm('¿Eliminar esta película?')">Eliminar</button></form>`:""}
    </div>`;
};

const grid = ms => ms.length ? `<div>${ms}</div>` : "<p>No se encontraron películas.</p>";
const nav = (...links) => `<a href="/">Inicio</a> | <a href="/logout">Cerrar sesión</a> ${links.map(([t,h])=>`| <a href="${h}">${t}</a>`).join("")}`;
const searchForm = (action,q) => `<form method="GET" action="${action}">
    <input type="text" name="q" value="${esc(q)}" placeholder="Buscar...">
    <button>Buscar</button>${q?`<a href="${action}">Limpiar</a>`:""}
    </form>`;
const movieBody = body => ({
    name: normalizeText(body.name, "Nombre"),
    year: body.year,
    director: normalizeText(body.director, "Director"),
    review: normalizeText(body.review, "Reseña"),
    image: normalizeText(body.image, "Imagen"),
    actors: body.actors ? parseActors(body.actors) : []
});

const userBody = body => ({
    username: normalizeText(body.username, "Usuario").toLowerCase(),
    name: normalizeText(body.name, "Nombre"),
    email: normalizeText(body.email, "Correo electrónico").toLowerCase(),
    password: normalizeText(body.password, "Contraseña")
});

// ── Middlewares ───────────────────────────────────────────────────────────────
const isLoggedIn = (req,res,next) => req.isAuthenticated() ? next() : res.redirect("/login");
const isAuthor = wrap(async(req,res,next) => {
    const m = await Movie.findById(req.params.id);
    if (!m) return res.status(404).send("Película no encontrada");
    if (req.user?.role==="admin" || m.author?.equals(req.user._id)) return next();
    res.status(403).send("Sin permisos");
});

// ── APIs ──────────────────────────────────────────────────────────────────────
app.get("/api/movies",     wrap(async(req,res)=>res.json(await Movie.find({}))));
app.get("/api/movies/:id", wrap(async(req,res)=>res.json(await Movie.findById(req.params.id))));
app.get("/api/user", (req,res)=>res.json({user:req.user}));

// ── Películas ─────────────────────────────────────────────────────────────────
app.get("/movies", isLoggedIn, wrap(async(req,res) => {
    const q = String(req.query.q??"").trim();
    const movies = await Movie.find(filter(q)).sort({_id:-1});
    res.send(html("Películas", `<h1>Películas</h1>
        ${nav(["Mis películas","/mis-peliculas"],["Agregar","/movies/new"])}
        ${searchForm("/movies",q)}${grid(movies.map(m=>card(m,req.user)).join(""))}`));
}));

app.get("/mis-peliculas", isLoggedIn, wrap(async(req,res) => {
    const q = String(req.query.q??"").trim(), sf = filter(q);
    const f = req.user?.role==="admin" ? sf : q ? {$and:[{author:req.user._id},sf]} : {author:req.user._id};
    const movies = await Movie.find(f).sort({_id:-1});
    const title = req.user?.role==="admin" ? "Gestión (Admin)" : "Mis películas";
    res.send(html(title, `<h1>${title}</h1>
        ${nav(["Ver todas","/movies"],["Agregar","/movies/new"])}
        ${searchForm("/mis-peliculas",q)}${grid(movies.map(m=>card(m,req.user,260)).join(""))}`));
}));

// Servir formularios estáticos
const send = f => (req,res) => res.sendFile(path.join(__dirname,"pelicula",f));
app.get("/movies/new",      isLoggedIn,           send("new.html"));
app.get("/movies/:id/edit", isLoggedIn, isAuthor, send("edit.html"));
app.get("/register", send("register.html"));
app.get("/login",    send("login.html"));

app.post("/movies", isLoggedIn, wrap(async(req,res) => {
    await Movie.create({...movieBody(req.body), author:req.user._id});
    res.redirect("/movies");
}));

app.post("/movies/:id", isLoggedIn, isAuthor, wrap(async(req,res) => {
    await Movie.findByIdAndUpdate(req.params.id, movieBody(req.body));
    res.redirect("/movies");
}));

app.post("/movies/:id/delete", isLoggedIn, isAuthor, wrap(async(req,res) => {
    await Movie.findByIdAndDelete(req.params.id);
    res.redirect("/movies");
}));

// ── Rutas generales ───────────────────────────────────────────────────────────
app.get("/", wrap(async(req,res) => {
    const q = String(req.query.q??"").trim();
    const movies = await Movie.find(filter(q)).sort({_id:-1});
    const authLinks = req.user
        ? `<li><a href="/mis-peliculas">Mis películas</a></li><li><a href="/movies/new">Agregar</a></li><li><a href="/logout">Cerrar sesión</a></li>`
        : `<li><a href="/register">Registro</a></li><li><a href="/login">Iniciar sesión</a></li>`;
    res.send(html("Inicio",`<h1>Bienvenido al Index</h1><nav><ul>${authLinks}</ul></nav>
        ${searchForm("/",q)}<h2>Todas las películas</h2>${grid(movies.map(m=>card(m,req.user)).join(""))}`));
}));

app.get("/movie/:id", wrap(async(req,res) => {
    const m = await Movie.findById(req.params.id);
    if (!m) return res.status(404).send("Película no encontrada");
    const actors = Array.isArray(m.actors)&&m.actors.length ? m.actors.map(esc).join(", ") : "No registrados";
    res.send(html("Detalle",`<h1>Detalle</h1><a href="/">Volver</a>
        <div>${m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)}">`:""}
        <h2>${esc(m.name)}</h2><p><b>Año:</b> ${esc(m.year)}</p><p><b>Director:</b> ${esc(m.director)}</p>
        <p><b>Reseña:</b> ${esc(m.review||"Sin reseña")}</p><p><b>Actores:</b> ${actors}</p></div>`));
}));

app.post("/register", wrap(async(req,res) => {
    const { username, name, email, password } = userBody(req.body);
    await User.register(new User({username,name,email}), password);
    passport.authenticate("local")(req,res,()=>res.redirect("/movies"));
}));

app.post("/login", wrap(async(req,res,next) => {
    const username = normalizeText(req.body.username, "Usuario");
    const user = await User.findOne({ username: new RegExp(`^${escRx(username)}$`, "i") }).select("username");
    req.body.username = user ? user.username : username.toLowerCase();
    next();
}), passport.authenticate("local",{successRedirect:"/",failureRedirect:"/login"}));
app.get("/logout", (req,res,next) => req.logout(err=>err?next(err):res.redirect("/")));

app.listen(8080,"0.0.0.0",()=>console.log("Servidor en http://0.0.0.0:8080"));