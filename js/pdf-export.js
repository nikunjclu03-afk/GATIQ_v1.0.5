/* ============================================================
   pdf-export.js — GATIQ Vehicle Entry Audit Log PDF Generator
   Exact company template format with repeating table headers
   ============================================================ */

const PDFExport = (() => {

  // Table styles will be computed dynamically based on the number of columns

  /**
   * Generate PDF matching the selected Deployment Area exactly
   */
  async function exportPDF({ societyName, gateId, entries, area, outputMode = 'save' }) {
    const config = window.DeploymentConfig && window.DeploymentConfig[area] ? window.DeploymentConfig[area] : window.DeploymentConfig['Residential Society'];
    const isWarehouseArea = area === 'Warehouses & Logistics Hubs';
    const now = new Date();
    const generatedOn = formatFullDate(now);
    const dateRange = LogManager.getDateRange();

    // Page Size Logic (Based on Area Name):
    // Warehouses & Logistics Hubs → A3 Landscape
    // Factories & Manufacturing Plants → A4 Landscape
    // Residential Society → A4 Landscape
    // All others → A4 Landscape
    let pageFormat = 'a4';
    let orientation = 'landscape';

    // Explicit area-based page format selection
    if (area === 'Warehouses & Logistics Hubs') {
      pageFormat = 'a3';
      orientation = 'landscape';
    } else {
      pageFormat = 'a4';
      orientation = 'landscape';
    }

    const facilityLabelMap = {
      'Residential Society': 'Society Name',
      'Factories & Manufacturing Plants': 'Factory Name',
      'Warehouses & Logistics Hubs': 'Warehouse Name',
      'Commercial Tech Parks & Business Centers': 'Company / Building Name',
      'Educational Institutions': 'Institution Name',
      'Hotels & Resorts': 'Hotel / Resort Name'
    };
    const facilityLabel = facilityLabelMap[area] || 'Facility / Site Name';

    const columnCount = config.columns.length;
    const isCompactTable = columnCount >= 9 && !isWarehouseArea;

    const thFontSize = isWarehouseArea ? '10.5px' : (isCompactTable ? '10px' : '12px');
    const tdFontSize = isWarehouseArea ? '10px' : (isCompactTable ? '9.5px' : '11px');
    const thPadding = isWarehouseArea ? '6px 8px' : (isCompactTable ? '6px 7px' : '8px 10px');
    const tdPadding = isWarehouseArea ? '5px 7px' : (isCompactTable ? '5px 6px' : '7px 9px');
    const tableWidth = isWarehouseArea ? '97%' : '100%';

    const thStyle = `
      padding:${thPadding}; text-align:left; font-weight:700;
      border:1px solid #333; font-size:${thFontSize}; color:#1a1a2e;
      white-space:normal; line-height:1.2;
    `;

    const tdStyle = `
      padding:${tdPadding}; border:1px solid #ccc;
      font-size:${tdFontSize}; color:#333;
      white-space:normal; word-break:break-word; line-height:1.2;
    `;

    // Use the pre-embedded base64 logo from logo-data.js
    let logoHtml = `<div style="width:36px; height:36px; background:#4f46e5; border-radius:6px; display:inline-block; vertical-align:middle; text-align:center; color:white; font-weight:bold; font-size:20px; line-height:36px; font-family:sans-serif;">G</div>`;

    if (typeof PDF_LOGO_BASE64 !== 'undefined' && PDF_LOGO_BASE64) {
      logoHtml = `<img src="${PDF_LOGO_BASE64}" alt="GATIQ Logo" style="height:36px; width:auto; object-fit:contain; vertical-align:middle;">`;
    }

    // Helper: generate a table with thead + rows
    const makeTableHtml = (chunk) => {
      let thead = `<tr style="background:#f0f0f5;">` +
        config.columns.map(c => `<th style="${thStyle}">${c.label}</th>`).join('') +
        `</tr>`;

      let tbody = '';
      if (chunk.length > 0) {
        tbody = chunk.map(entry => {
          let tr = `<tr>`;
          config.columns.forEach(col => {
            if (col.id === 'srNo') tr += `<td style="${tdStyle} text-align:center;">${entry.srNo}</td>`;
            else if (col.id === 'srGate') tr += `<td style="${tdStyle}">${entry.srNo}<br><small style="color:#777">${escapeHtml(entry.gateNo)}</small></td>`;
            else if (col.id === 'gateNo') tr += `<td style="${tdStyle}">${escapeHtml(entry.gateNo)}</td>`;
            else if (col.id === 'vehicleNo') tr += `<td style="${tdStyle} font-weight:600; letter-spacing:0.5px;">${escapeHtml(entry.vehicleNo)}</td>`;
            else if (col.id === 'date') tr += `<td style="${tdStyle}">${escapeHtml(entry.date)}</td>`;
            else if (col.id === 'entryExit') {
              tr += `<td style="${tdStyle} text-align:center;">
                  <span style="padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; background:${entry.entryExit === 'Entry' ? '#dcfce7' : '#fee2e2'}; color:${entry.entryExit === 'Entry' ? '#166534' : '#991b1b'};">${escapeHtml(entry.entryExit)}</span>
                </td>`;
            }
            else if (col.id === 'status') {
              const st = entry.status ? entry.status.toLowerCase() : (entry.entryExit || '').toLowerCase();
              const color = st.includes('inside') ? 'background:#dcfce7;color:#166534;' : 'background:#fee2e2;color:#991b1b;';
              tr += `<td style="${tdStyle} text-align:center;">
                  <span style="padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; ${color}">${escapeHtml(entry.status || entry.entryExit || '')}</span>
                </td>`;
            }
            else if (col.id === 'time') tr += `<td style="${tdStyle}">${escapeHtml(entry.time)}</td>`;
            else if (col.id === 'entryExitTime') tr += `<td style="${tdStyle}">${escapeHtml(entry.date)}<br><small style="color:#555;font-weight:600">${escapeHtml(entry.time)}</small></td>`;
            else if (col.id === 'tat') tr += `<td style="${tdStyle} text-align:center;">${escapeHtml(entry.tat || '-')}</td>`;
            else if (col.id === 'vehicleType') tr += `<td style="${tdStyle}">${escapeHtml(entry.vehicleType || '-')}</td>`;
            else if (col.id === 'vehicleCapacity') tr += `<td style="${tdStyle}">${escapeHtml(entry.vehicleCapacity || '-')}</td>`;
            else if (col.id === 'consignmentNo') tr += `<td style="${tdStyle}">${escapeHtml(entry.consignmentNo || '-')}</td>`;
            else if (col.id === 'dockNo') tr += `<td style="${tdStyle}">${escapeHtml(entry.dockNo || '-')}</td>`;
            else if (col.id === 'driverInfo') tr += `<td style="${tdStyle}">${escapeHtml(entry.driverName || '-')}<br><small style="color:#555">${escapeHtml(entry.driverPhone || '-')}</small></td>`;
            else if (col.id === 'purpose') tr += `<td style="${tdStyle}">${escapeHtml(entry.purpose)}</td>`;
            else if (col.id === 'tagging') tr += `<td style="${tdStyle} text-align:center; font-weight:500;">${escapeHtml(entry.tagging)}</td>`;
          });
          tr += `</tr>`;
          return tr;
        }).join('');
      } else {
        tbody = `<tr>
            <td colspan="${config.columns.length}" style="${tdStyle} text-align:center; color:#999; padding:30px;">
              No entries recorded
            </td>
          </tr>`;
      }

      return `
      <table style="width:${tableWidth}; margin:0 auto; border-collapse:collapse; font-size:11px; border:1px solid #333; table-layout:fixed;">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>`;
    };

    // Calculate dynamic styling based on page format
    const contentMaxWidth = pageFormat === 'a3' ? (isWarehouseArea ? 1450 : 1350) : 1000; // px
    const contentPadding = pageFormat === 'a3'
      ? (isWarehouseArea ? '14px 24px 10px' : '15px 40px 10px')
      : '12px 30px 10px';
    const otherPagePadding = pageFormat === 'a3'
      ? (isWarehouseArea ? '14px 24px' : '15px 40px')
      : '12px 30px';

    const headerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:10px;">
          ${logoHtml}
          <div style="font-size:14px; font-weight:600; color:#1a1a2e;">Abiliqt Technologies Pvt. Ltd.</div>
        </div>
        <div style="text-align:right; font-size:12px; color:#555;">
          ${escapeHtml(facilityLabel)}: <strong>${escapeHtml(societyName)}</strong>
        </div>
      </div>

      <h1 style="text-align:center; font-size:16px; font-weight:800; color:#1a1a2e; margin:8px 0 4px; letter-spacing:0.5px;">
        GATIQ - VEHICLE ENTRY AUDIT LOG
      </h1>

      <div style="text-align:center; font-size:10px; color:#555; margin-bottom:3px;">
        Period: ${escapeHtml(dateRange.from)} to ${escapeHtml(dateRange.to)} &nbsp;|&nbsp;
        Area: ${escapeHtml(area)} &nbsp;|&nbsp;
        Generated On: ${escapeHtml(generatedOn)} &nbsp;|&nbsp;
        Gate ID: ${escapeHtml(gateId)}
      </div>

      <div style="font-size:10px; font-weight:700; color:#dc2626; margin-bottom:8px; text-transform:uppercase;">
        CONFIDENTIAL - INTERNAL USE ONLY
      </div>
    `;

    function getPageHeightPx() {
      if (pageFormat === 'a3') return Math.floor(contentMaxWidth * (297 / 420));
      return Math.floor(contentMaxWidth * (210 / 297));
    }

    function canFitRows(start, count, isFirstPage) {
      const probe = document.createElement('div');
      probe.style.cssText = `
        position:absolute; left:-99999px; top:0; visibility:hidden; pointer-events:none;
        width:${contentMaxWidth}px; height:${getPageHeightPx()}px; box-sizing:border-box;
        padding:${isFirstPage ? contentPadding : otherPagePadding}; overflow:hidden;
        font-family:'Inter', Arial, sans-serif; color:#1a1a2e; background:#fff;
      `;

      const chunk = entries.slice(start, start + count);
      probe.innerHTML = `
        <div style="position:relative; z-index:1;">
          ${isFirstPage ? headerHtml : ''}
          ${makeTableHtml(chunk)}
        </div>
      `;

      document.body.appendChild(probe);
      const fits = probe.scrollHeight <= probe.clientHeight;
      probe.remove();
      return fits;
    }

    function buildPageChunksByHeight() {
      if (!entries.length) return [[]];

      const chunks = [];
      let start = 0;

      while (start < entries.length) {
        const remaining = entries.length - start;
        const isFirstPage = chunks.length === 0;
        let low = 1;
        let high = remaining;
        let best = 1;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (canFitRows(start, mid, isFirstPage)) {
            best = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        chunks.push(entries.slice(start, start + best));
        start += best;
      }

      return chunks;
    }

    const pageChunks = buildPageChunksByHeight();

    // Build complete HTML with CSS page breaks between chunks
    const htmlContent = `
      <div style="
        font-family: 'Inter', Arial, sans-serif;
        color: #1a1a2e;
        background: white;
        width: 100%;
        max-width: ${contentMaxWidth}px;
        margin: 0 auto;
        box-sizing: border-box;
        padding: 0;
      ">
        <!-- PAGE 1: Full header + first chunk -->
        <div style="position:relative; padding:${contentPadding}; break-inside:avoid-page; page-break-inside:avoid;">
          <div style="
            position:absolute; top:50%; left:50%;
            transform:translate(-50%,-50%) rotate(-35deg);
            font-size:150px; font-weight:900;
            color:rgba(220,38,38,0.06);
            white-space:nowrap; pointer-events:none; z-index:0; user-select:none;
          ">CONFIDENTIAL</div>

          <div style="position:relative; z-index:1;">
            ${headerHtml}

            ${makeTableHtml(pageChunks[0])}
          </div>
        </div>

        ${pageChunks.slice(1).map(chunk => `
          <div style="page-break-before:always; position:relative; padding:${otherPagePadding}; break-inside:avoid-page; page-break-inside:avoid;">
            <div style="
              position:absolute; top:50%; left:50%;
              transform:translate(-50%,-50%) rotate(-35deg);
              font-size:150px; font-weight:900;
              color:rgba(220,38,38,0.06);
              white-space:nowrap; pointer-events:none; z-index:0;
            ">CONFIDENTIAL</div>
            <div style="position:relative; z-index:1;">
              ${makeTableHtml(chunk)}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Generate PDF - optimize margins and window width
    const options = {
      margin: [3, 3, 5, 3],
      filename: `GATIQ_Vehicle_Log_${gateId.replace(/\s+/g, '_')}_${formatFileDate(now)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollY: 0,
        windowWidth: pageFormat === 'a3' ? 1700 : 1400
      },
      jsPDF: {
        unit: 'mm',
        format: pageFormat,
        orientation: orientation
      },
      pagebreak: { mode: ['css'] }
    };

    // Force scroll to top to fix html2canvas offset bug
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    return html2pdf()
      .set(options)
      .from(htmlContent)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(136, 136, 136);
          pdf.text('Generated by GATIQ \u2014 Abiliqt Technologies Pvt. Ltd.', 8, pageHeight - 4);
          pdf.text('Data Purge Policy: 1 Year', pageWidth / 2, pageHeight - 4, { align: 'center' });
          pdf.text('Page ' + i + ' of ' + totalPages, pageWidth - 8, pageHeight - 4, { align: 'right' });
        }
        const blob = pdf.output('blob');
        const payload = { blob, filename: options.filename };
        if (outputMode === 'blob') return payload;
        if (outputMode === 'open') {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank', 'noopener');
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          return payload;
        }
        pdf.save(options.filename);
        return payload;
      })
      .then((result) => {
        window.scrollTo(0, originalScrollY);
        return result;
      })
      .catch(err => {
        window.scrollTo(0, originalScrollY);
        console.error('PDF export error:', err);
        throw new Error('Failed to export PDF. Please try again.');
      });
  }

  // Helpers
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  return { exportPDF };
})();

if (typeof window !== 'undefined') {
  window.PDFExport = PDFExport;
}

