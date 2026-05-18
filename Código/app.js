// ========================================================
// app.js - Controlador Principal (Conecta UI, Datos y Mapa)
// ========================================================

const TeleState = {
    userPos: [40.416, -3.703],
    userCountryCode: 'es',
    selectedLocation: null,
    activeSub: "NONE",
    travelHistory: [],
    jumpTimeouts: [],
    currentLayerIndex: 1,
    theme: 'dark'
};

const randomDestinations = [
    { lat: 35.6762, lng: 139.6503, name: "Tokio, Japón" },
    { lat: 40.7128, lng: -74.0060, name: "Nueva York, EEUU" },
    { lat: 29.9792, lng: 31.1342, name: "Pirámides de Guiza, Egipto" },
    { lat: -13.1631, lng: -72.5450, name: "Machu Picchu, Perú" },
    { lat: 48.8566, lng: 2.3522, name: "París, Francia" },
    { lat: 27.9881, lng: 86.9250, name: "Monte Everest, Nepal" },
    { lat: -33.8688, lng: 151.2093, name: "Sídney, Australia" },
    { lat: 64.1466, lng: -21.9426, name: "Reikiavik, Islandia" },
    { lat: 41.8902, lng: 12.4922, name: "Coliseo de Roma, Italia" },
    { lat: -25.6953, lng: -54.4367, name: "Cataratas del Iguazú, Argentina" },
    { lat: 51.1784, lng: -1.8262, name: "Stonehenge, Reino Unido" },
    { lat: 37.9715, lng: 23.7267, name: "Acrópolis de Atenas, Grecia" },
    { lat: -3.0674, lng: 37.3556, name: "Monte Kilimanjaro, Tanzania" },
    { lat: 25.0657, lng: 55.1229, name: "Dubái, Emiratos Árabes Unidos" },
    { lat: 37.8199, lng: -122.4783, name: "Golden Gate, San Francisco, EEUU" },
    { lat: 55.7558, lng: 37.6173, name: "Moscú, Rusia" },
    { lat: -50.9423, lng: -73.0000, name: "Torres del Paine, Chile" },
    { lat: 1.3521, lng: 103.8198, name: "Singapur" },
    { lat: 40.4319, lng: 116.5704, name: "Gran Muralla China, Mutianyu" },
    { lat: -0.9599, lng: -90.9656, name: "Islas Galápagos, Ecuador" }
];

window.togglePwd = function(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === "password" ? "text" : "password";
}

window.toggleTheme = function() {
    const body = document.body;
    const isLight = body.classList.toggle('light-mode');
    TeleState.theme = isLight ? 'light' : 'dark';

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        if (isLight) {
            themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        } else {
            themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        }
    }

    if (Auth.getUser()) Auth.updateUser(Auth.getUser().email, { theme: TeleState.theme });
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.getAttribute('role') === 'button') { e.preventDefault(); activeEl.click(); }
        }
    });

    if (document.getElementById('map')) initMapApp();
});

