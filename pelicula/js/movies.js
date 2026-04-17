let currentUser = null;

async function loadUser() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        currentUser = data.user;
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

async function loadMovies() {
    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        const container = document.getElementById('movies-container');
        container.innerHTML = movies.map(movie => `
            <div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; width: 250px; text-align: center;">
                ${movie.image ? `<img src="${movie.image}" alt="${movie.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">` : ''}
                <h3>${movie.name}</h3>
                <p><strong>Año:</strong> ${movie.year}</p>
                <p><strong>Director:</strong> ${movie.director}</p>
                ${movie.review ? `<p><strong>Reseña:</strong> ${movie.review}</p>` : ''}
                ${canEdit(movie) ? `<a href="/movies/${movie._id}/edit">Editar</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading movies:', error);
    }
}

function canEdit(movie) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!movie.author) return true; // Permitir editar si no hay autor (películas viejas)
    return currentUser._id === movie.author.toString();
}

async function init() {
    await loadUser();
    await loadMovies();
}
init();