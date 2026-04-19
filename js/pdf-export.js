/* ============================================================
   pdf-export.js — GATIQ Vehicle Entry Audit Log PDF Generator
   Exact company template format with repeating table headers
   ============================================================ */

const PDFExport = (() => {

  // Table styles
  const thStyle = `
    padding:8px 10px; text-align:left; font-weight:700;
    border:1px solid #333; font-size:11px; color:#1a1a2e;
    white-space:nowrap;
  `;

  const tdStyle = `
    padding:7px 10px; border:1px solid #ccc;
    font-size:11px; color:#333; white-space:nowrap;
  `;

  /**
   * Generate PDF matching the selected Deployment Area exactly
   */
  async function exportPDF({ societyName, gateId, entries, area }) {
    const config = window.DeploymentConfig && window.DeploymentConfig[area] ? window.DeploymentConfig[area] : window.DeploymentConfig['Residential Society'];
    const now = new Date();
    const generatedOn = formatFullDate(now);
    const dateRange = LogManager.getDateRange();

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
      <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #333;">
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>`;
    };

    // Split entries into page chunks
    // Explicitly requested: 10 rows on the first page, 11 on all subsequent pages
    const ROWS_PAGE1 = 10;
    const ROWS_OTHER = 11;
    const pageChunks = [];
    if (entries.length > 0) {
      pageChunks.push(entries.slice(0, ROWS_PAGE1));
      for (let i = ROWS_PAGE1; i < entries.length; i += ROWS_OTHER) {
        pageChunks.push(entries.slice(i, i + ROWS_OTHER));
      }
    } else {
      pageChunks.push([]);
    }

    // Build complete HTML with CSS page breaks between chunks
    const htmlContent = `
      <div style="
        font-family: 'Inter', Arial, sans-serif;
        color: #1a1a2e;
        background: white;
        width: 1040px;
        box-sizing: border-box;
        margin: 0;
      ">
        <!-- PAGE 1: Full header + first chunk -->
        <div style="position:relative; padding:15px 40px 10px;">
          <div style="
            position:absolute; top:50%; left:50%;
            transform:translate(-50%,-50%) rotate(-35deg);
            font-size:150px; font-weight:900;
            color:rgba(220,38,38,0.06);
            white-space:nowrap; pointer-events:none; z-index:0; user-select:none;
          ">CONFIDENTIAL</div>

          <div style="position:relative; z-index:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
              <div style="display:flex; align-items:center; gap:10px;">
                ${logoHtml}
                <div style="font-size:14px; font-weight:600; color:#1a1a2e;">Abiliqt Technologies Pvt. Ltd.</div>
              </div>
              <div style="text-align:right; font-size:12px; color:#555;">
                Society Name: <strong>${escapeHtml(societyName)}</strong>
              </div>
            </div>

            <h1 style="text-align:center; font-size:16px; font-weight:800; color:#1a1a2e; margin:8px 0 4px; letter-spacing:0.5px;">
              GATIQ – VEHICLE ENTRY AUDIT LOG
            </h1>

            <div style="text-align:center; font-size:10px; color:#555; margin-bottom:3px;">
              Period: ${escapeHtml(dateRange.from)} to ${escapeHtml(dateRange.to)} &nbsp;|&nbsp;
              Generated On: ${escapeHtml(generatedOn)} &nbsp;|&nbsp;
              Gate ID: ${escapeHtml(gateId)}
            </div>

            <div style="font-size:10px; font-weight:700; color:#dc2626; margin-bottom:8px; text-transform:uppercase;">
              CONFIDENTIAL - INTERNAL USE ONLY
            </div>

            ${makeTableHtml(pageChunks[0])}
          </div>
        </div>

        ${pageChunks.slice(1).map(chunk => `
          <div style="page-break-before:always; position:relative; padding:20px 40px;">
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

    // Generate PDF
    const options = {
      margin: [8, 8, 14, 8],
      filename: `GATIQ_Vehicle_Log_${gateId.replace(/\s+/g, '_')}_${formatFileDate(now)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
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
      })
      .save()
      .then(() => {
        window.scrollTo(0, originalScrollY);
        return true;
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