// ================= LÓGICA DE UI Y MAPA =================
function initMapApp() {
    const session = Auth.getUser();
    if (!session) return window.location.href = 'acceso.html'; 

    const user = session.data;
    let displayName = user.name || session.email.split('@')[0];
    
    TeleState.theme = user.theme || 'dark';
    if (TeleState.theme === 'light') {
        document.body.classList.add('light-mode');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }

    document.getElementById('nav-avatar').innerText = displayName.charAt(0).toUpperCase();
    document.getElementById('menu-avatar').innerText = displayName.charAt(0).toUpperCase();
    document.getElementById('nav-username').innerText = displayName;
    document.getElementById('menu-fullname').innerText = `${displayName} ${user.surname || ''}`.trim();
    document.getElementById('menu-email').innerText = session.email;

    TeleState.currentLayerIndex = user.mapLayer !== undefined ? user.mapLayer : 1; 
    TeleState.activeSub = user.activeSub || "NONE";
    TeleState.travelHistory = user.travelHistory || [];
    
    TeleState.travelHistory.forEach((item, index) => {
        if (!item.timestamp) item.timestamp = Date.now() - index * 1000;
        if (typeof item.isFavorite === 'undefined') item.isFavorite = false;
        if (typeof item.distance === 'undefined') item.distance = 0; 
    });

    updatePlanUI(); 
    updateHistoryUI();

    MapEngine.init('map', TeleState.userPos, TeleState.currentLayerIndex, (lat, lng) => {
        document.getElementById('user-menu').style.display = 'none'; 
        document.getElementById('search-suggestions').style.display = 'none'; 
        document.getElementById('layer-menu').style.display = 'none';
        reverseGeocode(lat, lng); 
    });

    document.querySelectorAll('.layer-option').forEach((el, i) => {
        if (i === TeleState.currentLayerIndex) el.classList.add('active');
        else el.classList.remove('active');
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            TeleState.userPos = [position.coords.latitude, position.coords.longitude];
            MapEngine.updateUserPosition(TeleState.userPos);
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${TeleState.userPos[0]}&lon=${TeleState.userPos[1]}&addressdetails=1`)
                .then(r => r.json()).then(d => { if(d.address) TeleState.userCountryCode = d.address.country_code; });
        });
    }

    setupSearchListeners();
}

window.showToast = function(message, icon = "✨") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div'); toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 3500); 
};

function updatePlanUI() {
    const badge = document.getElementById('plan-trigger'), display = document.getElementById('plan-display');
    badge.className = 'plan-badge';
    if (TeleState.activeSub === 'CABINAS') { badge.classList.add('plan-cabinas'); display.innerText = "Plan Cabinas"; } 
    else if (TeleState.activeSub === 'TOTAL') { badge.classList.add('plan-total'); display.innerText = "Plan Total VIP"; } 
    else { display.innerText = "Plan Estándar"; }
}

window.toggleUserMenu = function() {
    const menu = document.getElementById('user-menu'); menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

window.openStatsModal = function() {
    document.getElementById('user-menu').style.display = 'none';
    
    let totalDist = 0;
    let cityCounts = {};
    let topCity = "Ninguno";
    let maxCount = 0;

    TeleState.travelHistory.forEach(item => {
        if (item.type !== 'ABORTADO') {
            totalDist += (item.distance || 0);
            
            if (cityCounts[item.city]) cityCounts[item.city]++;
            else cityCounts[item.city] = 1;
            
            if (cityCounts[item.city] > maxCount) {
                maxCount = cityCounts[item.city];
                topCity = item.city;
            }
        }
    });

    let co2Saved = totalDist * 0.15;

    document.getElementById('stat-dist').innerText = Math.round(totalDist).toLocaleString();
    document.getElementById('stat-co2').innerText = Math.round(co2Saved).toLocaleString();
    document.getElementById('stat-city').innerText = topCity;

    document.getElementById('stats-modal').style.display = 'flex';
}
window.closeStatsModal = function() { document.getElementById('stats-modal').style.display = 'none'; }


window.openEditProfile = function() {
    document.getElementById('user-menu').style.display = 'none';
    const session = Auth.getUser();
    document.getElementById('edit-name').value = session.data.name || session.email.split('@')[0];
    document.getElementById('edit-surname').value = session.data.surname || '';
    document.getElementById('edit-pwd').value = ''; document.getElementById('edit-pwd2').value = ''; 
    document.getElementById('edit-profile-modal').style.display = 'flex';
}
window.closeEditProfile = function() { document.getElementById('edit-profile-modal').style.display = 'none'; }

window.saveProfile = function(e) {
    e.preventDefault();
    const newPwd = document.getElementById('edit-pwd').value, newPwd2 = document.getElementById('edit-pwd2').value;

    if (newPwd.trim() !== '' || newPwd2.trim() !== '') {
        if (newPwd !== newPwd2) return alert('Las contraseñas no coinciden.');
        if (newPwd.length < 8) return alert('Mínimo 8 caracteres.');
    }

    let newData = {
        name: document.getElementById('edit-name').value,
        surname: document.getElementById('edit-surname').value
    };
    if (newPwd.trim() !== '') newData.password = newPwd;

    Auth.updateUser(Auth.getUser().email, newData);
    showToast('Perfil actualizado', '✅'); closeEditProfile(); 
    setTimeout(() => window.location.reload(), 500); 
}

window.toggleLayerMenu = function() {
    const menu = document.getElementById('layer-menu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
}

window.setMapLayer = function(index) {
    if (TeleState.currentLayerIndex === index) return;
    
    const layerName = MapEngine.changeLayer(index);
    TeleState.currentLayerIndex = index;
    showToast(`Capa: ${layerName}`, "🗺️");
    
    document.getElementById('layer-menu').style.display = 'none';
    document.querySelectorAll('.layer-option').forEach((el, i) => {
        if (i === index) el.classList.add('active'); else el.classList.remove('active');
    });

    Auth.updateUser(Auth.getUser().email, { mapLayer: index });
}

window.centerMapOnUser = function() { MapEngine.map.flyTo(TeleState.userPos, 14, { duration: 1 }); }

window.closePreview = function() { 
    document.getElementById('preview').style.display = 'none'; 
    document.body.classList.remove('preview-open'); 
    document.body.classList.remove('water-alert-open');
    MapEngine.clearPreview();
}

window.toggleHistory = function() { document.getElementById('history-panel').classList.toggle('minimized'); }

function setupSearchListeners() {
    const searchInput = document.getElementById('search-input'), suggestionsList = document.getElementById('search-suggestions');
    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer); const query = this.value.trim();
        if (query.length < 3) { suggestionsList.style.display = 'none'; return; }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
                const data = await res.json();
                if (data && data.length > 0) {
                    suggestionsList.innerHTML = data.map(item => `<li tabindex="0" role="button" onclick="selectSuggestion(${item.lat}, ${item.lon}, '${item.display_name.split(',').slice(0, 3).join(', ').replace(/'/g, "\\'")}')">${item.display_name.split(',').slice(0, 3).join(', ')}</li>`).join('');
                    suggestionsList.style.display = 'block';
                } else { suggestionsList.innerHTML = '<li style="color:var(--text-muted); cursor:default; text-align:center;">No se encontraron destinos</li>'; suggestionsList.style.display = 'block'; }
            } catch (e) { console.error("Error:", e); }
        }, 400);
    });
    document.addEventListener('click', function(e) { if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) suggestionsList.style.display = 'none'; });
    searchInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); manualSearch(); } });
}

