import React, { useRef, useEffect, useState } from 'react';
// Removed 'withLeaflet' from the import list
import { MapContainer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet.offline'; // Correctly installed offline plugin
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

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// ===================================================
// FIXED: Offline Tile Layer Component (Imperative approach)
// ===================================================
const OfflineTileLayer = () => {
    const map = useMap(); // Get map instance using hook
    const tileLayerRef = useRef(null);

    useEffect(() => {
        // 1. Create the offline layer instance
        const offlineLayer = L.tileLayer.offline(TILE_URL, {
            maxZoom: 19,
            attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        });

        // 2. Add it to the map
        offlineLayer.addTo(map);
        tileLayerRef.current = offlineLayer;

        // Cleanup function
        return () => {
            if (tileLayerRef.current) {
                map.removeLayer(tileLayerRef.current);
            }
        };
    }, [map]);

    return null;
};
// ===================================================


// ---------------------------------------------------
// NEW: Component for Offline Tile Cache Control
// ---------------------------------------------------
const TileCacheControl = () => {
    const map = useMap();
    const [isCaching, setIsCaching] = useState(false);
    // Use a memoized function for the factory to avoid re-creating the layer on every render
    const [cacheLayerRef] = useState(() => L.tileLayer.offline(TILE_URL));
    
    // Function to start caching
    const startCaching = () => {
        const bounds = map.getBounds();
        const minZoom = 12; // Focus on a reasonable local area
        const maxZoom = 15; // Max detail level to download

        setIsCaching(true);
        console.log(`Starting cache from zoom ${minZoom} to ${maxZoom}...`);

        // Start the download process using the offline layer factory
        cacheLayerRef.download(bounds, minZoom, maxZoom)
            .on('success', () => {
                setIsCaching(false);
                alert(`Map tiles successfully cached for the visible area (Zoom ${minZoom}-${maxZoom})!`);
            })
            .on('error', (err) => {
                setIsCaching(false);
                console.error("Caching Error:", err);
                alert("Error caching tiles. Check console.");
            });
    };

    return (
        // Placing the button inside a div here with absolute positioning.
        <div id="cache-control">
            <button 
                onClick={startCaching}
                disabled={isCaching}
                // Style for quick visibility and interaction
                style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                {isCaching ? "Downloading Tiles..." : "Download Map Tiles for Offline ⬇️"}
            </button>
        </div>
    );
};
// ---------------------------------------------------


// ---------------------------------------------------
// Component for Clustered Markers 
// ---------------------------------------------------
const ClusteredMarkers = ({ evacCenters }) => {
    const map = useMap();
    const clusterGroupRef = useRef(L.markerClusterGroup());

    useEffect(() => {
        const clusterGroup = clusterGroupRef.current;
        
        clusterGroup.clearLayers();

        const markers = evacCenters.map(center => {
            const marker = L.marker([center.lat, center.lng]);
            const popupHtml = `<h4>${center.name}</h4>`;
            marker.bindPopup(popupHtml);
            return marker;
        });

        clusterGroup.addLayers(markers);

        if (!map.hasLayer(clusterGroup)) {
            map.addLayer(clusterGroup);
        }

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

    useEffect(() => {
        const currentControl = routingControlRef.current;
        
        const cleanup = () => {
            if (currentControl) {
                map.removeControl(currentControl);
                routingControlRef.current = null;
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
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);

        routingControlRef.current = newControl;

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

        setTriggerRoute(false); 

        return cleanup;

    }, [triggerRoute, userLocation, evacCenters, map, setTriggerRoute]);

    return null;
};
// Custom hook/component to detect user location 
const LocationMarker = ({ setUserLocation }) => {
    const map = useMapEvents({
        locationfound(e) {
            setUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng }); 
            map.setView(e.latlng, map.getZoom());
        },
        locationerror(e) {
            console.error("Location error:", e.message);
            alert("Location not found. Navigation disabled.");
            setUserLocation(null);
        },
    });

    useEffect(() => {
        map.locate({ setView:true, maxZoom:16, enableHighAccuracy:true });
    }, [map]);
    
    return null;
};


const EvacMap = ({ userLocation, setUserLocation, evacCenters,
    triggerRoute, 
    setTriggerRoute 
}) => {
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
            {/* 1. Use the Offline Tile Layer Component */}
            <OfflineTileLayer />
            
            {/* 2. Marker for the User Location */}
            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* 3. Clustered Markers */}
            <ClusteredMarkers evacCenters={evacCenters} />
            
            {/* 4. Location Detection */}
            <LocationMarker setUserLocation={setUserLocation} />
            
            {/* 5. Routing Logic */}
            <RoutingMachine 
                userLocation={userLocation} 
                evacCenters={evacCenters}
                triggerRoute={triggerRoute} 
                setTriggerRoute={setTriggerRoute} 
            />

            {/* 6. The Cache Control Button */}
            <TileCacheControl />

        </MapContainer>
    );
};

export default EvacMap;