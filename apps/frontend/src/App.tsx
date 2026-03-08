import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import HomeRedirect from './pages/HomeRedirect'
import SelectFamily from './pages/SelectFamily'
import Setup from './pages/Setup'
import FamilyDashboard from './pages/FamilyDashboard'
import Attendance from './pages/Attendance'
import Subjects from './pages/Subjects'
import DashboardLayout from './components/layout/DashboardLayout'
import SettingsLayout from './components/layout/SettingsLayout'
import SettingsFamilies from './pages/settings/Families'
import SettingsStudents from './pages/settings/Students'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/select-family" element={<SelectFamily />} />
      <Route path="/setup" element={<Setup />} />

      {/* Family-scoped routes */}
      <Route path="/family/:familyId" element={<DashboardLayout />}>
        <Route index element={<FamilyDashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="subjects" element={<Subjects />} />
      </Route>

      {/* Settings */}
      <Route path="/settings" element={<SettingsLayout />}>
        <Route index element={<Navigate to="/settings/families" replace />} />
        <Route path="families" element={<SettingsFamilies />} />
        <Route path="students" element={<SettingsStudents />} />
      </Route>
    </Routes>
  )
}