window.selectSuggestion = function(lat, lon, name) { document.getElementById('search-input').value = name.split(',')[0].trim(); document.getElementById('search-suggestions').style.display = 'none'; reverseGeocode(lat, lon); };

window.manualSearch = async function() {
    const searchInput = document.getElementById('search-input'), q = searchInput.value;
    if(!q) return; document.getElementById('search-suggestions').style.display = 'none';
    const btn = document.getElementById('search-btn'), originalText = btn.innerText;
    btn.innerText = "BUSCANDO..."; btn.classList.add('btn-loading');
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`);
        const data = await res.json();
        if(data[0]) { reverseGeocode(data[0].lat, data[0].lon); showToast("Ubicación encontrada", "🛰️"); } else showToast("Ubicación no encontrada", "❌");
    } catch(e) { showToast("Error de satélite", "⚠️"); } finally { btn.innerText = originalText; btn.classList.remove('btn-loading'); }
}

window.randomJump = function() {
    document.getElementById('search-suggestions').style.display = 'none';
    const randomIndex = Math.floor(Math.random() * randomDestinations.length);
    const dest = randomDestinations[randomIndex];
    
    document.getElementById('search-input').value = dest.name;
    showToast("Iniciando Ruleta Cuántica...", "🎲");
    reverseGeocode(dest.lat, dest.lng);
}

async function fetchRealWeather(lat, lng) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`);
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m), code = data.current.weather_code;
        let desc = "Despejado", icon = "☀️";
        if(code >= 1 && code <= 3) { desc = "Parcialmente nublado"; icon = "⛅"; } else if(code >= 45 && code <= 48) { desc = "Niebla"; icon = "🌫️"; } else if(code >= 51 && code <= 67) { desc = "Lluvia"; icon = "🌧️"; } else if(code >= 71 && code <= 77) { desc = "Nieve"; icon = "❄️"; } else if(code >= 80) { desc = "Tormenta"; icon = "⛈️"; }
        return { temp, desc, icon };
    } catch (e) { return { temp: "--", desc: "Error", icon: "⚠️" }; }
}

