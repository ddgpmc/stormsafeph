import React, { useState, useEffect, useCallback } from 'react';
import { metromanila } from './data/metromanila';
import EvacMap from './components/EvacMap'; 
import './App.css'; // For the CSS styles
// Import the QR code image
import GcashQrCode from './qrph.jpg'; 


// ---------------------------------------------------
// Emergency Modal Component
// ---------------------------------------------------
const EmergencyModal = ({ isOpen, onClose, children }) => { // Added 'children' prop
    if (!isOpen) return null;

    return (
        <div id="emergencyModal" style={{ display: 'flex' }} onClick={e => {
            // Check if the click is directly on the dark background overlay (id="emergencyModal")
            if (e.target.id === 'emergencyModal') {
                onClose();
            }
        }}>
            <div className="modal-content">
                {children}
            </div>
        </div>
    );
};

// ---------------------------------------------------
// Emergency Hotlines Content
// ---------------------------------------------------
const HotlinesContent = ({ onClose }) => (
    <>
        <p style={{ fontSize: '14px', color: '#555', marginBottom: '12px', textAlign: 'center' }}>
            This is just a reference, some cities dataset are outdated. 
            <a href="https://www.abs-cbn.com/news/nation/2025/11/9/list-emergency-hotlines-for-rescue-and-assistance-2035" target="_blank" rel="noopener noreferrer">Click here for hotlines</a>
        </p>

        <h2>Emergency Numbers</h2>

        <div className="emergency-grid">
            {/* Card 1 */}
            <div className="emergency-card">
                <h3>National Emergency Hotline</h3>
                <p><strong>911</strong> (SMART, TNT, SUN)</p>
                <p><strong>0932 537 7770</strong></p>
                <p><strong>0917 839 9896</strong></p>
            </div>

            {/* Card 2 */}
            <div className="emergency-card">
                <h3>Philippine Coast Guard</h3>
                <p>Hotline: (02) 8527-8481 to 89 | (02) 8527-3877</p>
                <p>Facebook: <a href="https://facebook.com/coastguardph" target="_blank" rel="noopener noreferrer">facebook.com/coastguardph</a></p>
                <p>Twitter: <a href="https://twitter.com/coastguardph" target="_blank" rel="noopener noreferrer">@coastguardph</a></p>
            </div>

            {/* Card 3 */}
            <div className="emergency-card">
                <h3>PAGASA</h3>
                <p>Trunk Line Number: (02) 8284-0800</p>
                <p>Facebook: <a href="https://facebook.com/PAGASA.DOST.GOV.PH" target="_blank" rel="noopener noreferrer">fb.com/PAGASA.DOST.GOV.PH</a></p>
                <p>Twitter: <a href="https://twitter.com/dost_pagasa" target="_blank" rel="noopener noreferrer">@dost_pagasa</a></p>
            </div>
        </div>

        <div style={{ textAlign: 'center' }}>
            <button id="closeEmergencyModal" onClick={onClose}>Close</button>
        </div>
    </>
);

// ---------------------------------------------------
// Support QR Code Content
// ---------------------------------------------------
const SupportContent = ({ onClose }) => (
    <>
        <h2 style={{ textAlign: 'center' }}>Support My Initiative</h2>
        <p style={{ textAlign: 'center', margin: '15px 0' }}>Scan the QR code below to contribute via GCASH. Thank you!</p>
        <div style={{ textAlign: 'center', padding: '10px' }}>
            <img 
                src={GcashQrCode} 
                alt="GCASH QR Code" 
                style={{ width: '100%', maxWidth: '300px', height: 'auto', border: '1px solid #ddd' }}
            />
        </div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button id="closeSupportModal" onClick={onClose}>Close</button>
        </div>
    </>
);


// Utility function to determine the LatLng for GeoJSON features
// NOTE: These utility functions are included for completeness but remain unchanged.
function getFeatureLatLng(feature) {
    if (!feature.geometry) return null;
    const coords = feature.geometry.coordinates;

    if (feature.geometry.type === "Point") return { lat: coords[1], lng: coords[0] };

    // Calculate centroid for Polygon/MultiPolygon
    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        let latSum = 0, lngSum = 0, count = 0;
        const ring = feature.geometry.type === "Polygon" ? coords[0] : coords[0][0];
        ring.forEach(c => { lngSum += c[0]; latSum += c[1]; count++; });
        
        return { lat: latSum / count, lng: lngSum / count }; 
    }
    return null;
}

