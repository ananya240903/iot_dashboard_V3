import { create } from 'zustand';
import { fetchApi } from '../utils/api';

export const useDeviceStore = create((set, get) => ({
    deviceData: null,
    loading: false,
    error: null,
    
    deviceLocations: null,
    locationsLoading: false,

    fetchDeviceData: async (forceRefetch = false) => {
        // If data is already loaded and we don't force a refetch, skip
        if (get().deviceData && !forceRefetch) return;

        // If a fetch is already in progress, don't trigger another one
        if (get().loading) return;

        set({ loading: true, error: null });

        try {
            const result = await fetchApi('/Deviceinformation/device-data');
            // Support both wrapped response { success, data } and raw data arrays depending on API return format
            const actualData = result.data ? result.data : result;
            set({ deviceData: actualData, loading: false });
        } catch (err) {
            console.error("Failed to fetch device data in store:", err);
            set({ error: err.message || "Failed to fetch data from API", loading: false });
        }
    },

    fetchDeviceLocations: async (forceRefetch = false) => {
        if (get().deviceLocations && !forceRefetch) return;
        if (get().locationsLoading) return;

        set({ locationsLoading: true, error: null });

        try {
            const result = await fetchApi('/Deviceinformation/device-locations');
            const actualData = result.data ? result.data : result;
            set({ deviceLocations: actualData, locationsLoading: false });
        } catch (err) {
            console.error("Failed to fetch device locations in store:", err);
            set({ error: err.message || "Failed to fetch locations from API", locationsLoading: false });
        }
    }
}));
