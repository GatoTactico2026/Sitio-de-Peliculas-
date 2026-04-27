// Servidor principal de la aplicacion.
// Configura Express, MongoDB, Passport, validacion de entradas y todas las rutas.
// Puntos criticos: normalizeText bloquea contenido sospechoso; la reseña permite hasta 200 palabras.
const express = require("express"), mongoose = require("mongoose"),
    passport = require("passport"), LocalStrategy = require("passport-local").Strategy,
    session = require("express-session"), path = require("path");
const User = require("./Model/user"), Movie = require("./Model/movie");
const app = express();

// Limites y patrones globales para sanitizacion de texto.
const MAX_TEXT_LENGTH = 100;
const MAX_REVIEW_WORDS = 200;
const scriptPattern = /<\s*\/?\s*script\b|javascript:|on\w+\s*=|<[^>]+>/i;
const sqlPattern = /\$where|\bunion\b\s+\bselect\b|\bdrop\b\s+\btable\b|\binsert\b\s+\binto\b|\bdelete\b\s+\bfrom\b|\bupdate\b\s+\w+\s+\bset\b|--|\/\*|\*\//i;

// Conexion local de MongoDB para la base de datos de peliculas.
mongoose.connect("mongodb://127.0.0.1:27017/moviesDB").catch(console.error);

// Middlewares base de parseo, archivos estaticos y sesion.
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
// Escapa texto para evitar XSS en el HTML generado en el servidor.
const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
// Escapa un texto para usarlo seguro dentro de expresiones regulares.
const escRx = v => String(v).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
// Wrapper para capturar errores en rutas async y responder con estado util.
const wrap = fn => (req,res,next) => fn(req,res,next).catch(err => res.status(err.status || 500).send(err.message || "Error interno"));
// Construye filtro de busqueda por texto en multiples campos.
const filter = q => q ? {$or:["name","director","review","actors"].map(f=>({[f]:{$regex:escRx(q),$options:"i"}}))} : {};
// Plantilla HTML base usada por todas las vistas renderizadas desde Express.
const html = (t,b) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t}</title><link rel="stylesheet" href="/css/site.css"></head><body>${b}</body></html>`;

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

const normalizeReview = value => {
    const normalized = normalizeText(value, "Reseña");
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > MAX_REVIEW_WORDS) {
        failValidation(`Reseña no puede tener más de ${MAX_REVIEW_WORDS} palabras.`);
    }
    return normalized;
};

const parseActors = actors => normalizeText(actors, "Actores")
    .split(",")
    .map(actor => actor.trim())
    .filter(Boolean)
    .map(actor => normalizeText(actor, "Actor"));

// Formato para mostrar actores aun cuando el dato venga vacio.
const actorsText = actors => Array.isArray(actors) && actors.length
    ? actors.map(esc).join(", ")
    : "No registrados";

// Tarjeta reutilizable para listados de peliculas.
// showActions permite mostrar/ocultar editar/eliminar segun contexto de la vista.
const card = (m, u, w=250, showActions=false) => {
    const can = u && (u.role==="admin" || String(m.author)===String(u._id));
    return `<div class="card">
        ${m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)}" style="width:100%;height:300px;object-fit:cover;border-radius:8px;margin-bottom:12px;">`:""}
        <h3>${esc(m.name)}</h3><p><b>Año:</b> ${esc(m.year)}</p><p><b>Director:</b> ${esc(m.director)}</p>
        <p><b>Actores:</b> ${actorsText(m.actors)}</p>
        ${m.review?`<p><b>Reseña:</b> ${esc(m.review)}</p>`:""}
        <p><a href="/movie/${m._id}">Ver detalle</a></p>
        ${showActions && can?`<div class="card-actions"><a href="/movies/${m._id}/edit">Editar</a>
        <form action="/movies/${m._id}/delete" method="POST" style="margin:0;padding:0;border:none;box-shadow:none;">
        <button type="submit" class="danger-btn" onclick="return confirm('¿Eliminar esta película?')">Eliminar</button></form></div>`:""}
    </div>`;
};

const grid = ms => ms.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin-top:24px;">${ms}</div>` : "<p>No se encontraron películas.</p>";
const nav = (...links) => `<a href="/">Inicio</a> | <a href="/logout">Cerrar sesión</a> ${links.map(([t,h])=>`| <a href="${h}">${t}</a>`).join("")}`;
const searchForm = (action,q) => `<form method="GET" action="${action}">
    <input type="text" name="q" value="${esc(q)}" placeholder="Buscar...">
    <button>Buscar</button>${q?`<a href="${action}">Limpiar</a>`:""}
    </form>`;
