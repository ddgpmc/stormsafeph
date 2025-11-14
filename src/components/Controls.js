import React from "react";

function Controls({ userLatLng, evacCenters, showModal, toggleLegend }) {
  const findNearestCenter = () => {
    // Logic from your old JS function
  };

  return (
    <div id="controls">
      <button onClick={findNearestCenter} disabled={!userLatLng || evacCenters.length === 0}>
        Find Nearest Evacuation Center
      </button>
      <button onClick={toggleLegend}>Show/Hide Hazard Layers</button>
      <button onClick={showModal}>Emergency Numbers</button>
    </div>
  );
}

export default Controls;
