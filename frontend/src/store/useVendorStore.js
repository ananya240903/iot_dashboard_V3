import { create } from 'zustand';
import { fetchApi } from '../utils/api';

export const useVendorStore = create((set, get) => ({
    vendors: [],
    loading: false,
    error: null,
    
    fetchVendors: async (forceRefetch = false) => {
        // If data is already loaded and we don't force a refetch, skip
        if (get().vendors.length > 0 && !forceRefetch) return;

        // If a fetch is already in progress, don't trigger another one
        if (get().loading) return;

        set({ loading: true, error: null });

        try {
            const result = await fetchApi('/DeviceMasterinformation/vendors');
            const actualData = result.data ? result.data : result;
            set({ vendors: Array.isArray(actualData) ? actualData : [], loading: false });
        } catch (err) {
            console.error("Failed to fetch vendors in store:", err);
            set({ error: err.message || "Failed to fetch vendors from API", loading: false });
        }
    }
}));