const movieBody = body => ({
    name: normalizeText(body.name, "Nombre"),
    year: body.year,
    director: normalizeText(body.director, "Director"),
    review: normalizeReview(body.review),
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
const isAdmin = (req,res,next) => req.user?.role === "admin" ? next() : res.status(403).send("Solo admin");
const isAuthor = wrap(async(req,res,next) => {
    const m = await Movie.findById(req.params.id);
    if (!m) return res.status(404).send("Película no encontrada");
    if (req.user?.role==="admin" || m.author?.equals(req.user._id)) return next();
    res.status(403).send("Sin permisos");
});

// ── APIs ──────────────────────────────────────────────────────────────────────
// Endpoints JSON usados por scripts del frontend.
app.get("/api/movies",     wrap(async(req,res)=>res.json(await Movie.find({}))));
app.get("/api/movies/:id", wrap(async(req,res)=>res.json(await Movie.findById(req.params.id))));
app.get("/api/user", (req,res)=>res.json({user:req.user}));
app.get("/api/admin/users", isLoggedIn, isAdmin, wrap(async(req,res) => {
    const q = String(req.query.q ?? "").trim();
    const query = q ? { username: { $regex: escRx(q), $options: "i" } } : {};
    const users = await User.find(query).select("username name email role").sort({ username: 1 });
    res.json(users);
}));

// ── Películas ─────────────────────────────────────────────────────────────────
// Catalogo general autenticado. No muestra acciones de edicion/borrado.
app.get("/movies", isLoggedIn, wrap(async(req,res) => {
    const q = String(req.query.q??"").trim();
    const movies = await Movie.find(filter(q)).sort({_id:-1});
    const adminLinks = req.user?.role === "admin" ? [["Administrar usuarios","/admin/users"]] : [];
    res.send(html("Películas", `<h1>Películas</h1>
        ${nav(["Mis películas","/mis-peliculas"],["Agregar","/movies/new"], ...adminLinks)}
        ${searchForm("/movies",q)}${grid(movies.map(m=>card(m,req.user)).join(""))}`));
}));

// Vista de gestion propia (o total si es admin) con acciones habilitadas.
app.get("/mis-peliculas", isLoggedIn, wrap(async(req,res) => {
    const q = String(req.query.q??"").trim(), sf = filter(q);
    const f = req.user?.role==="admin" ? sf : q ? {$and:[{author:req.user._id},sf]} : {author:req.user._id};
    const movies = await Movie.find(f).sort({_id:-1});
    const title = req.user?.role==="admin" ? "Gestión (Admin)" : "Mis películas";
    const adminLinks = req.user?.role === "admin" ? [["Administrar usuarios","/admin/users"]] : [];
    res.send(html(title, `<h1>${title}</h1>
        ${nav(["Ver todas","/movies"],["Agregar","/movies/new"], ...adminLinks)}
        ${searchForm("/mis-peliculas",q)}${grid(movies.map(m=>card(m,req.user,260,true)).join(""))}`));
}));

// Servir formularios estáticos
const send = f => (req,res) => res.sendFile(path.join(__dirname,"pelicula",f));
app.get("/movies/new",      isLoggedIn,           send("new.html"));
app.get("/movies/:id/edit", isLoggedIn, isAuthor, send("edit.html"));
app.get("/register", send("register.html"));
app.get("/login",    send("login.html"));

// ── Administración ────────────────────────────────────────────────────────────
// Vista de promocion de usuarios a admin.
app.get("/admin/users", isLoggedIn, isAdmin, send("admin-users.html"));

// Promueve a admin por nombre de usuario (formulario HTML simple).
app.post("/admin/users/make-admin", isLoggedIn, isAdmin, wrap(async(req,res) => {
    const username = normalizeText(req.body.username, "Usuario");
    const user = await User.findOne({ username: new RegExp(`^${escRx(username)}$`, "i") });
    if (!user) return res.status(404).send("Usuario no encontrado");
    user.role = "admin";
    await user.save();
    res.redirect("/admin/users");
}));

app.post("/admin/users/:id/make-admin", isLoggedIn, isAdmin, wrap(async(req,res) => {
    await User.findByIdAndUpdate(req.params.id, { role: "admin" });
    res.redirect("/admin/users");
}));

// Alta de peliculas asociando siempre el autor autenticado.
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
        ? `<li><a href="/mis-peliculas">Mis películas</a></li><li><a href="/movies/new">Agregar</a></li>${req.user.role==="admin" ? '<li><a href="/admin/users">Administrar usuarios</a></li>' : ""}<li><a href="/logout">Cerrar sesión</a></li>`
        : `<li><a href="/register">Registro</a></li><li><a href="/login">Iniciar sesión</a></li>`;
    res.send(html("Inicio",`<h1>Bienvenido a tu sitio de pelicula favoritas</h1><nav><ul>${authLinks}</ul></nav>
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

// Login tolerante a mayusculas/minusculas para el username.
app.post("/login", wrap(async(req,res,next) => {
    const username = normalizeText(req.body.username, "Usuario");
    const user = await User.findOne({ username: new RegExp(`^${escRx(username)}$`, "i") }).select("username");
    req.body.username = user ? user.username : username.toLowerCase();
    next();
}), passport.authenticate("local",{successRedirect:"/",failureRedirect:"/login"}));
app.get("/logout", (req,res,next) => req.logout(err=>err?next(err):res.redirect("/")));

// Escucha en 0.0.0.0 para permitir acceso por IP en red local.
app.listen(8080,"0.0.0.0",()=>console.log("Servidor en http://0.0.0.0:8080"));