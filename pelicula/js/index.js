// Script de la pagina inicial.
// Carga las peliculas publicas desde la API y convierte cada tarjeta en acceso al detalle.
async function loadMovies() {
    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        const container = document.getElementById('movies-container');
        if (movies.length > 0) {
            container.innerHTML = '<div style="display: flex; flex-wrap: wrap; gap: 20px;">' +
                movies.map(movie => `
                    <div data-movie-id="${movie._id}" style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; width: 250px; text-align: center; cursor: pointer;">
                        ${movie.image ? `<img src="${movie.image}" alt="${movie.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">` : ''}
                        <h3>${movie.name}</h3>
                        <p><strong>Año:</strong> ${movie.year}</p>
                        <p><strong>Director:</strong> ${movie.director}</p>
                        ${movie.review ? `<p><strong>Reseña:</strong> ${movie.review}</p>` : ''}
                    </div>
                `).join('') +
                '</div>';

            container.querySelectorAll('[data-movie-id]').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.getAttribute('data-movie-id');
                    if (movieId) {
                        window.location.href = `/movie/${movieId}`;
                    }
                });
            });
        } else {
            container.innerHTML = '<p>No hay películas disponibles.</p>';
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        document.getElementById('movies-container').innerHTML = '<p>Error al cargar películas.</p>';
    }
}
loadMovies();