const GatiqQuickViewer = (() => {
    function escapeRegExp(str) {
        return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getQuickViewerReport({ reportId, reports }) {
        return (Array.isArray(reports) ? reports : []).find(item => item.id === reportId) || null;
    }

    function getReportConfig({ area, deploymentConfig, sanitizeArea, defaultArea }) {
        return deploymentConfig[sanitizeArea(area)] || deploymentConfig[defaultArea];
    }

    function formatViewerTimestamp(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'Unknown';
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getViewerReportPeriod(report) {
        const dates = (report.entries || []).map(entry => entry.date).filter(Boolean);
        if (!dates.length) return 'No date range';
        const unique = Array.from(new Set(dates));
        return unique.length === 1 ? unique[0] : `${unique[0]} to ${unique[unique.length - 1]}`;
    }

    function getViewerCellText(entry, column) {
        switch (column.id) {
            case 'srNo':
                return String(entry.srNo || '-');
            case 'srGate':
                return `${entry.srNo || '-'} ${entry.gateNo || '-'}`;
            case 'gateNo':
                return entry.gateNo || '-';
            case 'vehicleNo':
                return entry.vehicleNo || '-';
            case 'date':
                return entry.date || '-';
            case 'entryExit':
                return entry.entryExit || '-';
            case 'status':
                return entry.status || entry.entryExit || '-';
            case 'time':
                return entry.time || '-';
            case 'entryExitTime':
                return `${entry.date || '-'} ${entry.time || '-'}`;
            case 'tat':
                return entry.tat || '-';
            case 'vehicleType':
                return entry.vehicleType || '-';
            case 'vehicleCapacity':
                return entry.vehicleCapacity || '-';
            case 'consignmentNo':
                return entry.consignmentNo || '-';
            case 'dockNo':
                return entry.dockNo || '-';
            case 'driverInfo':
                return `${entry.driverName || '-'} ${entry.driverPhone || '-'}`;
            case 'purpose':
                return entry.purpose || '-';
            case 'tagging':
                return entry.tagging || '-';
            default:
                return entry[column.id] || '-';
        }
    }

    function highlightViewerText({ value, query, tracker, escapeHtml }) {
        const text = String(value || '-');
        if (!query) return escapeHtml(text);
        const pattern = new RegExp(escapeRegExp(query), 'ig');
        let lastIndex = 0;
        let html = '';
        let matched = false;
        text.replace(pattern, (match, offset) => {
            matched = true;
            html += escapeHtml(text.slice(lastIndex, offset));
            html += `<mark class="quick-viewer-highlight" data-match-index="${tracker.count}">${escapeHtml(match)}</mark>`;
            tracker.count += 1;
            lastIndex = offset + match.length;
            return match;
        });
        if (!matched) return escapeHtml(text);
        html += escapeHtml(text.slice(lastIndex));
        return html;
    }

    function getQuickViewerChipTone({ value, normalizeText }) {
        const text = normalizeText(value);
        if (text.includes('entry') || text.includes('inside') || text.includes('docked')) return 'entry';
        if (text.includes('exit') || text.includes('out')) return 'exit';
        return 'neutral';
    }

    function renderViewerCell({ entry, column, query, tracker, normalizeText, escapeHtml }) {
        if (column.id === 'srGate') {
            return `<strong>${highlightViewerText({ value: entry.srNo || '-', query, tracker, escapeHtml })}</strong><br><span>${highlightViewerText({ value: entry.gateNo || '-', query, tracker, escapeHtml })}</span>`;
        }
        if (column.id === 'entryExit' || column.id === 'status') {
            const chipText = getViewerCellText(entry, column);
            return `<span class="quick-viewer-chip ${getQuickViewerChipTone({ value: chipText, normalizeText })}">${highlightViewerText({ value: chipText, query, tracker, escapeHtml })}</span>`;
        }
        if (column.id === 'entryExitTime') {
            return `${highlightViewerText({ value: entry.date || '-', query, tracker, escapeHtml })}<br><span>${highlightViewerText({ value: entry.time || '-', query, tracker, escapeHtml })}</span>`;
        }
        if (column.id === 'driverInfo') {
            return `${highlightViewerText({ value: entry.driverName || '-', query, tracker, escapeHtml })}<br><span>${highlightViewerText({ value: entry.driverPhone || '-', query, tracker, escapeHtml })}</span>`;
        }
        return highlightViewerText({
            value: getViewerCellText(entry, column),
            query,
            tracker,
            escapeHtml
        });
    }

    function updateQuickViewerZoomUI({ paperShell, zoomLabel, zoom, minZoom, maxZoom, btnZoomOut, btnZoomIn }) {
        if (paperShell) {
            paperShell.style.transform = `scale(${zoom})`;
        }
        if (zoomLabel) {
            zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
        }
        if (btnZoomOut) btnZoomOut.disabled = zoom <= minZoom;
        if (btnZoomIn) btnZoomIn.disabled = zoom >= maxZoom;
    }

    function syncQuickViewerMatchUI({
        contentEl,
        searchTerm,
        matchIndex,
        matchStatusEl,
        searchEmptyEl,
        btnPrev,
        btnNext,
        shouldScroll
    }) {
        const matches = contentEl ? Array.from(contentEl.querySelectorAll('.quick-viewer-highlight')) : [];
        if (!matches.length) {
            if (matchStatusEl) {
                matchStatusEl.textContent = searchTerm ? '0 matches' : 'No search';
            }
            if (searchEmptyEl) {
                searchEmptyEl.hidden = !searchTerm;
                if (searchTerm) {
                    searchEmptyEl.textContent = `No matches found for "${searchTerm}".`;
                }
            }
            if (btnPrev) btnPrev.disabled = true;
            if (btnNext) btnNext.disabled = true;
            return {
                matchCount: 0,
                matchIndex: 0
            };
        }

        const nextIndex = Math.min(Math.max(matchIndex, 0), matches.length - 1);
        matches.forEach(match => match.classList.remove('active'));
        const activeMatch = matches[nextIndex];
        activeMatch?.classList.add('active');
        if (matchStatusEl) {
            matchStatusEl.textContent = `${nextIndex + 1} / ${matches.length} matches`;
        }
        if (searchEmptyEl) searchEmptyEl.hidden = true;
        if (btnPrev) btnPrev.disabled = matches.length < 2;
        if (btnNext) btnNext.disabled = matches.length < 2;
        if (shouldScroll && activeMatch) {
            activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        return {
            matchCount: matches.length,
            matchIndex: nextIndex
        };
    }

    function renderQuickViewer({
        report,
        searchTerm,
        defaultArea,
        brandLogoDark,
        deploymentConfig,
        sanitizeArea,
        normalizeText,
        getFacilityLabel,
        escapeHtml,
        refs
    }) {
        if (!report || !refs.content) return false;

        const query = String(searchTerm || '').trim();
        const tracker = { count: 0 };
        const config = getReportConfig({
            area: report.area || defaultArea,
            deploymentConfig,
            sanitizeArea,
            defaultArea
        });
        const entries = Array.isArray(report.entries) ? report.entries : [];
        const title = report.societyName || report.area || 'Vehicle Entry Audit Report';
        const subtitle = `${sanitizeArea(report.area || defaultArea)} | ${report.gateId || 'Gate 1'} | ${entries.length} entries`;
        const rows = entries.length
            ? entries.map(entry => `
                <tr>
                    ${config.columns.map(column => `<td>${renderViewerCell({ entry, column, query, tracker, normalizeText, escapeHtml })}</td>`).join('')}
                </tr>
            `).join('')
            : `<tr class="quick-viewer-empty-row"><td colspan="${config.columns.length}">No entries recorded for this report.</td></tr>`;

        const metadata = [
            { label: getFacilityLabel(report.area), value: report.societyName || 'N/A' },
            { label: 'Deployment Area', value: sanitizeArea(report.area || defaultArea) },
            { label: 'Gate ID', value: report.gateId || 'Gate 1' },
            { label: 'Generated On', value: formatViewerTimestamp(report.generatedAt) },
            { label: 'Record Period', value: getViewerReportPeriod(report) },
            { label: 'Entries Logged', value: String(report.totalEntries || entries.length || 0) },
            { label: 'Search Scope', value: query ? `Filtered for "${query}"` : 'Full report content' },
            { label: 'Retention', value: 'Internal Use Only' }
        ];

        if (refs.title) refs.title.textContent = title;
        if (refs.subtitle) refs.subtitle.textContent = subtitle;
        if (refs.search) refs.search.value = searchTerm;

        refs.content.innerHTML = `
            <div class="quick-viewer-report-header">
                <div class="quick-viewer-brand">
                    <img src="${escapeHtml(brandLogoDark)}" alt="GATIQ Logo" class="quick-viewer-brand-mark">
                    <div class="quick-viewer-brand-copy">
                        <h4>GATIQ Vehicle Entry Audit Log</h4>
                        <p>Abiliqt Technologies Pvt. Ltd. secure report preview</p>
                    </div>
                </div>
                <div class="quick-viewer-stamp">
                    <div class="quick-viewer-stamp-title">Confidential</div>
                    <div class="quick-viewer-stamp-sub">${escapeHtml(subtitle)}</div>
                </div>
            </div>
            <div class="quick-viewer-meta-grid">
                ${metadata.map(item => `
                    <div class="quick-viewer-meta-card">
                        <div class="quick-viewer-meta-label">${escapeHtml(item.label)}</div>
                        <div class="quick-viewer-meta-value">${highlightViewerText({ value: item.value, query, tracker, escapeHtml })}</div>
                    </div>
                `).join('')}
            </div>
            <div class="quick-viewer-table-wrap">
                <table class="quick-viewer-table">
                    <thead>
                        <tr>
                            ${config.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="quick-viewer-note">
                <span>Search highlights visible report values and helps jump between matching rows quickly.</span>
                <span>Use Download for the real PDF output.</span>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
        return true;
    }

    return {
        getQuickViewerReport,
        getReportConfig,
        formatViewerTimestamp,
        getViewerReportPeriod,
        getViewerCellText,
        highlightViewerText,
        getQuickViewerChipTone,
        renderViewerCell,
        updateQuickViewerZoomUI,
        syncQuickViewerMatchUI,
        renderQuickViewer
    };
})();

if (typeof window !== 'undefined') {
    window.GatiqQuickViewer = GatiqQuickViewer;
}
