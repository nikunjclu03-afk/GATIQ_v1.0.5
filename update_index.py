import re
import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'(<section\s+class="panel\s+log-panel">)(.*?)(</section>)', re.DOTALL)

new_content = r'''
            <section class="panel log-panel" style="display:flex; flex-direction:column;">
                <div class="panel-header" style="flex-direction: column; align-items: stretch; gap: 0.8rem; padding-bottom: 0; flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="panel-title" style="display:flex;align-items:center;gap:0.4rem">
                            <i data-lucide="list-checks" style="width:18px;height:18px;"></i> Gate Workflow
                        </div>
                        <div class="log-stats">
                            <span class="stat-badge" style="background:#fef2f2; border-color:#fca5a5;">Pending: <span class="num" id="pendingReviewCount" style="color:#ef4444;">0</span></span>
                            <span class="stat-badge">Today's Total: <span class="num" id="totalEntries">0</span></span>
                        </div>
                    </div>
                    
                    <div class="auth-tab-row" style="margin-bottom: 0; padding: 0 0.5rem; gap: 1rem; border-bottom: none; justify-content: flex-start;">
                        <button class="auth-tab-btn active" id="tabReviewQueue" type="button" style="padding-bottom: 0.6rem; font-size: 0.9rem; flex:none;">
                            Review Queue
                            <span class="badge" id="reviewQueueBadge" style="background:#ef4444; color:white; border-radius:10px; padding:2px 6px; font-size:10px; margin-left:6px; display:none;">0</span>
                        </button>
                        <button class="auth-tab-btn" id="tabRecentLogs" type="button" style="padding-bottom: 0.6rem; font-size: 0.9rem; flex:none;">
                            Recent Logs
                        </button>
                    </div>
                </div>
                <!-- Content area needs to flex and hide overflow if we want independent scroll, but currently we rely on panel default behavior -->
                <div class="panel-body" style="padding-top: 0.5rem; display:flex; flex-direction:column; flex:1;">
                    
                    <!-- NEW Review Queue Pane -->
                    <div class="log-table-wrap tab-pane" id="paneReviewQueue" style="flex:1;">
                        <table class="log-table" id="reviewTable">
                            <thead>
                                <tr>
                                    <th>Detected Plate</th>
                                    <th>Confidence</th>
                                    <th>Direction</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="reviewTableBody"></tbody>
                        </table>
                        
                        <div class="empty-state" id="reviewEmptyState" style="margin-top:2rem;">
                            <div class="empty-icon"><i data-lucide="check-circle" style="width:3rem;height:3rem; color:var(--text-tertiary);"></i></div>
                            <h3>All caught up</h3>
                            <p>No pending scans to review.</p>
                        </div>
                    </div>

                    <!-- Existing Log Pane -->
                    <div class="log-table-wrap tab-pane hidden" id="paneRecentLogs" style="display:none; flex:1;">
                        <table class="log-table" id="logTable">
                            <thead id="logTableHead">
                                <tr>
                                    <th>Sr. No.</th>
                                    <th>Gate No.</th>
                                    <th>Vehicle No.</th>
                                    <th>Time</th>
                                    <th>Entry / Exit</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="logTableBody"></tbody>
                        </table>

                        <div class="empty-state" id="emptyState" style="display:none; margin-top:2rem;">
                            <div class="empty-icon"><i data-lucide="clipboard-list" style="width:3rem;height:3rem;"></i></div>
                            <h3>No log entries yet</h3>
                            <p>Confirmed scans will appear here.</p>
                        </div>
                    </div>
                </div>
            </section>
'''

def repl(m):
    return new_content.strip()

replaced_content = pattern.sub(repl, content)

if replaced_content == content:
    print("No changes made. Pattern not found.")
    sys.exit(1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(replaced_content)
print("Updated index.html successfully.")
