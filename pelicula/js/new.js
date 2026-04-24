function validateForm(data) {
    const blockedPattern = /<\s*\/?\s*script\b|javascript:|on\w+\s*=|<[^>]+>|\$where|\bunion\b\s+\bselect\b|\bdrop\b\s+\btable\b|\binsert\b\s+\binto\b|\bdelete\b\s+\bfrom\b|\bupdate\b\s+\w+\s+\bset\b|--|\/\*|\*\//i;
    for (const key in data) {
        if (typeof data[key] !== 'string') {
            continue;
        }
        data[key] = data[key].trim();
        if (data[key].length > 100) {
            alert(`El campo ${key} no puede tener más de 100 caracteres.`);
            return false;
        }
        if (blockedPattern.test(data[key])) {
            alert(`El campo ${key} contiene contenido no permitido.`);
            return false;
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