async function reverseGeocode(lat, lng) {
    let city = "Zona Cuántica", destCountryCode = '??', isInt = false, isWater = false, cityCenter = [lat, lng], crowdData = { label: "MÍNIMA", color: "#28a745" };
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await res.json();
        if (!data || !data.address || (!data.address.country && !data.address.ocean)) isWater = true; 
        else {
            const type = (data.type || "").toLowerCase(), category = (data.category || "").toLowerCase(), displayName = (data.display_name || "").toLowerCase();
            isWater = ['ocean', 'sea', 'mar', 'rio', 'river', 'lake', 'lago', 'water', 'basin'].some(kw => displayName.includes(kw) || type.includes(kw) || category.includes(kw)) && !(data.address.road || data.address.city || data.address.town || data.address.village);
            city = data.address.city || data.address.town || data.address.village || data.address.state || data.address.country || "Punto Terrestre";
            destCountryCode = data.address.country_code; isInt = destCountryCode !== TeleState.userCountryCode;
            
            const searchRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)},${data.address.country || ''}&limit=1&addressdetails=1`);
            const searchData = await searchRes.json();
            if (searchData[0]) {
                cityCenter = [parseFloat(searchData[0].lat), parseFloat(searchData[0].lon)];
                const ds = Math.pow(searchData[0].importance || 0.01, 2.5) * ((new Date().getHours() > 8 && new Date().getHours() < 22) ? 1.5 : 0.2);
                if (ds > 0.75) crowdData = { label: "MUY ALTA", color: "#dc3545" }; else if (ds > 0.45) crowdData = { label: "ALTA", color: "#fd7e14" }; else if (ds > 0.20) crowdData = { label: "MEDIA", color: "#ffc107" }; else if (ds > 0.05) crowdData = { label: "BAJA", color: "#17a2b8" };
            }
        }
    } catch (error) { isWater = true; }

    const R = 6371, dLat = (lat-TeleState.userPos[0]) * Math.PI / 180, dLon = (lng-TeleState.userPos[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(TeleState.userPos[0] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    TeleState.selectedLocation = { lat, lng, city, isWater, centerPos: cityCenter, isInternational: isInt, countryCode: destCountryCode, distance: dist, weather: await fetchRealWeather(lat, lng), crowd: crowdData };
    updatePreviewUI();
}

function updatePreviewUI() {
    if(!TeleState.selectedLocation) return;
    
    MapEngine.drawPreview(TeleState.userPos, [TeleState.selectedLocation.lat, TeleState.selectedLocation.lng], TeleState.selectedLocation.isWater);
    
    document.getElementById('prev-title').innerText = TeleState.selectedLocation.city;
    document.getElementById('dist-info').innerText = `${Math.round(TeleState.selectedLocation.distance)} km | ${TeleState.selectedLocation.isInternational ? 'Internacional 🌍' : 'Nacional 🏳️'}`;
    document.getElementById('temp-val').innerText = `${TeleState.selectedLocation.weather.temp}°C`;
    document.getElementById('weather-desc').innerText = TeleState.selectedLocation.weather.desc;
    document.getElementById('weather-icon').innerText = TeleState.selectedLocation.weather.icon;
    document.getElementById('crowd-val').innerText = TeleState.selectedLocation.crowd.label; 
    document.getElementById('crowd-val').style.color = TeleState.selectedLocation.crowd.color;

    const alertBox = document.getElementById('water-alert');
    const jumpBtn = document.getElementById('jump-btn');
    
    if(TeleState.selectedLocation.isWater) { 
        alertBox.style.display = 'flex'; 
        jumpBtn.disabled = true; 
        jumpBtn.innerText = "SALTO BLOQUEADO"; 
        document.body.classList.add('water-alert-open');
    } else { 
        alertBox.style.display = 'none'; 
        jumpBtn.disabled = false; 
        jumpBtn.innerText = "INICIAR SALTO"; 
        document.body.classList.remove('water-alert-open');
    }
    
    document.getElementById('preview').style.display = 'block';
    document.body.classList.add('preview-open'); 

    setTimeout(() => document.querySelector('.preview-content .close-btn').focus(), 100);
}

window.openSubscriptionMenu = function(fromPayment = false) {
    const modal = document.getElementById('modal-content');
    let content = `<div class="close-btn" onclick="closeModal()">✖</div><h2 style="margin-top:0; margin-right: 20px;">Suscripciones Quantum</h2>`;
    if (TeleState.activeSub === "NONE") {
        content += `<p style="font-size:14px; color:var(--text-muted);">Selecciona un plan corporativo para saltos ilimitados.</p>
            <div class="option" onclick="setSub('CABINAS', ${fromPayment})" style="border-color:var(--cabinas);">
                <div style="font-weight:800; color:var(--cabinas);">PLAN CABINAS</div><div style="font-size:11px;">Centros ilimitados</div><div class="price" style="margin-top:5px;">15,000€/mes</div>
            </div>
            <div class="option" onclick="setSub('TOTAL', ${fromPayment})" style="border-color:var(--vip);">
                <div style="font-weight:800; color:var(--vip);">PLAN TOTAL VIP</div><div style="font-size:11px;">Transporte total sin límites.</div><div class="price" style="margin-top:5px;">45,000€/mes</div>
            </div>`;
    } else if (TeleState.activeSub === "CABINAS") {
        content += `<p style="font-size:14px; color:var(--text-muted);">Mejora tu Plan Cabinas con tarifa preferencial:</p>
            <div class="option" onclick="setSub('TOTAL', ${fromPayment})" style="border-color:var(--vip); background: rgba(255,215,0,0.05);">
                <div style="position:absolute; top:0; right:0; background:var(--vip); color:black; font-size:9px; padding:3px 8px; font-weight:bold;">UPGRADE</div>
                <div style="font-weight:800; color:var(--vip);">MEJORAR A TOTAL VIP</div><div class="price" style="margin-top:5px;"><strike style="color:#999; font-size:14px;">45,000€</strike> 32,000€/m</div>
            </div>`;
    } else { content += `<p style="font-weight:bold; color:var(--vip); margin-bottom:20px;">Plan TOTAL VIP activo.</p>`; }
    
    // CORRECCIÓN: Quitados los estilos grises en línea para que herede el azul (.btn-action)
    content += `<button class="btn-action" onclick="${fromPayment ? 'renderPaymentModal()' : 'closeModal()'}">VOLVER</button>`;
    modal.innerHTML = content; document.getElementById('modal').style.display = 'flex';
}

window.handleTransportRequest = function() {
    if(TeleState.selectedLocation.isWater) return; 
    renderPaymentModal(); document.getElementById('modal').style.display = 'flex';
}

window.renderPaymentModal = function() {
    const { isInternational, distance, city } = TeleState.selectedLocation;
    let pCabina = Math.round(isInternational ? (1200 + distance * 0.4) : (250 + distance * 0.8)), pExacto = Math.round(isInternational ? (3000 + distance * 0.8) : (600 + distance * 1.5));
    const modal = document.getElementById('modal-content');
    let baseHTML = `<div class="close-btn" onclick="closeModal()">✖</div><h2 style="margin-right: 20px;">Salto a ${city}</h2>`;
    
    if (TeleState.activeSub === "TOTAL") {
        modal.innerHTML = baseHTML + `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin:20px 0;"><div class="option" onclick="doJump('CABINA')"><h4>CENTRO CIUDAD</h4><div class="price">GRATIS (VIP)</div></div><div class="option ${isInternational ? 'disabled' : ''}" onclick="${isInternational ? '' : "doJump('EXACTO')" }"><h4>COORDENADAS</h4><div class="price">${isInternational ? '--' : 'GRATIS (VIP)'}</div></div></div>`;
    } else if (TeleState.activeSub === "CABINAS") {
        modal.innerHTML = baseHTML + `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin:20px 0;"><div class="option" onclick="doJump('CABINA')"><h4>CENTRO CIUDAD</h4><div class="price">GRATIS</div></div><div class="option ${isInternational ? 'disabled' : ''}" onclick="${isInternational ? '' : "doJump('EXACTO')" }">${!isInternational ? '<div style="position:absolute; top:0; right:0; background:#FF3D00; color:white; font-size:9px; padding:2px 5px; font-weight:bold;">-50%</div>' : ''}<h4>COORDENADAS</h4><div class="price">${isInternational ? '--' : Math.round(pExacto/2) + '€'}</div></div></div><button class="btn-action" onclick="openSubscriptionMenu(true)">MEJORAR PLAN</button>`;
    } else {
        modal.innerHTML = baseHTML + `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin:20px 0;"><div class="option" onclick="doJump('CABINA')"><h4>CENTRO CIUDAD</h4><div class="price">${pCabina}€</div></div><div class="option ${isInternational ? 'disabled' : ''}" onclick="${isInternational ? '' : "doJump('EXACTO')" }"><h4>COORDENADAS</h4><div class="price">${isInternational ? '--' : pExacto + '€'}</div></div></div><button class="btn-action" onclick="openSubscriptionMenu(true)">MEJORAR PLAN</button>`;
    }
}

