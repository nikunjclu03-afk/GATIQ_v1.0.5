const GatiqAuth = (() => {
    function sanitizeAccessRole(role, { superAdminRole, operatorRole }) {
        return role === superAdminRole ? superAdminRole : operatorRole;
    }

    function getRoleLabel(role, { superAdminRole }) {
        return role === superAdminRole ? 'Super Admin' : 'Operator';
    }

    function getAccessPolicy({ profile, getAllAreas, sanitizeArea, roles }) {
        const accessRole = sanitizeAccessRole(profile?.accessRole, roles);
        const assignedArea = sanitizeArea(profile?.assignedArea);
        return {
            accessRole,
            assignedArea,
            isSuperAdmin: accessRole === roles.superAdminRole,
            allowedAreas: accessRole === roles.superAdminRole ? getAllAreas() : [assignedArea]
        };
    }

    function getDefaultProfile({ defaultArea, roles }) {
        return {
            name: 'GATIQ Operator',
            role: getRoleLabel(roles.operatorRole, roles),
            accessRole: roles.operatorRole,
            assignedArea: defaultArea,
            email: 'operator@gatiq.in',
            phone: '+91 98765 43210',
            plan: 'Starter',
            renewal: 'Renews on 30 Apr 2026'
        };
    }

    function normalizeProfile({ profile, defaultArea, sanitizeArea, normalizeText, roles }) {
        const defaults = getDefaultProfile({ defaultArea, roles });
        const raw = profile && typeof profile === 'object' ? profile : {};
        const legacyRole = normalizeText(raw.role);
        const hasConfirmedAccessRole = raw.accessRoleConfirmed === true;
        const inferredRole = hasConfirmedAccessRole && (legacyRole.includes('super admin') || raw.accessRole === roles.superAdminRole)
            ? roles.superAdminRole
            : roles.operatorRole;
        const accessRole = hasConfirmedAccessRole
            ? sanitizeAccessRole(raw.accessRole || inferredRole, roles)
            : inferredRole;
        const assignedArea = sanitizeArea(raw.assignedArea || defaults.assignedArea);

        return {
            ...defaults,
            ...raw,
            accessRole,
            accessRoleConfirmed: true,
            assignedArea,
            role: getRoleLabel(accessRole, roles)
        };
    }

    function normalizeAuthUser({ user, defaultArea, sanitizeArea, normalizeText, roles }) {
        const normalizedProfile = normalizeProfile({
            profile: user,
            defaultArea,
            sanitizeArea,
            normalizeText,
            roles
        });
        return {
            id: user?.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: normalizedProfile.name,
            email: String(user?.email || normalizedProfile.email || '').trim().toLowerCase(),
            phone: normalizedProfile.phone,
            password: String(user?.password || ''),
            accessRole: normalizedProfile.accessRole,
            accessRoleConfirmed: true,
            assignedArea: normalizedProfile.assignedArea,
            role: normalizedProfile.role,
            plan: normalizedProfile.plan,
            renewal: normalizedProfile.renewal,
            freshWorkspace: user?.freshWorkspace === true
        };
    }

    function getAuthUsers({ storage, storageKey, defaultArea, sanitizeArea, normalizeText, roles }) {
        try {
            const saved = JSON.parse(storage.getItem(storageKey) || '[]');
            return Array.isArray(saved)
                ? saved.map(user => normalizeAuthUser({ user, defaultArea, sanitizeArea, normalizeText, roles }))
                : [];
        } catch {
            return [];
        }
    }

    function saveAuthUsers({ storage, storageKey, users, defaultArea, sanitizeArea, normalizeText, roles }) {
        storage.setItem(storageKey, JSON.stringify(
            users.map(user => normalizeAuthUser({ user, defaultArea, sanitizeArea, normalizeText, roles }))
        ));
    }

    function buildProfileFromAuthUser({ user, defaultArea, sanitizeArea, normalizeText, roles }) {
        return normalizeProfile({
            profile: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                accessRole: user.accessRole,
                accessRoleConfirmed: true,
                assignedArea: user.assignedArea,
                role: user.role,
                plan: user.plan,
                renewal: user.renewal
            },
            defaultArea,
            sanitizeArea,
            normalizeText,
            roles
        });
    }

    function getAuthSession({ storage, storageKey }) {
        try {
            return JSON.parse(storage.getItem(storageKey) || 'null');
        } catch {
            return null;
        }
    }

    function saveAuthSession({ storage, storageKey, session }) {
        storage.setItem(storageKey, JSON.stringify(session));
    }

    function clearAuthSession({ storage, storageKey }) {
        storage.removeItem(storageKey);
    }

    function syncCurrentUserRecord({
        profile,
        getAuthSession,
        getAuthUsers,
        normalizeAuthUser,
        saveAuthUsers,
        saveAuthSession
    }) {
        const session = getAuthSession();
        if (!session?.userId) return;
        const users = getAuthUsers();
        const index = users.findIndex(user => user.id === session.userId);
        if (index === -1) return;

        const nextUser = normalizeAuthUser({
            ...users[index],
            ...profile,
            email: profile.email || users[index].email
        });
        users[index] = nextUser;
        saveAuthUsers(users);
        saveAuthSession({ ...session, userId: nextUser.id, email: nextUser.email });
    }

    function saveProfile({ profile, storageSet, profileKey, normalizeProfile, syncCurrentUserRecord }) {
        const normalized = normalizeProfile(profile);
        storageSet(profileKey, JSON.stringify(normalized));
        syncCurrentUserRecord(normalized);
        return normalized;
    }

    function renderDefaultProfileAvatar(target) {
        if (!target) return;
        target.innerHTML = `
            <span class="profile-summary-avatar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z"></path>
                    <path d="M5 20a7 7 0 0 1 14 0"></path>
                </svg>
            </span>`;
        target.setAttribute('aria-label', 'Default user profile icon');
    }

    function applyAccessPolicy({
        profile,
        getAccessPolicy,
        getAllAreas,
        sanitizeArea,
        getSelectedArea,
        escapeHtml,
        storageSet,
        deploymentKey,
        deploymentAreaSelect,
        profileAccessRole,
        profileAssignedArea,
        profileAccessNote,
        deploymentAreaBadge,
        deploymentAreaHint,
        areaLockedPill,
        areaLockedText,
        setDeploymentAreaOptions,
        updateDeploymentUI,
        updateFacilityLabel,
        syncQuickAreaFilterOptions
    }) {
        const policy = getAccessPolicy(profile);
        const nextArea = policy.isSuperAdmin
            ? sanitizeArea(getSelectedArea?.() || profile.assignedArea)
            : policy.assignedArea;

        if (profileAccessRole) {
            profileAccessRole.value = policy.accessRole;
            profileAccessRole.disabled = !policy.isSuperAdmin;
        }
        if (profileAssignedArea) {
            profileAssignedArea.innerHTML = getAllAreas()
                .map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
                .join('');
            profileAssignedArea.value = profile.assignedArea;
            profileAssignedArea.disabled = !policy.isSuperAdmin;
            setDeploymentAreaOptions(profileAssignedArea, policy.allowedAreas);
        }
        if (profileAccessNote) {
            profileAccessNote.textContent = policy.isSuperAdmin
                ? 'Super admins can switch deployment areas and assign area scope from this profile.'
                : `Operator access is locked to ${policy.assignedArea}. Change requests should go through a super admin.`;
        }
        if (deploymentAreaSelect) {
            deploymentAreaSelect.value = nextArea;
            deploymentAreaSelect.disabled = !policy.isSuperAdmin;
            deploymentAreaSelect.classList.toggle('access-locked', !policy.isSuperAdmin);
            setDeploymentAreaOptions(deploymentAreaSelect, policy.allowedAreas, !policy.isSuperAdmin);
        }
        if (deploymentAreaBadge) {
            deploymentAreaBadge.textContent = policy.isSuperAdmin ? 'Editable' : 'Locked';
            deploymentAreaBadge.classList.toggle('locked', !policy.isSuperAdmin);
        }
        if (deploymentAreaHint) {
            deploymentAreaHint.textContent = policy.isSuperAdmin
                ? 'Changes the data entry fields and report columns.'
                : `Locked by access policy. This operator can only work in ${policy.assignedArea}.`;
        }
        if (areaLockedPill) areaLockedPill.hidden = policy.isSuperAdmin;
        if (areaLockedText) areaLockedText.textContent = `Area: ${policy.assignedArea}`;

        storageSet(deploymentKey, nextArea);
        updateDeploymentUI(nextArea);
        updateFacilityLabel(nextArea);
        syncQuickAreaFilterOptions();
    }

    function renderProfileDetails({
        profile,
        policy,
        getRoleLabel,
        renderDefaultProfileAvatar,
        applyAccessPolicy,
        refs
    }) {
        if (refs.profileName) refs.profileName.value = profile.name;
        if (refs.profileAccessRole) refs.profileAccessRole.value = policy.accessRole;
        if (refs.profileAssignedArea) refs.profileAssignedArea.value = profile.assignedArea;
        if (refs.profileEmail) refs.profileEmail.value = profile.email;
        if (refs.profilePhone) refs.profilePhone.value = profile.phone;
        if (refs.profileSummaryAvatar) renderDefaultProfileAvatar(refs.profileSummaryAvatar);
        if (refs.profileSummaryName) refs.profileSummaryName.textContent = profile.name;
        if (refs.profileSummaryRole) refs.profileSummaryRole.textContent = `${getRoleLabel(policy.accessRole)} | ${profile.assignedArea}`;
        if (refs.profilePlanBadge) refs.profilePlanBadge.textContent = profile.plan;
        if (refs.subscriptionPlanName) refs.subscriptionPlanName.textContent = `${profile.plan} Plan`;
        if (refs.subscriptionRenewalInfo) refs.subscriptionRenewalInfo.textContent = profile.renewal;
        applyAccessPolicy();
    }

    function updateProfileTrigger({
        profile,
        policy,
        getRoleLabel,
        renderDefaultProfileAvatar,
        triggerAvatar,
        triggerName,
        triggerMeta
    }) {
        if (triggerAvatar) renderDefaultProfileAvatar(triggerAvatar);
        if (triggerName) triggerName.textContent = profile.name;
        if (triggerMeta) triggerMeta.textContent = `${getRoleLabel(policy.accessRole)} | ${policy.assignedArea}`;
    }

    return {
        sanitizeAccessRole,
        getRoleLabel,
        getAccessPolicy,
        getDefaultProfile,
        normalizeProfile,
        normalizeAuthUser,
        getAuthUsers,
        saveAuthUsers,
        buildProfileFromAuthUser,
        getAuthSession,
        saveAuthSession,
        clearAuthSession,
        syncCurrentUserRecord,
        saveProfile,
        renderDefaultProfileAvatar,
        applyAccessPolicy,
        renderProfileDetails,
        updateProfileTrigger
    };
})();

if (typeof window !== 'undefined') {
    window.GatiqAuth = GatiqAuth;
}
