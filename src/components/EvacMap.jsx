import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css'; 

// --- Marker Clustering Imports ---
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// ---------------------------------

// --- FIX: Leaflet Marker Icons ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});


// ---------------------------------------------------
// NEW: Component for Clustered Markers
// ---------------------------------------------------
const ClusteredMarkers = ({ evacCenters }) => {
    const map = useMap();
    const clusterGroupRef = useRef(L.markerClusterGroup());

    useEffect(() => {
        const clusterGroup = clusterGroupRef.current;
        
        // 1. Clear previous markers to prevent duplicates
        clusterGroup.clearLayers();

        const markers = evacCenters.map(center => {
            const marker = L.marker([center.lat, center.lng]);
            const popupHtml = `<h4>${center.name}</h4>`;
            marker.bindPopup(popupHtml);
            return marker;
        });

        // 2. Add all new markers to the cluster group
        clusterGroup.addLayers(markers);

        // 3. Add the cluster group to the map (if it's not already there)
        if (!map.hasLayer(clusterGroup)) {
            map.addLayer(clusterGroup);
        }

        // Cleanup function: remove the layer when the component unmounts or centers change
        return () => {
            map.removeLayer(clusterGroup);
        };
    }, [evacCenters, map]);

    return null;
};
// ---------------------------------------------------


// Custom hook/component to manage the routing machine and nearest center logic
const RoutingMachine = ({ userLocation, evacCenters, triggerRoute, setTriggerRoute }) => {
    const map = useMap();
    const routingControlRef = useRef(null);

    // ⚡️ ENSURE ALL DEPENDENCIES ARE PRESENT
    useEffect(() => {
        const currentControl = routingControlRef.current;
        
        const cleanup = () => {
            if (currentControl) {
                map.removeControl(currentControl);
                routingControlRef.current = null; // Clear ref on cleanup
            }
        };

        if (!triggerRoute || !userLocation || evacCenters.length === 0) {
            return cleanup;
        }

        // --- Find Nearest Center Logic (Unchanged) ---
        let nearest = evacCenters[0];
        let minDist = L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(nearest.lat, nearest.lng));

        evacCenters.forEach(c => {
            const dist = L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(c.lat, c.lng));
            if(dist < minDist) { minDist = dist; nearest = c; }
        });
        
        // Step 3: Initialize new route control 
        const newControl = L.Routing.control({
            waypoints: [ 
                L.latLng(userLocation.lat, userLocation.lng), 
                L.latLng(nearest.lat, nearest.lng) 
            ],
            routeWhileDragging: false,
            draggableWaypoints: false,
            addWaypoints: false,
            show: false,
            fitSelectedRoutes: true,
            // Use OSRM for routing, as you don't specify a key/service
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);

        // Step 4: Update the ref to the new control
        routingControlRef.current = newControl;

        // Corrected Google Maps Directions URL format
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${nearest.lat},${nearest.lng}&travelmode=driving`;
        
        const popupHtml = `
            <h4>${nearest.name} (Destination)</h4>
            <p>Distance: ${(minDist/1000).toFixed(2)} km</p>
            <a href="${mapsUrl}" target="_blank" class="nav-link" rel="noopener noreferrer">Start GPS Navigation 🚗</a>
        `;
        L.popup({ maxWidth: 250 })
            .setLatLng(L.latLng(nearest.lat, nearest.lng))
            .setContent(popupHtml)
            .openOn(map);

        // Reset the trigger state *after* running the logic
        setTriggerRoute(false); 

        // Step 5: Return the cleanup function.
        return cleanup;

    }, [triggerRoute, userLocation, evacCenters, map, setTriggerRoute]);

    return null;
};
// Custom hook/component to detect user location
const LocationMarker = ({ setUserLocation }) => {
    const map = useMapEvents({
        locationfound(e) {
            // Update state in App.js
            setUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng }); 
            map.setView(e.latlng, map.getZoom()); // Set map view
        },
        locationerror(e) {
            console.error("Location error:", e.message);
            alert("Location not found. Navigation disabled.");
            setUserLocation(null); // Explicitly set to null on error
        },
    });

    // Detect location on mount (similar to the original script)
    useEffect(() => {
        map.locate({ setView:true, maxZoom:16, enableHighAccuracy:true });
    }, [map]);
    
    return null; // This component is just for side effects (locating)
};


const EvacMap = ({ userLocation, setUserLocation, evacCenters,
    triggerRoute, // New prop
    setTriggerRoute // New prop
}) => {
    // Initial view set around Manila
    const initialPosition = [14.6500, 120.9800]; 

    return (
        <MapContainer 
            id="map" 
            center={initialPosition} 
            zoom={12} 
            scrollWheelZoom={true} 
            whenCreated={map => { 
                // Any imperative Leaflet code you need can go here
            }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
            />

            {/* Marker for the User Location */}
            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* 👇 REPLACED: Markers for Evacuation Centers are now clustered */}
            <ClusteredMarkers evacCenters={evacCenters} />
            {/* 👆 REPLACED: EvacCenters rendering */}

            {/* Component to trigger initial location detection */}
            <LocationMarker setUserLocation={setUserLocation} />
            
            {/* Component to handle Routing Logic */}
            <RoutingMachine 
                userLocation={userLocation} 
                evacCenters={evacCenters}
                triggerRoute={triggerRoute} 
                setTriggerRoute={setTriggerRoute} 
            />

        </MapContainer>
    );
};

export default EvacMap;