window.doJump = function(tipo) {
    document.getElementById('preview').style.display = 'none'; 
    document.body.classList.remove('preview-open'); 
    closeModal();

    const targetPos = (tipo === 'CABINA') ? TeleState.selectedLocation.centerPos : [TeleState.selectedLocation.lat, TeleState.selectedLocation.lng];
    
    MapEngine.startFlight(targetPos, 3.2);

    const overlay = document.getElementById('jump-overlay'), fill = document.getElementById('jump-progress-fill'), text = document.getElementById('jump-dynamic-text');
    TeleState.jumpTimeouts = []; 
    overlay.style.display = 'flex'; fill.style.width = '0%'; text.innerText = "Calculando coordenadas cuánticas...";
    
    TeleState.jumpTimeouts.push(setTimeout(() => { fill.style.width = '35%'; text.innerText = "Estableciendo conexión segura..."; }, 800));
    
    TeleState.jumpTimeouts.push(setTimeout(() => { 
        fill.style.width = '70%'; 
        text.innerText = "Desestabilizando entorno local..."; 
        document.body.classList.add('glitch-phase-1');
    }, 1600));
    
    TeleState.jumpTimeouts.push(setTimeout(() => { 
        fill.style.width = '95%'; 
        text.innerText = "Dematerialización inminente..."; 
        document.body.classList.remove('glitch-phase-1');
        document.body.classList.add('glitch-phase-2');
    }, 2400));

    TeleState.jumpTimeouts.push(setTimeout(() => {
        fill.style.width = '100%';
        document.body.classList.remove('glitch-phase-1', 'glitch-phase-2');
        
        const flash = document.getElementById('flash');
        
        addToHistory(TeleState.selectedLocation.city, tipo, targetPos[0], targetPos[1], TeleState.selectedLocation.distance);
        
        flash.style.opacity = '1'; showToast("Transacción confirmada y salto completado", "✅");

        setTimeout(() => {
            overlay.style.display = 'none'; flash.style.opacity = '0';
            MapEngine.finishJump(targetPos);
            TeleState.userPos = targetPos;
            TeleState.userCountryCode = TeleState.selectedLocation.countryCode;
        }, 600);
    }, 3200));
}

