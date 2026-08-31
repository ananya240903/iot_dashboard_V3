import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import DeviceTypeStatus from './components/DeviceTypeStatus/DeviceTypeStatus';
import LiveAlertsOverview from './pages/liveAlerts/LiveAlertsOverview';
import VehicleAlertsSearch from './pages/shared/VehicleAlertsSearch';
import DataRecordView from './pages/shared/DataRecordView';
import RsCategoryOverview from './pages/rsCategory/RsCategoryOverview';
import RsCategoryDetail from './pages/rsCategory/RsCategoryDetail';
import RsCategoryPayload from './pages/rsCategory/RsCategoryPayload';
import RsCategoryDataView from './pages/rsCategory/RsCategoryDataView';

import ZoneAnalysisOverview from './pages/zoneAnalysis/ZoneAnalysisOverview';
import ZoneConnectionDetails from './pages/zoneAnalysis/ZoneConnectionDetails';
import ZoneCalibrationDetails from './pages/zoneAnalysis/ZoneCalibrationDetails';
import ZoneAlertDetails from './pages/zoneAnalysis/ZoneAlertDetails';
import ZoneDeviceDataView from './pages/zoneAnalysis/ZoneDeviceDataView';
import ZoneDataRecordView from './pages/zoneAnalysis/ZoneDataRecordView';
import AllSensorDataOverview from './pages/allSensorData/AllSensorDataOverview';
import UnevenLoadedOverview from './pages/analysis/UnevenLoadedOverview';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/alerts/live" replace />} />
        <Route path="device-status"      element={<DeviceTypeStatus />} />
        <Route path="alerts/live"        element={<LiveAlertsOverview />} />
        <Route path="alerts/vehicle/:vehicleNo" element={<VehicleAlertsSearch />} />
        <Route path="alerts/data/:dataId" element={<DataRecordView />} />
        
        {/* All Sensor Data */}
        <Route path="all-data"           element={<AllSensorDataOverview />} />
        
        {/* Analysis */}
        <Route path="analysis/uneven-loaded" element={<UnevenLoadedOverview />} />
        
        {/* RS Category Routes */}
        <Route path="alerts/rs-category" element={<RsCategoryOverview />} />
        <Route path="alerts/rs-category/:category" element={<RsCategoryDetail />} />
        <Route path="alerts/rs-category/:category/:rsNo/:position" element={<RsCategoryPayload />} />
        <Route path="alerts/rs-category/:category/:rsNo/:position/:dataId" element={<RsCategoryDataView />} />
        
        {/* Zone Analysis Routes (Replaces device-data) */}
        <Route path="zone-analysis" element={<ZoneAnalysisOverview />} />
        <Route path="zone-analysis/connection" element={<ZoneConnectionDetails />} />
        <Route path="zone-analysis/calibration" element={<ZoneCalibrationDetails />} />
        <Route path="zone-analysis/alerts" element={<ZoneAlertDetails />} />
        <Route path="zone-analysis/device/:deviceId" element={<ZoneDeviceDataView />} />
        <Route path="zone-analysis/data/:dataId" element={<ZoneDataRecordView />} />
        
        {/* Catch-all: unknown paths → default */}
        <Route path="*" element={<Navigate to="/alerts/live" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
