// Initialisation de la carte
var map = L.map('map');

// Centrer la carte sur la position de l'utilisateur
navigator.geolocation.getCurrentPosition(function(position) {
    map.setView([position.coords.latitude, position.coords.longitude], 13);
}, function() {
    // Si l'utilisateur refuse la géolocalisation, centrer sur Paris
    map.setView([48.8566, 2.3522], 13);
});

// Ajout du fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ajout des marqueurs
let markers = {};

function updateMarkers() {
    // Supprimer tous les marqueurs
    for (const category in markers) {
        markers[category].forEach(marker => {
            map.removeLayer(marker);
        });
    }

    // Obtenir les catégories sélectionnées
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(input => input.value);

    // Afficher les marqueurs pour les catégories sélectionnées
    businesses.forEach(business => {
        if (selectedCategories.length === 0 || selectedCategories.includes(business.category)) {
            if (!markers[business.category]) {
                markers[business.category] = [];
            }
            const marker = L.marker([business.lat, business.lng]).addTo(map)
                .bindPopup(`${business.name}<br><a href="booking.html?business=${business.name}">Réserver</a>`);
            markers[business.category].push(marker);
        }
    });
}
 
let businesses = [];

fetch('/api/businesses')
    .then(response => response.json())
    .then(data => {
        businesses = data.data;
        updateMarkers();
    });

// Mettre à jour les marqueurs lorsque les filtres changent
document.querySelectorAll('input[name="category"]').forEach(input => {
    input.addEventListener('change', updateMarkers);
});

// Afficher tous les marqueurs au début
updateMarkers();
