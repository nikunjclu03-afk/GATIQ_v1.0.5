import re
import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert Exception Dashboard after the "Overview" section.
# We'll locate the end of the Dashboard Stats Grid.
anchor = '                                <small>Quick Access records</small>\n                            </article>\n                        </div>\n                    </div>\n                </section>'

insertion = '''
                <!-- EXCEPTIONS DASHBOARD (Phase 1) -->
                <section class="panel dashboard-panel" id="exceptionDashboardPanel" style="display:none;">
                    <div class="panel-header">
                        <div class="panel-title" style="color:#ef4444;"><i data-lucide="alert-triangle" style="width:18px;height:18px;"></i> Exception Dashboard</div>
                    </div>
                    <div class="panel-body">
                        <div class="dashboard-stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));">
                            <article class="dashboard-stat-card" style="background:#fef2f2; border:1px solid #fca5a5;">
                                <span>Unreadable Scans</span>
                                <strong id="excUnreadableCount" style="color:#ef4444;">0</strong>
                            </article>
                            <article class="dashboard-stat-card" style="background:#fffbeb; border:1px solid #fcd34d;">
                                <span>Missing Purpose</span>
                                <strong id="excMissingPurposeCount" style="color:#d97706;">0</strong>
                            </article>
                            <article class="dashboard-stat-card" style="background:#fef2f2; border:1px solid #fca5a5;">
                                <span>Manual Entries</span>
                                <strong id="excManualEntriesCount" style="color:#ef4444;">0</strong>
                            </article>
                            <article class="dashboard-stat-card">
                                <span>Pending Exits</span>
                                <strong id="excPendingExitsCount">0</strong>
                            </article>
                            <article class="dashboard-stat-card">
                                <span>Open Visits</span>
                                <strong id="excOpenVisitsCount">0</strong>
                            </article>
                            <article class="dashboard-stat-card">
                                <span>Overstays</span>
                                <strong id="excOverstaysCount">0</strong>
                            </article>
                            <article class="dashboard-stat-card" style="background:#fef2f2; border:1px solid #fca5a5;">
                                <span>Failed Scans</span>
                                <strong id="excFailedScansCount" style="color:#ef4444;">0</strong>
                            </article>
                        </div>
                    </div>
                </section>
'''

if anchor in content:
    new_content = content.replace(anchor, anchor + '\n' + insertion)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added Exception Dashboard UI.")
else:
    print("Anchor not found!")