window.abortJump = function() {
    TeleState.jumpTimeouts.forEach(clearTimeout);
    
    document.body.classList.remove('glitch-phase-1', 'glitch-phase-2');
    document.getElementById('jump-overlay').style.display = 'none';
    
    MapEngine.abortFlight(TeleState.userPos);
    
    showToast("Salto Abortado de Emergencia", "🛑");
    addToHistory(TeleState.selectedLocation.city, "ABORTADO", TeleState.selectedLocation.lat, TeleState.selectedLocation.lng, 0);
}

function addToHistory(city, type, lat, lng, distance = 0) {
    document.getElementById('history-panel').classList.remove('minimized');
    const displayType = type === 'EXACTO' ? 'COORDENADAS' : (type === 'ABORTADO' ? 'ABORTADO' : 'CABINA');
    TeleState.travelHistory.push({ city, type: displayType, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), lat, lng, timestamp: Date.now(), isFavorite: false, distance });
    TeleState.travelHistory.sort((a, b) => { if (a.isFavorite === b.isFavorite) return b.timestamp - a.timestamp; return a.isFavorite ? -1 : 1; });
    if(TeleState.travelHistory.length > 50) TeleState.travelHistory.pop(); 
    Auth.updateUser(Auth.getUser().email, { travelHistory: TeleState.travelHistory }); updateHistoryUI();
}

