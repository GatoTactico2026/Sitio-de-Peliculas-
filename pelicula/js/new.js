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

document.getElementById('movie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    if (!validateForm(data)) return;
    try {
        const response = await fetch('/movies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            window.location.href = '/movies';
        } else {
            alert('Error al guardar la película');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la película');
    }
});