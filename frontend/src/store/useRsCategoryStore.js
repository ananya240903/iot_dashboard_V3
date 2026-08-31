import { create } from 'zustand';
import { fetchApi } from '../utils/api';

export const useRsCategoryStore = create((set, get) => ({
  // ─── Level 0 + Level 1 shared data ───────────────────────────────────────
  totalAlerts: [],
  repeatedAlerts: [],
  loading: false,
  error: null,

  // ─── Level 1 → Level 2 handoff ───────────────────────────────────────────
  // Stores the clicked alert row (with data_ids) so Level 2 doesn't need to re-fetch
  selectedAlert: null,

  // ─── Fetch both category API endpoints (cached) ──────────────────────────
  fetchCategoryData: async (forceRefetch = false) => {
    if (get().totalAlerts.length > 0 && !forceRefetch) return;
    if (get().loading) return;

    set({ loading: true, error: null });
    try {
      const [totalData, repeatedData] = await Promise.all([
        fetchApi('/RsCategory/alerts/by-category'),
        fetchApi('/RsCategory/alerts/repeated-by-category'),
      ]);

      const updates = { loading: false };
      
      const categoryMap = {
        'Z': 'Others',
        'E': 'EMU',
        'T': 'Train18'
      };

      if (totalData.success) {
        const mappedTotal = totalData.data.map(item => ({
          ...item,
          category: categoryMap[item.category] || item.category
        }));
        updates.totalAlerts = mappedTotal.sort((a, b) => b.totalAlerts - a.totalAlerts);
      }
      if (repeatedData.success) {
        const mappedRepeated = repeatedData.data.map(item => ({
          ...item,
          category: categoryMap[item.category] || item.category
        }));
        updates.repeatedAlerts = mappedRepeated;
      }
      set(updates);
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ─── Fallback for direct URL access to Level 2 (no store data) ───────────
  // Uses search API to reconstruct alert row with data_ids from rsNo + position
  fetchAlertByRsPos: async (rsNo, position) => {
    try {
      const res = await fetchApi(`/RsCategory/alerts/search/${rsNo}`);
      if (res.success && res.data?.length > 0) {
        const match = res.data.find(a => a.position === position) ?? res.data[0];
        return { ...match, isFromRepeated: true, hasAlert: true };
      }
      return null;
    } catch (err) {
      console.error('fetchAlertByRsPos error:', err);
      return null;
    }
  },

  setSelectedAlert: (alert) => set({ selectedAlert: alert }),
  clearSelectedAlert: () => set({ selectedAlert: null }),
}));