window.toggleFavorite = function(timestamp, event) {
    event.stopPropagation();
    const item = TeleState.travelHistory.find(i => i.timestamp === timestamp);
    if (item) {
        item.isFavorite = !item.isFavorite;
        TeleState.travelHistory.sort((a, b) => { if (a.isFavorite === b.isFavorite) return b.timestamp - a.timestamp; return a.isFavorite ? -1 : 1; });
        Auth.updateUser(Auth.getUser().email, { travelHistory: TeleState.travelHistory }); updateHistoryUI();
        if (item.isFavorite) showToast("Destino guardado en favoritos", "⭐");
    }
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    if (TeleState.travelHistory.length === 0) { list.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">No hay viajes recientes</div>'; return; }
    
    list.innerHTML = TeleState.travelHistory.map((item) => {
        const favClass = item.isFavorite ? 'active' : '';
        const starSVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${item.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        const isAborted = item.type === 'ABORTADO';
        const typeStyle = isAborted ? 'color: var(--danger); background: rgba(255,68,68,0.1); border: 1px solid var(--danger);' : '';
        const action = `onclick="selectFromHistory(${item.timestamp})" tabindex="0" role="button"`;

        return `<div class="history-item" ${action}>
            <div class="history-item-content">
                <button class="fav-btn ${favClass}" onclick="toggleFavorite(${item.timestamp}, event)">${starSVG}</button>
                <div><div class="history-dest">${item.city}</div><div style="font-size:10px; color:var(--text-muted);">${item.time}</div></div>
            </div>
            <div class="history-type" style="${typeStyle}">${item.type}</div>
        </div>`;
    }).join('');
}

window.selectFromHistory = function(timestamp) {
    const item = TeleState.travelHistory.find(i => i.timestamp === timestamp);
    if (item) reverseGeocode(item.lat, item.lng);
}

window.setSub = function(t, fromPayment = false) {
    TeleState.activeSub = t;
    Auth.updateUser(Auth.getUser().email, { activeSub: t });
    updatePlanUI(); showToast(`Plan ${t} activado`, "⚡");
    if (fromPayment) renderPaymentModal(); else closeModal();
}

window.closeModal = function() { document.getElementById('modal').style.display = 'none'; }