
import os

file_path = r"c:\Users\DELL\Desktop\GATIQ\index.html"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the corruption
# We search for the pattern where dashboardRecentActivity is followed immediately by camera-col-left
target_start = -1
for i, line in enumerate(lines):
    if 'id="dashboardRecentActivity"' in line and i + 1 < len(lines) and 'class="camera-col-left"' in lines[i+1]:
        target_start = i
        break

if target_start == -1:
    print("Corruption pattern not found. Maybe it's already fixed or changed?")
    # Double check if it's already fixed
    for i, line in enumerate(lines):
         if 'id="engineInfoPill"' in line:
             print("Found engineInfoPill. Checking for structure...")
    sys.exit(1)

print(f"Found corruption start at line {target_start + 1}")

# Content to insert
insertion = [
    '                            <div class="dashboard-empty">No recent activity yet.</div>\n',
    '                        </div>\n',
    '                    </div>\n',
    '                </section>\n',
    '            </div>\n',
    '        </section>\n',
    '\n',
    '        <!-- ======= MAIN LAYOUT ======= -->\n',
    '        <main class="main-layout" id="workspaceView">\n',
    '\n',
    '            <!-- LEFT: Camera Panel -->\n',
    '            <section class="panel camera-panel">\n',
    '                <div class="panel-header">\n',
    '                    <div class="panel-title" style="display:flex;align-items:center;gap:0.4rem"><i data-lucide="camera"\n',
    '                            style="width:18px;height:18px;"></i> Number Plate Scanner <span id="engineInfoPill"></span></div>\n',
    '                    <div class="header-status-cluster panel-status-cluster" aria-label="Live Status">\n',
    '                        <span class="header-status-pill" id="cameraStatusPill">Camera: Off</span>\n',
    '                        <span class="header-status-pill" id="scannerStatusPill">Scanner: Idle</span>\n',
    '                        <span class="header-status-pill" id="cloudStatusPill">Cloud: Off</span>\n',
    '                        <div class="header-sync-card panel-sync-card" id="headerSyncCard" title="Sync status">\n',
    '                            <div class="header-sync-title">\n',
    '                                <i data-lucide="refresh-cw" style="width:13px;height:13px;"></i>\n',
    '                                <span>Sync Status</span>\n',
    '                            </div>\n',
    '                            <div class="header-sync-sub" id="syncStatusText">Not synced yet</div>\n',
    '                        </div>\n',
    '                    </div>\n',
    '                </div>\n',
    '                <div class="panel-body camera-horizontal">\n',
    '                    <!-- Left Column: Camera Feed -->\n'
]

# Keep the line at target_start: '                        <div class="dashboard-activity-list" id="dashboardRecentActivity">\n'
# Keep the line at target_start + 1: '                    <div class="camera-col-left">\n'
# We insert between them.

new_lines = lines[:target_start+1] + insertion + lines[target_start+1:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Restoration complete.")
