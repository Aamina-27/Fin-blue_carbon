import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Leaf, Droplets } from "lucide-react";

// Leaflet imports
declare global {
  interface Window {
    L: any;
  }
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Get all projects
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
  });

  const projects = (projectsData as any)?.projects || [];
  const verifiedProjects = projects.filter((p: any) => p.status === "verified");
  const gisVerifiedProjects = projects.filter((p: any) => p.gisVerificationStatus === "verified");
  const totalCredits = verifiedProjects.reduce((sum: number, p: any) => sum + parseFloat(p.carbonCredits || "0"), 0);
  const totalArea = verifiedProjects.reduce((sum: number, p: any) => sum + parseFloat(p.areaHectares || "0"), 0);
  const gisVerifiedArea = gisVerifiedProjects.reduce((sum: number, p: any) => sum + parseFloat(p.areaHectares || "0"), 0);

  useEffect(() => {
    // Load Leaflet CSS and JS
    const loadLeaflet = async () => {
      if (window.L) {
        initializeMap();
        return;
      }

      // Load CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        setMapLoaded(true);
        initializeMap();
      };
      document.head.appendChild(script);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && projects.length > 0) {
      addProjectMarkers();
    }
  }, [mapLoaded, projects]);

  const initializeMap = () => {
    if (!mapRef.current || !window.L) return;

    // Remove existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Initialize map
    mapInstanceRef.current = window.L.map(mapRef.current).setView([0, 0], 2);

    // Add OpenStreetMap tiles
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);
  };

  const addProjectMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;

    projects.forEach((project: any) => {
      const lat = parseFloat(project.latitude);
      const lng = parseFloat(project.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      // Determine marker color based on status and GIS verification
      let color = '#009688'; // Default teal
      let strokeColor = '#004d40';
      
      if (project.status === 'verified') {
        color = project.gisVerificationStatus === 'verified' ? '#2E7D32' : '#4CAF50';
        strokeColor = '#1B5E20';
      } else if (project.status === 'pending') {
        color = '#f44336';
        strokeColor = '#c62828';
      } else if (project.status === 'rejected') {
        color = '#9E9E9E';
        strokeColor = '#424242';
      }

      // Add satellite icon for GIS verified projects
      const isGisVerified = project.gisVerificationStatus === 'verified';
      const markerRadius = isGisVerified ? 10 : 8;

      const marker = window.L.circleMarker([lat, lng], {
        color: strokeColor,
        fillColor: color,
        fillOpacity: 0.8,
        radius: markerRadius,
        weight: isGisVerified ? 3 : 2
      }).addTo(mapInstanceRef.current);

      // Enhanced popup content with GIS information
      const gisStatus = project.gisVerificationStatus || 'pending';
      const gisConfidence = project.gisConfidenceScore ? (parseFloat(project.gisConfidenceScore) * 100).toFixed(0) : 'N/A';
      
      const gisIcon = isGisVerified ? '🛰️' : gisStatus === 'failed' ? '⚠️' : '⏳';
      const gisColor = isGisVerified ? 'text-green-600' : gisStatus === 'failed' ? 'text-red-600' : 'text-yellow-600';

      const popupContent = `
        <div class="p-3 min-w-[250px]">
          <h3 class="font-semibold text-sm mb-2">${project.name}</h3>
          
          <div class="space-y-1">
            <p class="text-xs text-gray-600">
              <span class="font-medium">Status:</span> 
              <span class="capitalize">${project.status}</span>
            </p>
            
            <p class="text-xs ${gisColor}">
              <span class="font-medium">GIS Verified:</span> 
              ${gisIcon} <span class="capitalize">${gisStatus}</span>
              ${isGisVerified ? ` (${gisConfidence}% confidence)` : ''}
            </p>
            
            <p class="text-xs text-gray-600">
              <span class="font-medium">Area:</span> ${project.areaHectares} ha
            </p>
            
            <p class="text-xs text-gray-600">
              <span class="font-medium">Type:</span> ${project.projectType}
            </p>
            
            ${parseFloat(project.carbonCredits || "0") > 0 ? `
              <p class="text-xs text-green-600 mt-2">
                <span class="font-medium">Credits:</span> ${parseFloat(project.carbonCredits).toFixed(0)} BC
              </p>
            ` : ''}
            
            ${isGisVerified ? `
              <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="text-xs text-blue-600 font-medium">Satellite Verified ✓</p>
                <p class="text-xs text-gray-500">Verified using Sentinel imagery</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });
  };

  return (
    <div className="py-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Global Blue Carbon Projects</h1>
          <p className="text-muted-foreground mb-6">Explore verified blue carbon restoration projects worldwide</p>
          
          {/* Map Legend */}
          <div className="flex flex-wrap gap-4 mb-6" data-testid="map-legend">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Verified Projects</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-sm text-muted-foreground">Pending Review</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">Active Restoration</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <Card className="overflow-hidden mb-8" data-testid="map-container">
          <div 
            ref={mapRef} 
            className="leaflet-container"
            style={{ height: "400px", width: "100%" }}
          />
        </Card>

        {/* Project Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card data-testid="stat-global-projects">
            <CardContent className="p-6 text-center">
              <Globe className="mx-auto text-primary text-3xl mb-4" />
              <h3 className="text-2xl font-bold mb-2">{projects.length}</h3>
              <p className="text-muted-foreground">Active Projects</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-global-credits">
            <CardContent className="p-6 text-center">
              <Leaf className="mx-auto text-secondary text-3xl mb-4" />
              <h3 className="text-2xl font-bold mb-2">{totalCredits.toFixed(0)}</h3>
              <p className="text-muted-foreground">Carbon Credits Issued</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-global-area">
            <CardContent className="p-6 text-center">
              <Droplets className="mx-auto text-primary text-3xl mb-4" />
              <h3 className="text-2xl font-bold mb-2">{totalArea.toFixed(0)}</h3>
              <p className="text-muted-foreground">Hectares Restored</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
