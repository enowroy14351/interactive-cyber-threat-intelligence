var attackGlobe = null;

// Latitude & Longitude map for country lookup
const COUNTRY_COORDS = {
    "RU": { lat: 61.524, lng: 105.318 },
    "US": { lat: 37.0902, lng: -95.7129 },
    "CN": { lat: 35.8617, lng: 104.1954 },
    "NG": { lat: 9.082, lng: 8.6753 },
    "DE": { lat: 51.1657, lng: 10.4515 },
    "CM": { lat: 7.3697, lng: 12.3547 }
};

function initAttackMap() {
    const container = document.getElementById('map');
    if (!container) return;

    // Clear previous elements if re-initializing
    container.innerHTML = '';

    // Calculate a square dimension based on the container width
    const squareSize = container.clientWidth || 450;

    // Initialize Globe.gl 3D instance with equal width and height (1:1 Square)
    attackGlobe = Globe()
        (container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .backgroundColor('rgba(0,0,0,0)')
        .width(squareSize)
        .height(squareSize) // Forced equal height to form a perfect square

        // Arc styling
        .arcColor(() => ['#E63946', '#00B4D8'])
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1800)
        .arcStroke(0.6)

        // Pulsing rings at attack origin nodes
        .ringColor(() => '#FF3B30')
        .ringMaxRadius(10)
        .ringPropagationSpeed(3)
        .ringRepeatPeriod(800);

    // Control settings
    const controls = attackGlobe.controls();
    if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.enableZoom = true;
        
        controls.minDistance = 100;
        controls.maxDistance = 500;
    }

    // Camera perspective: position closer to make the globe fill the square container
    attackGlobe.pointOfView({ lat: 20, lng: 0, altitude: 1.5 });

    // Window resize handler to maintain the square aspect ratio dynamically
    window.addEventListener('resize', () => {
        if (attackGlobe && container) {
            const newSquareSize = container.clientWidth;
            attackGlobe.width(newSquareSize).height(newSquareSize);
        }
    });
}

function extractCoords(countryKey) {
    let lat = 20, lng = 0;
    
    // Check local lookup table
    if (COUNTRY_COORDS[countryKey]) {
        lat = COUNTRY_COORDS[countryKey].lat;
        lng = COUNTRY_COORDS[countryKey].lng;
    } else if (typeof getCoordinates === 'function') {
        const res = getCoordinates(countryKey);
        if (Array.isArray(res)) {
            lat = res[0];
            lng = res[1];
        } else if (res && typeof res === 'object') {
            lat = res.lat || 20;
            lng = res.lng || 0;
        }
    }

    // Add minor offset so multiple items from the same country don't overlap into 1 point
    return {
        lat: lat + (Math.random() - 0.5) * 4,
        lng: lng + (Math.random() - 0.5) * 4
    };
}

function renderMapMarkers(threatData) {
    if (!attackGlobe || !Array.isArray(threatData)) return;

    const arcsData = [];
    const ringsData = [];
    const targetCoords = COUNTRY_COORDS["US"];

    threatData.forEach(t => {
        const origin = extractCoords(t.country);

        ringsData.push({
            lat: origin.lat,
            lng: origin.lng
        });

        arcsData.push({
            startLat: origin.lat,
            startLng: origin.lng,
            endLat: targetCoords.lat + (Math.random() - 0.5) * 3,
            endLng: targetCoords.lng + (Math.random() - 0.5) * 3,
        });
    });

    attackGlobe.arcsData(arcsData);
    attackGlobe.ringsData(ringsData);
}