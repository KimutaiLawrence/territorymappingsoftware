import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { MapLayer } from '@/types'
import maplibregl from 'maplibre-gl'

export async function exportMapAsPDF(
    map: maplibregl.Map,
    layers: MapLayer[],
    title: string,
    layout: 'a4-portrait' | 'a4-landscape',
    includeLegend: boolean,
    includeScaleBar: boolean,
    includeNorthArrow: boolean,
) {
    // Use html2canvas exactly like the original implementation
    const mapElement = document.getElementById('map');
    console.log('Map element for export:', mapElement);
    console.log('Map element dimensions:', mapElement?.offsetWidth, 'x', mapElement?.offsetHeight);
    
    const canvas = await html2canvas(mapElement);
    console.log('Canvas created:', canvas);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('Canvas data URL length:', canvas.toDataURL('image/png').length);
    
    // Calculate required height for all content first
    const mapHeight = 200;
    const titleHeight = 30;
    const legendBoxHeight = 50; // matches the box definition
    const rowGap = 3; // matches the box definition
    const bottomBoxHeight = 35; // matches the box definition
    const totalContentHeight = 20 + titleHeight + mapHeight + legendBoxHeight + rowGap + bottomBoxHeight + 20; // margins + content
    
    // Use the imported jsPDF directly (not window.jspdf)
    const pdf = new jsPDF({
        orientation: layout === 'a4-landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: layout === 'a4-landscape' ? [420, totalContentHeight] : 'a4',
    });

    const page = { w: pdf.internal.pageSize.getWidth(), h: pdf.internal.pageSize.getHeight() };
    const margin = 15; // increased margin for better spacing
    const titleY = margin + 10;
    const subY = titleY + 6;
    const mapX = margin + 15; // center the map better
    const mapY = subY + 6;
    // Calculate map dimensions based on actual canvas to maintain aspect ratio
    const mapCanvas = document.getElementById('map');
    const canvasAspectRatio = mapCanvas.width / mapCanvas.height;
    const maxMapWidth = 380; // maximum width we want
    const maxMapHeight = 220; // maximum height we want
    
    let mapW, mapH;
    if (canvasAspectRatio > 1) {
        // Landscape canvas
        mapW = Math.min(maxMapWidth, 380);
        mapH = mapW / canvasAspectRatio;
    } else {
        // Portrait canvas
        mapH = Math.min(maxMapHeight, 220);
        mapW = mapH * canvasAspectRatio;
    }
    
    // Validate dimensions and provide fallbacks
    if (!mapW || !mapH || isNaN(mapW) || isNaN(mapH) || mapW <= 0 || mapH <= 0) {
        console.warn('Invalid map dimensions calculated, using fallback values');
        mapW = 340;
        mapH = 200;
    }
    
    const imgData = canvas.toDataURL('image/png');
    
    // Neatline (page frame) - extends to cover all content including boxes
    pdf.setDrawColor(50);
    pdf.setLineWidth(0.3);
    const neatlineHeight = mapY + mapH + legendBoxHeight + rowGap + bottomBoxHeight + 10;
    const neatlineWidth = mapW + 30;
    const neatlineX = (page.w - neatlineWidth) / 2;
    pdf.rect(neatlineX, margin, neatlineWidth, neatlineHeight - margin);

    // Title (small to save space)
    pdf.setFontSize(18);
    pdf.text('Territory Mapper Map', page.w / 2, titleY, { align: 'center' });
    pdf.setFontSize(9);
    const date = new Date().toLocaleString();
    pdf.text(`Generated: ${date}`, page.w / 2, subY, { align: 'center' });

    // Map image (unchanged placement/size)
    pdf.addImage(imgData, 'PNG', mapX, mapY, mapW, mapH);

    // Elements area below the map (centered with map)
    const areaTop = mapY + mapH + 4;
    const areaLeft = mapX;
    const areaWidth = mapW;

    // Define three boxes: legend, stats+scale, CRS+inset
    const box1 = { x: areaLeft, y: areaTop, w: areaWidth, h: legendBoxHeight };
    const bottomY = areaTop + legendBoxHeight + rowGap;
    const boxW = (areaWidth / 2) - 2;
    const box2 = { x: areaLeft, y: bottomY, w: boxW, h: bottomBoxHeight };
    const box3 = { x: areaLeft + boxW + 4, y: bottomY, w: boxW, h: bottomBoxHeight };

    // Draw box frames
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.2);
    [box1, box2, box3].forEach(b => pdf.rect(b.x, b.y, b.w, b.h));

    // Dynamic legend inside box1 (full width)
    if (includeLegend) {
        pdf.setFontSize(8);
        const legendX = box1.x + 3;
        let legendY = box1.y + 6;
        const legendMaxY = box1.y + box1.h - 3;

        function hexToRgb(hex: string) {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
        }

        // Generate legend from visible layers
        const visibleLayers = layers.filter(layer => layer.visible && layer.data.features.length > 0);
        const rowH = 6;

        visibleLayers.forEach(layer => {
            let color = '#3b82f6'; // Default blue
            let shape = 'solid';
            const label = layer.name;

            // Determine color and shape based on layer type
            if (layer.type === 'territories') {
                color = '#3b82f6';
                shape = 'solid';
            } else if (layer.type === 'current-locations') {
                color = '#22c55e';
                shape = 'point';
            } else if (layer.type === 'potential-locations') {
                color = '#f59e0b';
                shape = 'point';
            } else if (layer.type === 'us-states') {
                color = '#8b5cf6';
                shape = 'outline';
            } else if (layer.type === 'rivers') {
                color = '#38bdf8';
                shape = 'line';
            } else if (layer.type === 'roads') {
                color = '#6b7280';
                shape = 'line';
            }

            const rgb = hexToRgb(color);
            if (rgb) {
                if (shape === 'outline') {
                    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
                    pdf.rect(legendX, legendY - 4, 8, 6);
                } else if (shape === 'line') {
                    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
                    pdf.setLineWidth(0.6);
                    pdf.line(legendX, legendY - 2, legendX + 18, legendY - 2);
                } else if (shape === 'point') {
                    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
                    pdf.circle(legendX + 4, legendY - 2, 2.5, 'F');
                } else {
                    // solid
                    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
                    pdf.rect(legendX, legendY - 4, 8, 6, 'F');
                }
            }
            
            pdf.setTextColor(0, 0, 0);
            pdf.text(label, legendX + 12, legendY);
            legendY += rowH;
            
            if (legendY > legendMaxY) {
                pdf.setFontSize(8);
                pdf.text('… more', legendX, legendY);
                return;
            }
        });
    }

    // Statistics block in box2 (left side)
    if (includeScaleBar) {
        pdf.setFontSize(8);
        pdf.text('Statistics', box2.x + 3, box2.y + 5);
        pdf.setFontSize(7);
        const statsX = box2.x + 3;
        let statsY = box2.y + 10;
        
        try {
            const territories = layers.find(l => l.type === 'territories')?.data.features.length || 0;
            const currentLocations = layers.find(l => l.type === 'current-locations')?.data.features.length || 0;
            const potentialLocations = layers.find(l => l.type === 'potential-locations')?.data.features.length || 0;
            const usStates = layers.find(l => l.type === 'us-states')?.data.features.length || 0;
            
            pdf.text(`Territories: ${territories}`, statsX, statsY);
            statsY += 4;
            pdf.text(`Current Locations: ${currentLocations}`, statsX, statsY);
            statsY += 4;
            pdf.text(`Potential Locations: ${potentialLocations}`, statsX, statsY);
            statsY += 4;
            pdf.text(`US States: ${usStates}`, statsX, statsY);
        } catch {
            pdf.text('Statistics unavailable', statsX, statsY);
        }

        // Scale + North in box2 (right side)
        try {
            const center = map.getCenter();
            const zoom = map.getZoom();
            const metersPerPixel = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
            const mmPerPixelOnPdf = mapW / canvas.width;
            const targets = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
            let best = targets[0];
            for (const t of targets) {
                const barMm = (t / metersPerPixel) * mmPerPixelOnPdf;
                if (barMm < box2.w - 12) best = t;
                else break;
            }
            const barMm = (best / metersPerPixel) * mmPerPixelOnPdf;
            const sbX = box2.x + box2.w - 60;
            const sbY = box2.y + box2.h - 6;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
            pdf.line(sbX, sbY, sbX + barMm, sbY);
            pdf.line(sbX, sbY - 1, sbX, sbY + 1);
            pdf.line(sbX + barMm, sbY - 1, sbX + barMm, sbY + 1);
            pdf.setFontSize(7);
            const label = best >= 1000 ? `${Math.round(best/1000)} km` : `${best} m`;
            pdf.text(label, sbX + barMm / 2, sbY + 3, { align: 'center' });
        } catch {}
    }

    // North Arrow
    if (includeNorthArrow) {
        const naX = box2.x + box2.w - 8;
        const naY = box2.y + 8;
        pdf.setFillColor(0, 0, 0);
        pdf.triangle(naX, naY, naX - 2, naY + 6, naX + 2, naY + 6, 'F');
        pdf.setFontSize(8);
        pdf.text('N', naX, naY - 1, { align: 'center' });
    }

    // CRS + inset in box3
    pdf.setFontSize(7);
    pdf.text('Projection: Web Mercator (EPSG:3857)', box3.x + 3, box3.y + 6);
    pdf.text('Coordinates: WGS84 (EPSG:4326)', box3.x + 3, box3.y + 11);
    pdf.text('Sources: OSM, Esri, TIGER, USGS', box3.x + 3, box3.y + 16);
    pdf.text('Author: Territory Mapper System', box3.x + 3, box3.y + 21);

    const insetW = 35;
    const insetH = (mapH / mapW) * insetW;
    const insetX = box3.x + box3.w - insetW - 4;
    const insetY = box3.y + 4;
    pdf.setDrawColor(120);
    pdf.rect(insetX - 1, insetY - 1, insetW + 2, insetH + 2);
    pdf.addImage(imgData, 'PNG', insetX, insetY, insetW, insetH);
    pdf.setFontSize(6);
    pdf.text('Inset', insetX + insetW / 2, insetY + insetH + 2, { align: 'center' });
    
    // Save PDF
    pdf.save('territory-mapper-map.pdf');
}
