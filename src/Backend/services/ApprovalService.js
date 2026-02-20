/**
 * ApprovalService — Client-side approval workflow orchestration.
 *
 * Ported from:
 *   scripts/Approval_Automation.gs → doPost() action routing
 *   config/BackendFlow.js → WORKFLOW_STAGES, ROLE_PERMISSIONS, APPROVAL_ROUTING
 *   src/services/LocalApiService.js → request management
 *
 * Manages the full lifecycle:
 *   DRAFT → PENDING → APPROVED/REJECTED → (Re-open → DRAFT)
 *
 * Dual-backend support:
 *   - Local Express (localhost:3001) — CMS state management
 *   - Google Apps Script — widget creation on production backend
 */

import { WORKFLOW_STAGES, ROLE_PERMISSIONS, APPROVAL_ROUTING } from '../../config/BackendFlow';

const LOCAL_BASE = '/api/local';

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
        const stored = localStorage.getItem('optimus_user');
        if (stored) {
            const user = JSON.parse(stored);
            headers['X-Optimus-User'] = user.email || '';
            headers['X-Optimus-Role'] = user.role || 'MAKER';
        }
    } catch { /* ignore */ }
    return headers;
}

async function localRequest(path, options = {}) {
    const res = await fetch(`${LOCAL_BASE}${path}`, {
        headers: getHeaders(),
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        const err = new Error(body.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export const ApprovalService = {
    // ── Workflow State ──

    /**
     * Check if a transition is allowed.
     * @param {string} currentStatus - Current workflow status
     * @param {string} targetStatus - Desired next status
     * @returns {boolean}
     */
    canTransition(currentStatus, targetStatus) {
        const stage = WORKFLOW_STAGES[currentStatus];
        return stage ? stage.next.includes(targetStatus) : false;
    },

    /**
     * Get allowed actions for a role + status combination.
     * @param {string} role - 'MAKER' | 'CHECKER' | 'SUPER_ADMIN'
     * @param {string} status - 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
     * @returns {Object} Permission flags
     */
    getPermissions(role, status) {
        const perms = ROLE_PERMISSIONS[role] || {};
        const stage = WORKFLOW_STAGES[status];
        if (!stage) return {};

        return {
            canEdit: perms.canEdit && stage.editableBy?.includes(role),
            canSubmit: perms.canSubmit && stage.next?.includes('PENDING'),
            canApprove: perms.canApprove && stage.next?.includes('APPROVED'),
            canReject: perms.canReject && stage.next?.includes('REJECTED'),
            canReopen: perms.canReopen && status === 'APPROVED',
            canDeploy: perms.canDeploy && status === 'APPROVED',
        };
    },

    /**
     * Get the Apps Script function route for a widget type.
     * @param {string} widgetType - Canvas widget type
     * @returns {{ fn, script, description } | null}
     */
    getRoute(widgetType) {
        return APPROVAL_ROUTING[widgetType] || null;
    },

    // ── Request Management (Local Backend) ──

    /**
     * Create a new draft request with widgets.
     * @param {Object} data - { widgets, headerWidgets }
     * @returns {Promise<Object>} Created request
     */
    async createRequest(data) {
        return localRequest('/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Submit a draft request for review (DRAFT → PENDING).
     * @param {string} requestId
     * @returns {Promise<Object>}
     */
    async submit(requestId) {
        return localRequest(`/requests/${requestId}/submit`, { method: 'POST' });
    },

    /**
     * Approve a pending request (PENDING → APPROVED).
     * @param {string} requestId
     * @param {string[]} selectedWidgetIds - Subset of widgets to approve
     * @returns {Promise<Object>}
     */
    async approve(requestId, selectedWidgetIds = []) {
        return localRequest(`/requests/${requestId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ selectedWidgetIds }),
        });
    },

    /**
     * Reject a pending request (PENDING → REJECTED).
     * @param {string} requestId
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object>}
     */
    async reject(requestId, reason) {
        return localRequest(`/requests/${requestId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    /**
     * Re-open an approved request (APPROVED → DRAFT).
     * @param {string} requestId
     * @returns {Promise<Object>}
     */
    async reopen(requestId) {
        return localRequest(`/requests/${requestId}/reopen`, { method: 'POST' });
    },

    /**
     * Get all requests with optional status filter.
     * @param {Object} params - { status }
     * @returns {Promise<Object[]>}
     */
    async getRequests(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return localRequest(`/requests${qs ? '?' + qs : ''}`);
    },
};
