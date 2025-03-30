document.addEventListener("DOMContentLoaded", function() {
    let map;
    const cityCoords = {
        "Nairobi": [-1.286389, 36.817223],
        "Karen": [-1.363333, 36.750000],
        "JKIA": [-1.319167, 36.927222],
        "Embu": [-0.536389, 37.453333],
        "Mombasa": [-4.050000, 39.666667],
        "Kisumu": [-0.091111, 34.768333],
        "Dar es Salaam": [-6.792354, 39.208328],
        "Juja": [-1.10663 , 37.01523],
        "Addis Ababa": [8.9806, 38.7578],
        "Arusha": [-3.3869, 36.6820],
        "Kigali": [-1.9441, 30.0619]
    };

    fetch("db.json")
        .then(response => response.json())
        .then(data => {
            const busData = data.buses;
            const citySet = new Set();
            busData.forEach(bus => {
                citySet.add(bus.departure);
                citySet.add(bus.arrival);
            });
            const cities = Array.from(citySet);


            function getFilteredCities(query) {
                query = query.trim().toLowerCase();
                if(query.length === 1) {
                    if(query === "n") {
                        return cities.filter(city => {
                            const first = city.charAt(0).toLowerCase();
                            return first === "n" || first === "a";
                        });
                    } else if(query === "a") {
                        return cities.filter(city => city.charAt(0).toLowerCase() === "a");
                    } else if(query === "m") {
                        return cities.filter(city => city.charAt(0).toLowerCase() === "m");
                    } else {
                        return cities.filter(city => city.toLowerCase().startsWith(query));
                    }
                } else if(query.length > 1) {
                    return cities.filter(city => city.toLowerCase().startsWith(query));
                } else {
                    return [];
                }
            }

            function showSuggestions(inputElement, suggestionElement) {
                const query = inputElement.value;
                const filtered = getFilteredCities(query);
                suggestionElement.innerHTML = "";
                if(filtered.length > 0) {
                    filtered.forEach(city => {
                        const div = document.createElement("div");
                        div.classList.add("dropdown-item");
                        div.textContent = city;
                        div.addEventListener("click", () => {
                            inputElement.value = city;
                            suggestionElement.style.display = "none";
                        });
                        suggestionElement.appendChild(div);
                    });
                    suggestionElement.style.display = "block";
                } else {
                    suggestionElement.style.display = "none";
                }
            }

            const departureInput = document.getElementById("departure");
            const destinationInput = document.getElementById("destination");
            const departureSuggestions = document.getElementById("departure-suggestions");
            const destinationSuggestions = document.getElementById("destination-suggestions");

            departureInput.addEventListener("input", () => {
                showSuggestions(departureInput, departureSuggestions);
            });
            destinationInput.addEventListener("input", () => {
                showSuggestions(destinationInput, destinationSuggestions);
            });

            const form = document.getElementById("booking-form");
            const busList = document.getElementById("bus-list");

            form.addEventListener("submit", function(e) {
                e.preventDefault();
                const dep = departureInput.value.trim();
                const dest = destinationInput.value.trim();
                const filteredBuses = busData.filter(bus => bus.departure === dep && bus.arrival === dest);
                busList.innerHTML = "";
                if(filteredBuses.length === 0) {
                    busList.innerHTML = "<tr><td colspan='7'>No buses found</td></tr>";
                } else {
                    filteredBuses.forEach(bus => {
                        const row = document.createElement("tr");

                        row.innerHTML = `<td>${bus.plateNumber}</td>
                                         <td>${bus.departure} - ${bus.arrival}</td>
                                         <td>${bus.routeType}</td>
                                         <td>${bus.price}</td>
                                         <td>${bus.time}</td>
                                         <td><button class="btn btn-success btn-sm book-btn" data-bus='${JSON.stringify(bus)}'>Book Now</button></td>`;
                        busList.appendChild(row);
                    });
                }
                updateMap(dep, dest);
            });

            function updateMap(depCity, destCity) {
                if(cityCoords[depCity] && cityCoords[destCity]) {
                    if(!map) {
                        map = L.map('map').setView(cityCoords[depCity], 8);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; OpenStreetMap contributors'
                        }).addTo(map);
                    }
                    if(map.markersLayer) {
                        map.removeLayer(map.markersLayer);
                    }
                    map.markersLayer = L.layerGroup().addTo(map);
                    L.marker(cityCoords[depCity]).bindPopup(depCity).addTo(map.markersLayer);
                    L.marker(cityCoords[destCity]).bindPopup(destCity).addTo(map.markersLayer);
                    const routeLine = L.polyline([cityCoords[depCity], cityCoords[destCity]], {color: 'blue'}).addTo(map.markersLayer);
                    map.fitBounds(routeLine.getBounds(), {padding: [50, 50]});
                } else {
                    console.warn("Coordinates not available for one or both cities:", depCity, destCity);
                }
            }
        })
        .catch(error => {
            console.error("Error loading bus data:", error);
        });

    const bookingDetails = document.getElementById("booking-details");
    const selectedBusInfo = document.getElementById("selected-bus-info");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const passengersInput = document.getElementById("passengers");
    const totalPriceInput = document.getElementById("total-price");
    const errorMessage = document.getElementById("error-message");
    const confirmBtn = document.getElementById("confirm-booking");
    let baseFare = 0;

    document.getElementById("bus-list").addEventListener("click", function(e) {
        if (e.target && e.target.classList.contains("book-btn")) {
            const bus = JSON.parse(e.target.getAttribute("data-bus"));
            openBookingForm(bus);
        }
    });

    function openBookingForm(bus) {

        selectedBusInfo.textContent = `Booking for bus ${bus.plateNumber} from ${bus.departure} to ${bus.arrival} at ${bus.time}. Fare per passenger: ${bus.price}.`;
        baseFare = parseFloat(bus.price);

        phoneInput.value = "";
        emailInput.value = "";
        passengersInput.value = 1;
        updateTotalPrice();
        errorMessage.textContent = "";
        errorMessage.style.display = "none";

        bookingDetails.style.display = "block";
    }


    function updateTotalPrice() {
        const numPassengers = parseInt(passengersInput.value) || 1;
        const total = baseFare * numPassengers;
        totalPriceInput.value = `${total} KES`;
    }


    passengersInput.addEventListener("input", updateTotalPrice);


    confirmBtn.addEventListener("click", function(e) {
        e.preventDefault();

        if (phoneInput.value.trim() === "" || emailInput.value.trim() === "") {
            errorMessage.textContent = "Please input credentials (phone and email).";
            errorMessage.style.display = "block";
            errorMessage.style.color = "red";
            return;
        }
        
        window.location.href = "https://www.paypal.com";
    });
});
