/* ============================================================
   svg-export.js — GATIQ Vehicle Entry Audit Log SVG Generator
   Generates downloadable SVG files with structured table data
   ============================================================ */

const SVGExport = (() => {

  /**
   * Generate SVG matching the selected Deployment Area
   */
  function exportSVG({ societyName, gateId, entries, area, outputMode = 'save' }) {
    const config = window.DeploymentConfig && window.DeploymentConfig[area]
      ? window.DeploymentConfig[area]
      : window.DeploymentConfig['Residential Society'];

    const now = new Date();
    const generatedOn = formatFullDate(now);
    const dateRange = LogManager.getDateRange();

    const facilityLabelMap = {
      'Residential Society': 'Society Name',
      'Factories & Manufacturing Plants': 'Factory Name',
      'Warehouses & Logistics Hubs': 'Warehouse Name',
      'Commercial Tech Parks & Business Centers': 'Company / Building Name',
      'Educational Institutions': 'Institution Name',
      'Hotels & Resorts': 'Hotel / Resort Name'
    };
    const facilityLabel = facilityLabelMap[area] || 'Facility / Site Name';

    // Layout constants
    const colCount = config.columns.length;
    const colWidth = Math.max(90, Math.floor(1100 / colCount));
    const tableWidth = colWidth * colCount;
    const marginX = 40;
    const svgWidth = tableWidth + marginX * 2;
    const rowH = 28;
    const headerRowH = 32;
    const headerBlockH = 120;
    const footerH = 40;

    const dataRows = entries.length > 0 ? entries : [];
    const tableH = headerRowH + dataRows.length * rowH;
    const svgHeight = headerBlockH + tableH + footerH + 30;

    let svg = '';

    // SVG open
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" font-family="'Inter', 'Segoe UI', Arial, sans-serif">\n`;

    // White background
    svg += `<rect width="100%" height="100%" fill="#ffffff"/>\n`;

    // CONFIDENTIAL watermark
    svg += `<text x="${svgWidth / 2}" y="${svgHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-size="120" font-weight="900" fill="rgba(220,38,38,0.05)" transform="rotate(-35, ${svgWidth / 2}, ${svgHeight / 2})">CONFIDENTIAL</text>\n`;

    // ─── HEADER ───
    // Company name (left)
    svg += `<text x="${marginX}" y="30" font-size="14" font-weight="700" fill="#1a1a2e">Abiliqt Technologies Pvt. Ltd.</text>\n`;

    // Tool name (center)
    svg += `<text x="${svgWidth / 2}" y="55" text-anchor="middle" font-size="16" font-weight="800" fill="#1a1a2e" letter-spacing="0.5">GATIQ - VEHICLE ENTRY AUDIT LOG</text>\n`;

    // Area name (right)
    svg += `<text x="${svgWidth - marginX}" y="30" text-anchor="end" font-size="12" fill="#555">${esc(facilityLabel)}: ${esc(societyName)}</text>\n`;

    // Sub-header info
    svg += `<text x="${svgWidth / 2}" y="75" text-anchor="middle" font-size="9" fill="#777">Period: ${esc(dateRange.from)} to ${esc(dateRange.to)}  |  Area: ${esc(area)}  |  Generated On: ${esc(generatedOn)}  |  Gate ID: ${esc(gateId)}</text>\n`;

    // Confidential badge
    svg += `<text x="${svgWidth / 2}" y="92" text-anchor="middle" font-size="9" font-weight="700" fill="#dc2626" text-transform="uppercase">CONFIDENTIAL - INTERNAL USE ONLY</text>\n`;

    // ─── TABLE ───
    const tableY = headerBlockH;
    const tableX = marginX;

    // Table header background
    svg += `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${headerRowH}" fill="#f0f0f5" stroke="#333" stroke-width="1"/>\n`;

    // Column headers
    config.columns.forEach((col, i) => {
      const cx = tableX + i * colWidth;
      // Vertical line
      if (i > 0) {
        svg += `<line x1="${cx}" y1="${tableY}" x2="${cx}" y2="${tableY + headerRowH}" stroke="#333" stroke-width="1"/>\n`;
      }
      // Header text
      svg += `<text x="${cx + colWidth / 2}" y="${tableY + headerRowH / 2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#1a1a2e">${esc(col.label)}</text>\n`;
    });

    // Table border (header)
    svg += `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${headerRowH}" fill="none" stroke="#333" stroke-width="1"/>\n`;

    // Data rows
    if (dataRows.length > 0) {
      dataRows.forEach((entry, rowIdx) => {
        const ry = tableY + headerRowH + rowIdx * rowH;
        const bgColor = rowIdx % 2 === 0 ? '#ffffff' : '#fafafa';

        // Row background
        svg += `<rect x="${tableX}" y="${ry}" width="${tableWidth}" height="${rowH}" fill="${bgColor}" stroke="#ddd" stroke-width="0.5"/>\n`;

        config.columns.forEach((col, colIdx) => {
          const cx = tableX + colIdx * colWidth;
          const textX = cx + colWidth / 2;
          const textY = ry + rowH / 2 + 4;
          let val = '';

          // Map column ID to entry value
          if (col.id === 'srNo') val = String(entry.srNo || rowIdx + 1);
          else if (col.id === 'srGate') val = `${entry.srNo || rowIdx + 1} / ${entry.gateNo || ''}`;
          else if (col.id === 'gateNo') val = entry.gateNo || '';
          else if (col.id === 'vehicleNo') val = entry.vehicleNo || '';
          else if (col.id === 'date') val = entry.date || '';
          else if (col.id === 'time') val = entry.time || '';
          else if (col.id === 'entryExit') val = entry.entryExit || '';
          else if (col.id === 'entryExitTime') val = `${entry.date || ''} ${entry.time || ''}`;
          else if (col.id === 'status') val = entry.status || entry.entryExit || '';
          else if (col.id === 'tat') val = entry.tat || '-';
          else if (col.id === 'vehicleType') val = entry.vehicleType || '-';
          else if (col.id === 'vehicleCapacity') val = entry.vehicleCapacity || '-';
          else if (col.id === 'consignmentNo') val = entry.consignmentNo || '-';
          else if (col.id === 'dockNo') val = entry.dockNo || '-';
          else if (col.id === 'driverInfo') val = `${entry.driverName || '-'} / ${entry.driverPhone || '-'}`;
          else if (col.id === 'purpose') val = entry.purpose || '';
          else if (col.id === 'tagging') val = entry.tagging || '';

          // Vertical grid line
          if (colIdx > 0) {
            svg += `<line x1="${cx}" y1="${ry}" x2="${cx}" y2="${ry + rowH}" stroke="#ddd" stroke-width="0.5"/>\n`;
          }

          // Entry/Exit badge coloring
          if (col.id === 'entryExit' || col.id === 'status') {
            const isEntry = String(val).toLowerCase().includes('entry') || String(val).toLowerCase().includes('inside');
            const badgeFill = isEntry ? '#dcfce7' : '#fee2e2';
            const badgeText = isEntry ? '#166534' : '#991b1b';
            const bw = Math.min(colWidth - 10, val.length * 7 + 16);
            svg += `<rect x="${textX - bw / 2}" y="${textY - 10}" width="${bw}" height="16" rx="8" fill="${badgeFill}"/>\n`;
            svg += `<text x="${textX}" y="${textY}" text-anchor="middle" font-size="9" font-weight="600" fill="${badgeText}">${esc(val)}</text>\n`;
          } else if (col.id === 'vehicleNo') {
            svg += `<text x="${textX}" y="${textY}" text-anchor="middle" font-size="10" font-weight="600" fill="#333" letter-spacing="0.5">${esc(val)}</text>\n`;
          } else {
            // Truncate long text
            const maxChars = Math.floor(colWidth / 6);
            const display = val.length > maxChars ? val.substring(0, maxChars - 1) + '…' : val;
            svg += `<text x="${textX}" y="${textY}" text-anchor="middle" font-size="9" fill="#333">${esc(display)}</text>\n`;
          }
        });

        // Row border
        svg += `<rect x="${tableX}" y="${ry}" width="${tableWidth}" height="${rowH}" fill="none" stroke="#ddd" stroke-width="0.5"/>\n`;
      });
    } else {
      // Empty state
      const ry = tableY + headerRowH;
      svg += `<rect x="${tableX}" y="${ry}" width="${tableWidth}" height="${rowH * 2}" fill="#fafafa" stroke="#ddd" stroke-width="0.5"/>\n`;
      svg += `<text x="${svgWidth / 2}" y="${ry + rowH}" text-anchor="middle" font-size="11" fill="#999">No entries recorded</text>\n`;
    }

    // Table outer border
    const totalTableH = headerRowH + (dataRows.length > 0 ? dataRows.length * rowH : rowH * 2);
    svg += `<rect x="${tableX}" y="${tableY}" width="${tableWidth}" height="${totalTableH}" fill="none" stroke="#333" stroke-width="1"/>\n`;

    // ─── FOOTER ───
    const footerY = tableY + totalTableH + 15;
    svg += `<text x="${marginX}" y="${footerY}" font-size="8" fill="#888">Generated by GATIQ — Abiliqt Technologies Pvt. Ltd.</text>\n`;
    svg += `<text x="${svgWidth / 2}" y="${footerY}" text-anchor="middle" font-size="8" fill="#888">Data Purge Policy: 1 Year</text>\n`;
    svg += `<text x="${svgWidth - marginX}" y="${footerY}" text-anchor="end" font-size="8" fill="#888">Total Records: ${dataRows.length}</text>\n`;

    // SVG close
    svg += `</svg>`;

    const filename = `GATIQ_Vehicle_Log_${gateId.replace(/\s+/g, '_')}_${formatFileDate(now)}.svg`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    if (outputMode !== 'blob') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    return { blob, filename };
  }

  // ── Helpers ──
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatFullDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mmm = months[date.getMonth()];
    const yyyy = date.getFullYear();
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${dd}-${mmm}-${yyyy}, ${h}:${m} ${ampm} IST`;
  }

  function formatFileDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}_${mm}_${yyyy}`;
  }

  return { exportSVG };
})();

if (typeof window !== 'undefined') {
  window.SVGExport = SVGExport;
}
