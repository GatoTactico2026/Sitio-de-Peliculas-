function getMovieIdFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
}

function renderActors(actors) {
    if (!actors || actors.length === 0) {
        return '<p><strong>Actores:</strong> No registrados</p>';
    }

    return `<p><strong>Actores:</strong> ${actors.join(', ')}</p>`;
}

async function loadMovieDetail() {
    const movieId = getMovieIdFromPath();
    const container = document.getElementById('movie-detail');

    if (!movieId) {
        container.innerHTML = '<p>No se encontró el identificador de la película.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/movies/${movieId}`);

        if (!response.ok) {
            container.innerHTML = '<p>No se pudo cargar la película.</p>';
            return;
        }

        const movie = await response.json();

        if (!movie) {
            container.innerHTML = '<p>Película no encontrada.</p>';
            return;
        }

        container.innerHTML = `
            <div style="border: 1px solid #ccc; border-radius: 8px; padding: 20px; max-width: 700px;">
                ${movie.image ? `<img src="${movie.image}" alt="${movie.name}" style="width: 100%; max-height: 450px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;">` : ''}
                <h2>${movie.name || 'Sin nombre'}</h2>
                <p><strong>Año:</strong> ${movie.year || 'No disponible'}</p>
                <p><strong>Director:</strong> ${movie.director || 'No disponible'}</p>
                <p><strong>Reseña:</strong> ${movie.review || 'Sin reseña'}</p>
                ${renderActors(movie.actors)}
            </div>
        `;
    } catch (error) {
        console.error('Error loading movie detail:', error);
        container.innerHTML = '<p>Error al cargar el detalle de la película.</p>';
    }
}

loadMovieDetail();