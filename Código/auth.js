// ========================================================
// auth.js - Gestión de Usuarios y Base de Datos (localStorage)
// ========================================================

const Auth = {
    mockAccounts: {
        'Google': [ { name: 'Admin TeleMaps', email: 'admin@telemaps.com', color: '#4285F4', initial: 'A' }, { name: 'Estudiante Ingeniería', email: 'lab.sistemas@usal.es', color: '#EA4335', initial: 'E' } ],
        'Apple': [ { name: 'Prototipos UI', email: 'design@icloud.com', color: '#555555', initial: 'P' }, { name: 'Usuario Oculto', email: 'privaterelay@appleid.com', color: '#000000', initial: 'U' } ],
        'Facebook': [ { name: 'Admin Servidor', email: 'root@debian.local', color: '#1877F2', initial: 'A' }, { name: 'Usuario Red', email: 'usuario@fb.com', color: '#4267B2', initial: 'U' } ]
    },
    currentAction: 'login',

    getUser() {
        const email = localStorage.getItem('telemaps_activeUser');
        if (!email) return null;
        const users = JSON.parse(localStorage.getItem('telemaps_db')) || {};
        return { email, data: users[email] };
    },

    updateUser(email, newData) {
        let users = JSON.parse(localStorage.getItem('telemaps_db')) || {};
        users[email] = { ...users[email], ...newData };
        localStorage.setItem('telemaps_db', JSON.stringify(users));
    },

    logout() {
        localStorage.removeItem('telemaps_activeUser');
        window.location.href = 'acceso.html';
    }
};

window.switchAuthMode = function(mode) {
    document.getElementById('error-msg').style.display = 'none';
    document.getElementById('login-section').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('register-section').style.display = mode === 'register' ? 'block' : 'none';
}

function showAuthError(msg) {
    const errorEl = document.getElementById('error-msg');
    errorEl.innerText = msg; errorEl.style.display = 'block';
}

window.handleLogin = function(e) {
    e.preventDefault(); document.getElementById('error-msg').style.display = 'none';
    const email = document.getElementById('login-email').value, pwd = document.getElementById('login-pwd').value;
    let users = JSON.parse(localStorage.getItem('telemaps_db')) || {};

    if (!users[email]) return showAuthError("Cuenta no encontrada. Por favor, regístrate primero.");
    if (users[email].password !== pwd) return showAuthError("Contraseña incorrecta.");

    localStorage.setItem('telemaps_activeUser', email); window.location.href = 'mapa.html'; 
}

window.handleRegister = function(e) {
    e.preventDefault(); document.getElementById('error-msg').style.display = 'none';
    const name = document.getElementById('reg-name').value, surname = document.getElementById('reg-surname').value;
    const email = document.getElementById('reg-email').value, pwd = document.getElementById('reg-pwd').value, pwd2 = document.getElementById('reg-pwd2').value;

    if (pwd !== pwd2) return showAuthError("Las contraseñas no coinciden.");
    let users = JSON.parse(localStorage.getItem('telemaps_db')) || {};
    if (users[email]) return showAuthError("Este correo electrónico ya está registrado.");

    users[email] = { name, surname, password: pwd, activeSub: "NONE", travelHistory: [], mapLayer: 1 };
    localStorage.setItem('telemaps_db', JSON.stringify(users));
    alert("¡Cuenta creada! Serás redirigido al inicio de sesión."); switchAuthMode('login');
}

window.openSimModal = function(provider, action) {
    Auth.currentAction = action; 
    document.getElementById('sim-title').innerText = `${action === 'login' ? 'Iniciar sesión' : 'Registrarse'} con ${provider}`;
    const list = document.getElementById('sim-accounts-list'); list.innerHTML = '';
    Auth.mockAccounts[provider].forEach(acc => {
        list.innerHTML += `<div class="sim-account" onclick="simulateOAuth('${acc.name}', '${acc.email}')"><div class="sim-avatar" style="background: ${acc.color};">${acc.initial}</div><div class="sim-info"><div>${acc.name}</div><div>${acc.email}</div></div></div>`;
    });
    document.getElementById('sim-modal').style.display = 'flex';
}

window.closeSimModal = function() { document.getElementById('sim-modal').style.display = 'none'; }

window.simulateOAuth = function(name, email) {
    let users = JSON.parse(localStorage.getItem('telemaps_db')) || {};
    if (Auth.currentAction === 'login') {
        if (!users[email]) { alert(`No hay cuenta asociada a ${email}. Regístrate primero.`); return closeSimModal(); }
    } else {
        if (users[email]) { alert(`La cuenta ${email} ya está registrada.`); switchAuthMode('login'); return closeSimModal(); }
        let nameParts = name.split(' ');
        users[email] = { name: nameParts[0], surname: nameParts.slice(1).join(' '), password: 'simulacion_oauth', activeSub: "NONE", travelHistory: [], mapLayer: 1 };
        localStorage.setItem('telemaps_db', JSON.stringify(users));
    }
    localStorage.setItem('telemaps_activeUser', email); window.location.href = 'mapa.html';
}

window.logout = Auth.logout;