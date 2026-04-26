function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function roleLabel(role) {
    return role === "admin" ? "Admin" : "Usuario";
}

async function loadUsers(query = "") {
    const usersBody = document.getElementById("users-body");
    usersBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
        const search = query ? `?q=${encodeURIComponent(query)}` : "";
        const response = await fetch(`/api/admin/users${search}`);

        if (!response.ok) {
            usersBody.innerHTML = '<tr><td colspan="5">No autorizado o error al cargar usuarios.</td></tr>';
            return;
        }

        const users = await response.json();

        if (!users.length) {
            usersBody.innerHTML = '<tr><td colspan="5">No hay usuarios.</td></tr>';
            return;
        }

        usersBody.innerHTML = users.map((user) => `
            <tr>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.name || "-")}</td>
                <td>${escapeHtml(user.email || "-")}</td>
                <td>${escapeHtml(roleLabel(user.role))}</td>
                <td>${user.role === "admin"
                    ? "-"
                    : `<form action="/admin/users/${user._id}/make-admin" method="POST"><button type="submit">Hacer admin</button></form>`}</td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Error loading users:", error);
        usersBody.innerHTML = '<tr><td colspan="5">Error al cargar usuarios.</td></tr>';
    }
}

document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("search-input").value.trim();
    loadUsers(query);
});

document.getElementById("clear-btn").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    loadUsers("");
});

loadUsers();
