import React, { useRef, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'; 
import L from 'leaflet';
import 'leaflet-routing-machine'; 
import 'leaflet/dist/leaflet.css'; 

// --- Marker Clustering Imports ---
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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

// ---------------------------------------------------
// IndexedDB Helper Functions for Tile Caching
// ---------------------------------------------------
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MapTilesDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('tiles')) {
                db.createObjectStore('tiles', { keyPath: 'key' });
            }
        };
    });
};

const saveTileToCache = async (db, key, blob) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tiles'], 'readwrite');
        const store = transaction.objectStore('tiles');
        const request = store.put({ key, blob, timestamp: Date.now() });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const getTileCoords = (bounds, zoom) => {
    const tiles = [];
    const tileSize = 256;
    
    const min = L.CRS.EPSG3857.latLngToPoint(bounds.getSouthWest(), zoom).divideBy(tileSize).floor();
    const max = L.CRS.EPSG3857.latLngToPoint(bounds.getNorthEast(), zoom).divideBy(tileSize).floor();
    
    for (let x = min.x; x <= max.x; x++) {
        for (let y = min.y; y <= max.y; y++) {
            tiles.push({ x, y, z: zoom });
        }
    }
    
    return tiles;
};

// ===================================================
// Offline Tile Layer Component with Cache Support
// ===================================================
const OfflineTileLayer = () => {
    const map = useMap();
    const tileLayerRef = useRef(null);
    const dbRef = useRef(null);

    useEffect(() => {
        // Open IndexedDB
        const initDB = async () => {
            try {
                dbRef.current = await openDB();
            } catch (err) {
                console.warn("IndexedDB not available:", err);
            }
        };
        initDB();

        // Create custom tile layer with cache fallback
        const CustomTileLayer = L.TileLayer.extend({
            createTile: function(coords, done) {
                const tile = document.createElement('img');
                const key = `${coords.z}_${coords.x}_${coords.y}`;
                
                // Try to load from cache first
                if (dbRef.current) {
                    const transaction = dbRef.current.transaction(['tiles'], 'readonly');
                    const store = transaction.objectStore('tiles');
                    const request = store.get(key);
                    
                    request.onsuccess = () => {
                        if (request.result && request.result.blob) {
                            // Load from cache
                            const url = URL.createObjectURL(request.result.blob);
                            tile.src = url;
                            tile.onload = () => {
                                URL.revokeObjectURL(url);
                                done(null, tile);
                            };
                        } else {
                            // Not in cache, load from network
                            this._loadFromNetwork(tile, coords, done);
                        }
                    };
                    
                    request.onerror = () => {
                        // Cache failed, load from network
                        this._loadFromNetwork(tile, coords, done);
                    };
                } else {
                    // No DB, load from network
                    this._loadFromNetwork(tile, coords, done);
                }
                
                return tile;
            },
            
            _loadFromNetwork: function(tile, coords, done) {
                const s = ['a', 'b', 'c'][(coords.x + coords.y) % 3];
                const url = `https://${s}.tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
                
                tile.src = url;
                tile.onload = () => done(null, tile);
                tile.onerror = () => done(new Error('Tile load error'), tile);
            }
        });

        const tileLayer = new CustomTileLayer(TILE_URL, {
            maxZoom: 19,
            attribution: '© <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        });

        tileLayer.addTo(map);
        tileLayerRef.current = tileLayer;

        return () => {
            if (tileLayerRef.current) {
                map.removeLayer(tileLayerRef.current);
            }
        };
    }, [map]);

    return null;
};

// ---------------------------------------------------
// Tile Cache Control Component
// ---------------------------------------------------
const TileCacheControl = () => {
    const map = useMap();
    const [isCaching, setIsCaching] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    
    const startCaching = async () => {
        const bounds = map.getBounds();
        const minZoom = 13; // Reduced range for faster caching
        const maxZoom = 15;

        setIsCaching(true);
        console.log(`Starting cache from zoom ${minZoom} to ${maxZoom}...`);

        try {
            const db = await openDB();
            const allTiles = [];
            
            // Collect all tile coordinates for all zoom levels
            for (let z = minZoom; z <= maxZoom; z++) {
                const tiles = getTileCoords(bounds, z);
                allTiles.push(...tiles);
            }
            
            setProgress({ current: 0, total: allTiles.length });
            console.log(`Total tiles to download: ${allTiles.length}`);
            
            let downloaded = 0;
            const batchSize = 5; // Download 5 tiles at a time
            
            // Process tiles in batches
            for (let i = 0; i < allTiles.length; i += batchSize) {
                const batch = allTiles.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (tile) => {
                    try {
                        // Generate tile URL
                        const s = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
                        const url = `https://${s}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
                        const key = `${tile.z}_${tile.x}_${tile.y}`;
                        
                        // Fetch tile
                        const response = await fetch(url);
                        if (response.ok) {
                            const blob = await response.blob();
                            await saveTileToCache(db, key, blob);
                        }
                        
                        downloaded++;
                        setProgress({ current: downloaded, total: allTiles.length });
                    } catch (err) {
                        console.warn(`Failed to cache tile ${tile.z}/${tile.x}/${tile.y}:`, err);
                    }
                }));
                
                // Small delay between batches to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            setIsCaching(false);
            alert(`Successfully cached ${downloaded} tiles for offline use! ✓`);
            
        } catch (error) {
            setIsCaching(false);
            console.error("Caching Error:", error);
            alert("Error caching tiles. Please check console for details.");
        }
    };

    return (
        <div id="cache-control">
            <button 
                onClick={startCaching}
                disabled={isCaching}
                style={{ 
                    position: 'absolute', 
                    bottom: '10px', 
                    left: '10px', 
                    zIndex: 1000, 
                    padding: '8px 12px', 
                    backgroundColor: isCaching ? '#95a5a6' : '#3498db', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: isCaching ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                {isCaching 
                    ? `Caching... ${progress.current}/${progress.total}` 
                    : "📥 Cache Map for Offline"}
            </button>
        </div>
    );
};

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
// Routing Machine Component
// ---------------------------------------------------
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

        // Find Nearest Center
        let nearest = evacCenters[0];
        let minDist = L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(nearest.lat, nearest.lng));

        evacCenters.forEach(c => {
            const dist = L.latLng(userLocation.lat, userLocation.lng).distanceTo(L.latLng(c.lat, c.lng));
            if(dist < minDist) { minDist = dist; nearest = c; }
        });
        
        // Initialize route control 
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

// ---------------------------------------------------
// Location Marker Component
// ---------------------------------------------------
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

// ---------------------------------------------------
// Main Evacuation Map Component
// ---------------------------------------------------
const EvacMap = ({ userLocation, setUserLocation, evacCenters, triggerRoute, setTriggerRoute }) => {
    const initialPosition = [14.6500, 120.9800]; 

    return (
        <MapContainer 
            id="map" 
            center={initialPosition} 
            zoom={12} 
            scrollWheelZoom={true}
        >
            {/* 1. Offline-capable Tile Layer */}
            <OfflineTileLayer />
            
            {/* 2. User Location Marker */}
            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* 3. Clustered Evacuation Center Markers */}
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

            {/* 6. Offline Cache Control Button */}
            <TileCacheControl />

        </MapContainer>
    );
};

export default EvacMap;