const COUNTRY_COORDINATES = {
    "Cameroon": [3.8480, 11.5021],
    "USA": [37.0902, -95.7129],
    "United States": [37.0902, -95.7129],
    "Germany": [51.1657, 10.4515],
    "China": [35.8617, 104.1954],
    "Nigeria": [9.0820, 8.6753],
    "Russia": [61.5240, 105.3188],
    "United Kingdom": [55.3781, -3.4360],
    "Brazil": [-14.2350, -51.9253],
    "Unknown": [20.0000, 0.0000]
};

function getCoordinates(countryName) {
    return COUNTRY_COORDINATES[countryName] || COUNTRY_COORDINATES["Unknown"];
}