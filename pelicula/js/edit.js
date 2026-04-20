const movieId = window.location.pathname.split('/')[2];
const movieForm = document.getElementById('movie-form');
const deleteForm = document.getElementById('delete-form');

movieForm.action = `/movies/${movieId}`;
movieForm.method = 'POST';
deleteForm.action = `/movies/${movieId}/delete`;
deleteForm.method = 'POST';

async function loadMovie() {
    try {
        const response = await fetch(`/api/movies/${movieId}`);
        const movie = await response.json();
        document.querySelector('[name="name"]').value = movie.name;
        document.querySelector('[name="year"]').value = movie.year;
        document.querySelector('[name="director"]').value = movie.director;
        document.querySelector('[name="review"]').value = movie.review;
        document.querySelector('[name="actors"]').value = movie.actors ? movie.actors.join(', ') : '';
        document.querySelector('[name="image"]').value = movie.image;
    } catch (error) {
        console.error('Error loading movie:', error);
    }
}

function validateForm(data) {
    if (data.review) {
        const wordCount = data.review.trim().split(/\s+/).length;
        if (wordCount > 100) {
            alert('La reseña no puede tener más de 100 palabras.');
            return false;
        }
    }
    // Sanitize inputs
    for (let key in data) {
        if (typeof data[key] === 'string') {
            data[key] = data[key].trim();
        }
    }
    return true;
}

movieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    if (!validateForm(data)) return;
    try {
        const response = await fetch(`/movies/${movieId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            window.location.href = '/movies';
        } else {
            alert('Error al actualizar la película');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la película');
    }
});

deleteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (confirm('¿Estás seguro de eliminar esta película?')) {
        try {
            const response = await fetch(`/movies/${movieId}/delete`, {
                method: 'POST'
            });
            if (response.ok) {
                window.location.href = '/movies';
            } else {
                alert('Error al eliminar la película');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar la película');
        }
    }
});

loadMovie();