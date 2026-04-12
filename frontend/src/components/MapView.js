import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Home } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapView = ({ listings, onMarkerClick }) => {
  const getCoordinates = (address) => {
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('springfield')) {
      return [39.7817 + (Math.random() - 0.5) * 0.02, -89.6501 + (Math.random() - 0.5) * 0.02];
    }
    if (addressLower.includes('main') || addressLower.includes('test')) {
      return [40.7128 + (Math.random() - 0.5) * 0.02, -74.0060 + (Math.random() - 0.5) * 0.02];
    }
    
    return [40.7128, -74.0060];
  };

  const center = listings.length > 0 ? getCoordinates(listings[0].address) : [40.7128, -74.0060];

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-[#e5e7eb]" data-testid="map-view">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {listings.map((listing) => {
          const position = getCoordinates(listing.address);
          return (
            <Marker key={listing.id} position={position}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-[#111827] mb-1">{listing.title}</h3>
                  <p className="text-sm text-[#4b5563] mb-2">{listing.address}</p>
                  <button
                    onClick={() => onMarkerClick(listing.id)}
                    className="text-[#e51636] text-sm font-medium hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
