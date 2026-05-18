// ========================================================
// mapEngine.js - Motor Gráfico del Mapa y Animaciones de Vuelo
// ========================================================

const MapEngine = {
    map: null,
    userMarker: null,
    portalMarker: null,
    targetSignalMarker: null,
    jumpLine: null,
    activeTileLayer: null,
    // CORRECCIÓN: URLs actualizadas para mostrar etiquetas (nombres, fronteras, calles)
    mapLayers: [
        { 
            name: "Oscuro Cuántico", 
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        },
        { 
            name: "Satélite", 
            url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // lyrs=y es el modo híbrido con nombres
        },
        { 
            name: "Estándar Topográfico", 
            url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' // lyrs=m es el mapa de carretera estándar
        }
    ],

    init(containerId, startPos, layerIndex, onMapClick) {
        this.map = L.map(containerId, { zoomControl: false }).setView(startPos, 6);
        
        // Cargamos la capa con la configuración de etiquetas
        this.activeTileLayer = L.tileLayer(this.mapLayers[layerIndex].url, {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(this.map);
        
        this.userMarker = L.marker(startPos, { 
            icon: L.divIcon({ className: '', html: '<div class="user-marker"></div>', iconSize: [20, 20] }) 
        }).addTo(this.map);

        this.map.on('click', e => onMapClick(e.latlng.lat, e.latlng.lng));
    },

    updateUserPosition(pos) {
        this.userMarker.setLatLng(pos);
        this.map.setView(pos, 13);
    },

    changeLayer(index) {
        this.map.removeLayer(this.activeTileLayer);
        this.activeTileLayer = L.tileLayer(this.mapLayers[index].url, {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(this.map);
        return this.mapLayers[index].name;
    },

    drawPreview(userPos, targetPos, isWater) {
        if(this.jumpLine) this.map.removeLayer(this.jumpLine); 
        if(this.targetSignalMarker) this.map.removeLayer(this.targetSignalMarker);
        
        const statusColor = isWater ? 'var(--danger)' : 'var(--primary)';
        
        this.jumpLine = L.polyline([userPos, targetPos], { color: statusColor, weight: 2, dashArray: '10, 10', opacity: 0.7 }).addTo(this.map);
        this.targetSignalMarker = L.marker(targetPos, { 
            icon: L.divIcon({ className: '', html: `<div class="radar-container" style="color:${statusColor}"><div class="radar-wave"></div><div class="radar-wave"></div><div class="radar-dot"></div></div>`, iconSize: [40, 40], iconAnchor: [20, 20] }) 
        }).addTo(this.map);

        this.map.flyTo(targetPos, 14);
    },

    clearPreview() {
        if(this.jumpLine) this.map.removeLayer(this.jumpLine); 
        if(this.targetSignalMarker) this.map.removeLayer(this.targetSignalMarker);
    },

    startFlight(targetPos, durationSec) {
        this.map.flyTo(targetPos, 18, {
            animate: true,
            duration: durationSec,
            easeLinearity: 0.25
        });
    },

    abortFlight(returnPos) {
        this.map.stop();
        this.map.flyTo(returnPos, 14, { duration: 1.5 });
    },

    finishJump(targetPos) {
        this.clearPreview();
        if(this.portalMarker) this.map.removeLayer(this.portalMarker);
        this.portalMarker = L.marker(targetPos, { icon: L.divIcon({ className: '', html: '<div class="portal-marker"></div>', iconSize: [40, 40] }) }).addTo(map);
        this.updateUserPosition(targetPos);
        
        setTimeout(() => { if(this.portalMarker) this.map.removeLayer(this.portalMarker); }, 5000);
    }
};