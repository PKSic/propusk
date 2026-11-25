import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ToastContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { LessonsHistoryPage } from './pages/LessonsHistoryPage';
import { SchedulePage } from './pages/SchedulePage';
import { CertificatesPage } from './pages/CertificatesPage';

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/history" element={<LessonsHistoryPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
