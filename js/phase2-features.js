document.addEventListener('DOMContentLoaded', () => {

    // --- Bulk CSV Import ---
    const btnUploadCsv = document.getElementById('btnUploadCsv');
    const whitelistCsvUpload = document.getElementById('whitelistCsvUpload');
    const csvImportStatus = document.getElementById('csvImportStatus');

    if (btnUploadCsv && whitelistCsvUpload) {
        btnUploadCsv.addEventListener('click', () => {
            whitelistCsvUpload.click();
        });

        whitelistCsvUpload.addEventListener('change', async (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            
            if (csvImportStatus) {
                csvImportStatus.style.display = 'inline-block';
                csvImportStatus.textContent = `Uploading ${file.name}...`;
                btnUploadCsv.disabled = true;
            }

            try {
                // Determine API root using the same logic from App.js
                let baseUrl = 'http://127.0.0.1:8001';
                let apiKey = '7t#K9!vP$2wL5*G8^m1&Q4+Z7xR0_B3#';
                
                // Get them from the DOM inputs if they exist (updated by app.js)
                const urlInput = document.getElementById('backendApiUrl');
                const keyInput = document.getElementById('backendApiKeyInput');
                if (urlInput && urlInput.value) baseUrl = urlInput.value.trim();
                
                // Construct the formData
                const formData = new FormData();
                formData.append('file', file);
                
                // Can't easily use window.gatiqFetchAPI because it forces content-type string. 
                // We'll run fetch directly for FormData.
                const response = await fetch(`${baseUrl}/whitelist/import`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': apiKey
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(errText || `API Error ${response.status}`);
                }
                
                const job = await response.json();
                if (csvImportStatus) {
                    csvImportStatus.textContent = `Done! Success: ${job.success_count}, Errors: ${job.error_count}`;
                    csvImportStatus.style.color = job.error_count > 0 ? '#d97706' : '#059669';
                }
                
                // If there are errors, show them in a toast or console
                if (window.gatiqShowToast) {
                    window.gatiqShowToast(`Imported ${job.success_count} rows. ${job.error_count} errors.`, job.error_count > 0 ? 'warning' : 'success');
                }
                
                // Attempt to refresh the whitelist table if the app has the method exposed
                // Wait for a second so user can read the text
                setTimeout(() => {
                    // Usually closing and opening the modal or triggering the refresh function works
                    if (window.fetchWhitelist && window.renderWhitelistTable) {
                         window.fetchWhitelist().then(window.renderWhitelistTable);
                    } else if (document.getElementById('btnCloseWhitelist')) {
                         document.getElementById('btnCloseWhitelist').click();
                    }
                    if (csvImportStatus) {
                        csvImportStatus.style.display = 'none';
                        csvImportStatus.style.color = 'var(--text-tertiary)';
                    }
                }, 4000);
                
            } catch (err) {
                console.error("CSV Import Error:", err);
                if (csvImportStatus) {
                    csvImportStatus.textContent = "Failed. " + err.message.substring(0, 30);
                    csvImportStatus.style.color = '#ef4444';
                }
                if (window.gatiqShowToast) {
                    window.gatiqShowToast('CSV Import failed: ' + err.message, 'error');
                }
            } finally {
                if (btnUploadCsv) btnUploadCsv.disabled = false;
                e.target.value = ''; // Reset input
            }
        });
    }

    // --- RBAC Role Overrides ---
    // In Phase 2, we introduce guard, supervisor, admin. Let's intercept UI rendering 
    // to hide/disable settings depending on role.
    const originalRenderProfile = window.renderProfileDetails;
    // We can hook into the global scope. App.js saves gatiq_operator_profile to localStorage.
    
    function applyPhase2RBAC() {
        try {
            const rawProfile = localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('gatiq_operator_profile')));
            if (!rawProfile) return;
            const profile = JSON.parse(rawProfile);
            const role = profile.accessRole || 'guest';
            
            // UI elements that are Supervisor/Admin only
            const btnSettings = document.getElementById('btnSettings');
            const btnManageResidents = document.getElementById('btnManageResidents'); // Whitelist
            
            if (role === 'operator' || role === 'guard') {
                if (btnSettings) {
                    btnSettings.style.opacity = '0.5';
                    btnSettings.style.pointerEvents = 'none';
                    btnSettings.title = "Requires Supervisor or Admin role";
                }
                // Guards can't edit whitelist in Phase 2
                if (btnManageResidents) {
                    btnManageResidents.style.opacity = '0.5';
                    btnManageResidents.style.pointerEvents = 'none';
                    btnManageResidents.title = "Requires Supervisor or Admin role";
                }
                // Hide quick access reporting tab for guards
                const reportElements = document.querySelectorAll('.dashboard-stat-card:nth-child(2)'); 
                // Just examples, avoiding brittle selector hacks.
            } else {
                if (btnSettings) {
                    btnSettings.style.opacity = '1';
                    btnSettings.style.pointerEvents = 'auto';
                }
                if (btnManageResidents) {
                    btnManageResidents.style.opacity = '1';
                    btnManageResidents.style.pointerEvents = 'auto';
                }
            }
        } catch(e) { /* ignore */ }
    }
    
    // Periodically enforce or check if profile loads
    setInterval(applyPhase2RBAC, 2000);
});

// Global Incident Logger callable from anywhere
window.logIncident = async function(reviewId, logId, suspectPlate) {
    const reason = prompt(`Log an incident for vehicle ${suspectPlate || 'Unknown'}? Include details or a flag reason:`, "Suspicious activity / Tailgating");
    if (!reason || !reason.trim()) return;
    
    try {
        const payload = {
            reporter_id: "desktop_operator",
            severity_flag: "medium",
            note: reason.trim(),
            review_id: reviewId || null,
            log_id: logId || null
        };
        
        await window.gatiqFetchAPI('/incidents', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (window.gatiqShowToast) window.gatiqShowToast("Incident safely recorded.", "success");
        else alert("Incident recorded.");
    } catch(err) {
        if (window.gatiqShowToast) window.gatiqShowToast("Could not log incident: " + err.message, "error");
        else alert("Failed to log incident: " + err.message);
    }
}
