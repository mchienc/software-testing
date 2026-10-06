const BASE_URL = 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

export const api = {
  // Suites
  getSuites: async () => {
    const res = await fetch(`${API_URL}/suites`);
    if (!res.ok) throw new Error('Failed to fetch test suites');
    return res.json();
  },

  createSuite: async (suiteData) => {
    const res = await fetch(`${API_URL}/suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suiteData),
    });
    if (!res.ok) throw new Error('Failed to create test suite');
    return res.json();
  },

  deleteSuite: async (suiteId) => {
    const res = await fetch(`${API_URL}/suites/${suiteId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete suite');
    return res.json();
  },

  runSuite: async (suiteId, payload = {}) => {
    const res = await fetch(`${API_URL}/suites/${suiteId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Run failed' }));
      throw new Error(err.detail || 'Test execution failed');
    }
    return res.json();
  },

  getSuiteRuns: async (suiteId) => {
    const res = await fetch(`${API_URL}/suites/${suiteId}/runs`);
    if (!res.ok) throw new Error('Failed to fetch suite runs');
    return res.json();
  },

  captureBaseline: async (suiteId, payload = {}) => {
    const res = await fetch(`${API_URL}/suites/${suiteId}/capture-baseline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Capture failed' }));
      throw new Error(err.detail || 'Capture baseline failed');
    }
    return res.json();
  },

  getSuiteBaselines: async (suiteId) => {
    const res = await fetch(`${API_URL}/suites/${suiteId}/baselines`);
    if (!res.ok) throw new Error('Failed to fetch suite baselines');
    return res.json();
  },

  // Runs
  getRuns: async () => {
    const res = await fetch(`${API_URL}/runs`);
    if (!res.ok) throw new Error('Failed to fetch runs');
    return res.json();
  },

  getRunDetails: async (runId) => {
    const res = await fetch(`${API_URL}/runs/${runId}`);
    if (!res.ok) throw new Error('Failed to fetch run details');
    return res.json();
  },

  approveBaseline: async (runId) => {
    const res = await fetch(`${API_URL}/runs/${runId}/approve`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to approve baseline');
    return res.json();
  },

  // Helper to resolve full image URL
  getImageUrl: (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  },

  getReportUrl: (runId) => `${API_URL}/runs/${runId}/report`,
};
