// Global state to hold fetched data and current filter settings
let rawThreatsData = [];
let activeAttackFilter = 'ALL';
let activeSeverityFilter = 'ALL';
let activeCountryFilter = 'ALL';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://cyber-threat-dashboad.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize the 3D Globe
    if (typeof initAttackMap === 'function') {
        initAttackMap();
    }

    // 2. Start navbar live clock
    updateLiveTimestamp();
    setInterval(updateLiveTimestamp, 1000);

    // 3. Attach filter event listeners
    setupFilterListeners();

    // 4. Fetch initial dataset from Flask backend
    await refreshDashboard();
});

// Animation
function animateKpiCards() {
    const cards = document.querySelectorAll('.kpi-card');
    cards.forEach(card => {
        card.classList.remove('updated');
        // Force reflow to restart CSS animation
        void card.offsetWidth; 
        card.classList.add('updated');
    });
}

// Update Navbar UTC Clock
function updateLiveTimestamp() {
    const timeEl = document.getElementById('live-timestamp');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toUTCString().replace('GMT', 'UTC');
    }
}

// Fetch Threat Data from API
async function refreshDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/threats`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        rawThreatsData = await response.json();

        // Populate dynamic country dropdown based on available backend data
        populateCountryDropdown(rawThreatsData);

        // Render view with filtered data
        applyFiltersAndRender();

    } catch (err) {
        console.error('Failed to load dashboard threat data:', err);
    }
}

// Setup Event Listeners for Filter Controls
function setupFilterListeners() {
    // Attack Type Filter Buttons
    const filterButtons = document.querySelectorAll('.filter-group .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            activeAttackFilter = e.target.textContent.trim().toUpperCase();
            applyFiltersAndRender();
        });
    });

    // Dropdown Selectors
    const dropdowns = document.querySelectorAll('.filter-dropdowns .dropdown');
    dropdowns.forEach(select => {
        select.addEventListener('change', (e) => {
            const val = e.target.value.toUpperCase();
            
            if (e.target.dataset.filter === 'country') {
                activeCountryFilter = val;
            } else if (e.target.dataset.filter === 'severity') {
                activeSeverityFilter = val;
            }
            applyFiltersAndRender();
        });
    });
}

// Populate Country Dropdown Dynamically
function populateCountryDropdown(threats) {
    const countrySelect = document.querySelector('.filter-dropdowns select[data-filter="country"]');
    if (!countrySelect) return;

    const countries = [...new Set(threats.map(t => t.country))].sort();
    countrySelect.innerHTML = '<option value="ALL">All Countries</option>';
    countries.forEach(c => {
        countrySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

// Filter Dataset & Re-render Visualizations
function applyFiltersAndRender() {
    let filtered = [...rawThreatsData];

    // Filter by Attack Type
    if (activeAttackFilter !== 'ALL' && activeAttackFilter !== 'ALL TYPES') {
        filtered = filtered.filter(t => t.attack_type.toUpperCase().includes(activeAttackFilter));
    }

    // Filter by Country
    if (activeCountryFilter !== 'ALL') {
        filtered = filtered.filter(t => t.country.toUpperCase() === activeCountryFilter);
    }

    // Filter by Severity (calculated based on IOC count thresholds)
    if (activeSeverityFilter !== 'ALL') {
        filtered = filtered.filter(t => {
            let sev = 'LOW';
            if (t.ioc_count > 50) sev = 'HIGH';
            else if (t.ioc_count > 15) sev = 'MEDIUM';
            
            return sev === activeSeverityFilter;
        });
    }
    
    // Update Visualizations with filtered dataset
    if (typeof renderMapMarkers === 'function') renderMapMarkers(filtered);
    updateKPICards(filtered);
    renderAttackDistributionChart(filtered);
    renderTopMalwareChart(filtered);
    renderTrendChart();
    populatePulseTable(filtered);
}

// Update Top KPI Cards
function updateKPICards(threats) {
    const threatsToday = document.getElementById('kpi-threats-today');
    const topAttack = document.getElementById('kpi-top-attack');
    const topOrigin = document.getElementById('kpi-top-origin');

    if (threatsToday) threatsToday.textContent = threats.length.toLocaleString();

    const attackCounts = {};
    const countryCounts = {};

    threats.forEach(t => {
        attackCounts[t.attack_type] = (attackCounts[t.attack_type] || 0) + 1;
        countryCounts[t.country] = (countryCounts[t.country] || 0) + 1;
    });

    const sortedAttacks = Object.keys(attackCounts).sort((a, b) => attackCounts[b] - attackCounts[a]);
    const sortedCountries = Object.keys(countryCounts).sort((a, b) => countryCounts[b] - countryCounts[a]);

    if (topAttack) topAttack.textContent = sortedAttacks.length ? sortedAttacks[0] : '--';
    if (topOrigin) topOrigin.textContent = sortedCountries.length ? sortedCountries[0] : '--';
}

// Render Donut Chart (Attack Types)
function renderAttackDistributionChart(threats) {
    const ctx = document.getElementById('attackDistributionChart')?.getContext('2d');
    if (!ctx) return;

    if (window.attackChartInstance) {
        window.attackChartInstance.destroy();
    }

    const counts = {};
    threats.forEach(t => counts[t.attack_type] = (counts[t.attack_type] || 0) + 1);

    window.attackChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts).length ? Object.keys(counts) : ['No Data'],
            datasets: [{
                data: Object.values(counts).length ? Object.values(counts) : [1],
                backgroundColor: ['#E63946', '#F4A261', '#9D4EDD', '#00B4D8', '#2A9D8F', '#E76F51'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#8F9BBA' } } }
        }
    });
}

// Render Horizontal Bar Chart (Top Malware)
function renderTopMalwareChart(threats) {
    const ctx = document.getElementById('topMalwareChart')?.getContext('2d');
    if (!ctx) return;

    if (window.malwareChartInstance) {
        window.malwareChartInstance.destroy();
    }

    window.malwareChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Emotet', 'LockBit 3.0', 'Qakbot', 'AgentTesla', 'Formbook'],
            datasets: [{
                label: 'Detections',
                data: [287, 194, 142, 98, 76],
                backgroundColor: '#9D4EDD',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8F9BBA' }, grid: { color: '#1B254B' } },
                y: { ticks: { color: '#8F9BBA' }, grid: { display: false } }
            }
        }
    });
}

// Render 30-Day Trend Line Chart
function renderTrendChart() {
    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;

    if (window.trendChartInstance) {
        window.trendChartInstance.destroy();
    }

    window.trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 15}, (_, i) => `Day ${i + 1}`),
            datasets: [{
                label: 'Threat Volume',
                data: [650, 720, 800, 1200, 950, 1100, 847, 900, 1300, 1842, 1400, 1100, 950, 870, 920],
                borderColor: '#00B4D8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8F9BBA' }, grid: { color: '#1B254B' } },
                y: { ticks: { color: '#8F9BBA' }, grid: { color: '#1B254B' } }
            }
        }
    });
}

// Populate Latest Threat Pulses Table
function populatePulseTable(threats) {
    const tbody = document.getElementById('pulse-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (threats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No matching threats found.</td></tr>';
        return;
    }

    threats.slice(0, 5).forEach(t => {
        let sevClass = 'low';
        let sevLabel = 'Low';

        if (t.ioc_count > 50) { sevClass = 'high'; sevLabel = 'High'; }
        else if (t.ioc_count > 15) { sevClass = 'med'; sevLabel = 'Med'; }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.title || 'Unknown Threat'}</td>
            <td>${t.attack_type || 'N/A'}</td>
            <td>${t.country || 'N/A'}</td>
            <td><span class="sev-badge ${sevClass}">${sevLabel}</span></td>
        `;
        tbody.appendChild(row);
    });
}