// Utility function to load GeoJSON data
async function loadGeoJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const geojson = await res.json();

        const centers = geojson.features.map(f => {
            const latlng = getFeatureLatLng(f);
            if (!latlng) return null;
            return { 
                name: f.properties.name || "Evacuation Center", 
                lat: latlng.lat, 
                lng: latlng.lng 
            };
        }).filter(c => c !== null);

        return centers;
    } catch(err) {
        console.error("Failed to load GeoJSON:", err);
        return [];
    }
}
// ---------------------------------------------------
// Main Application Component
// ---------------------------------------------------
function App() {
    const [userLocation, setUserLocation] = useState(null); 
    const [evacCenters, setEvacCenters] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [triggerRoute, setTriggerRoute] = useState(false);
    const [modalState, setModalState] = useState({ 
        isOpen: false, 
        content: null 
    });
    
    // Function to handle map and data initialization
    const initData = useCallback(async () => {
        setIsLoading(true);
        
        const GEOJSON_URL = 'https://raw.githubusercontent.com/ddgpmc/tinoph/refs/heads/main/ph_evacs_cleaned.geojson';
        
        const centersFromGeoJSON = await loadGeoJSON(GEOJSON_URL);
        const localManilaCenters = metromanila; 
        
        const allCenters = [...localManilaCenters, ...centersFromGeoJSON];
        setEvacCenters(allCenters);
        console.log("Total centers loaded (Combined):", allCenters.length);

        setIsLoading(false);
    }, []);

    // Load data on component mount
    useEffect(() => {
        initData();
    }, [initData]);

    const handleOpenModal = (content) => {
        setModalState({ isOpen: true, content });
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, content: null });
    };

    // --- Button Logic ---
    let buttonText = "Loading Map & Data...";
    let buttonDisabled = true;

    if (!isLoading && evacCenters.length > 0) {
        buttonDisabled = false;
        if (userLocation) {
            buttonText = "Find the Nearest Evacuation Center";
        } else {
            buttonText = "Find Nearest (Waiting for Location...)";
        }
    } else if (!isLoading && evacCenters.length === 0) {
        buttonText = "Error Loading Evacuation Data";
        buttonDisabled = true;
    }
    // ------------------------------------

    return (
        <>
            <EvacMap 
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                evacCenters={evacCenters}
                triggerRoute={triggerRoute}
                setTriggerRoute={setTriggerRoute}
            />
            
            <div id="controls">
                <button 
                    id="findNearestBtn" 
                    disabled={buttonDisabled} 
                    onClick={() => {
                        if (!userLocation) {
                            alert("Location not found. Please ensure location services are enabled for your browser/device.");
                        } else if (evacCenters.length === 0) {
                             alert("Cannot find centers. Data failed to load.");
                        } else {
                            console.log("Triggering route calculation...");
                            setTriggerRoute(true); 
                        }
                    }}
                >
                    {buttonText}
                </button>
                <button 
                    id="showEmergencyBtn" 
                    onClick={() => handleOpenModal('hotlines')}
                >
                    Emergency Numbers
                </button>
                {/* REMOVED: The dedicated "Support My Initiative" button */}
            </div>
            
            <EmergencyModal 
                isOpen={modalState.isOpen} 
                onClose={handleCloseModal} 
            >
                {modalState.content === 'hotlines' && <HotlinesContent onClose={handleCloseModal} />}
                {modalState.content === 'support' && <SupportContent onClose={handleCloseModal} />}
            </EmergencyModal>

            {/* 👇 UPDATED FOOTER ELEMENT */}
            <div id="app-footer">
                <span>© Divine Cabigting 2025</span>
                <span style={{ margin: '0 10px' }}>||</span>
                {/* Use an anchor tag or button-like span to trigger the modal */}
                <span 
                    onClick={() => handleOpenModal('support')} 
                    style={{ cursor: 'pointer', color: '#4CAF50', fontWeight: 'bold' }}
                >
                    Support my initiative
                </span>
            </div>
            {/* 👆 UPDATED FOOTER ELEMENT */}
        </>
    );
}

export default App;