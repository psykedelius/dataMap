// Initialisation de la carte
var map = L.map('map');

// Centrer la carte sur la position de l'utilisateur
if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
        map.setView([position.coords.latitude, position.coords.longitude], 13);
    }, () => {
        // Fallback sur Paris si l'utilisateur refuse la géolocalisation
        map.setView([48.8566, 2.3522], 13);
    });
} else {
    // Fallback sur Paris si le navigateur ne supporte pas la géolocalisation
    map.setView([48.8566, 2.3522], 13);
}

// Ajout du fond de carte OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- Gestion de la modale ---
const modal = document.getElementById('business-modal');
const closeButton = document.querySelector('.close-button');
const modalBusinessName = document.getElementById('modal-business-name');
const modalBusinessCategory = document.getElementById('modal-business-category');
const modalBusinessDescription = document.getElementById('modal-business-description');
const modalSlotsCalendar = document.getElementById('modal-slots-calendar');

const categoryIdMap = { 1: 'Escape Game', 2: 'Bar à jeux', 3: 'Laser Game' };
const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

closeButton.onclick = function() {
    modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function openModal(business) {
    modalBusinessName.textContent = business.name;
    modalBusinessCategory.textContent = categoryIdMap[business.category_id] || 'Non définie';
    modalBusinessDescription.textContent = business.description || '';

    modalSlotsCalendar.innerHTML = 'Chargement des créneaux...';
    fetch(`/api/businesses/${business.id}/slots`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
            modalSlotsCalendar.innerHTML = ''; // Clear
            if (data.data && data.data.length > 0) {
                const list = document.createElement('ul');
                list.style.listStyleType = 'none';
                list.style.padding = '0';
                data.data.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)).forEach(slot => {
                    const item = document.createElement('li');
                    item.textContent = `${daysOfWeek[slot.day_of_week]} à ${slot.start_time} (${slot.max_clients} places)`;
                    list.appendChild(item);
                });
                modalSlotsCalendar.appendChild(list);
            } else {
                modalSlotsCalendar.textContent = 'Aucun créneau disponible pour le moment.';
            }
        });

    modal.style.display = "block";
}
// --- Fin de la gestion de la modale ---

let businesses = [];
let markers = {};

function updateMarkers() {
    // Supprimer tous les marqueurs
    for (const category in markers) {
        markers[category].forEach(marker => {
            map.removeLayer(marker);
        });
    }

    const categoryMap = { 'escape-game': 1, 'bar-jeux': 2, 'laser-game': 3 };

    // Obtenir les catégories sélectionnées
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
        .map(input => categoryMap[input.value]);

    // Afficher les marqueurs pour les catégories sélectionnées
    businesses.forEach(business => {
        if (selectedCategories.length === 0 || selectedCategories.includes(business.category_id)) {
            if (!markers[business.category_id]) {
                markers[business.category_id] = [];
            }
            const marker = L.marker([business.lat, business.lng]).addTo(map);
            marker.on('click', () => openModal(business)); // Ouvre la modale au clic
            markers[business.category_id].push(marker);
        }
    });
}

// Charger les entreprises
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
