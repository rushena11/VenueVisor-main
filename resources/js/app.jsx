import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReservationForm from './pages/ReservationForm';
import PublicDashboard from './pages/PublicDashboard';
import Layout from './components/Layout';
import Reservations from './pages/Reservations';
import Venues from './pages/Venues';
import BugReports from './pages/BugReports';
import ViewReports from './pages/ViewReports';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PublicDashboard />} />
                <Route path="/login" element={<Login />} />
                <Route element={<Layout />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="reservations" element={<Reservations />} />
                    <Route path="reservation/new" element={<ReservationForm />} />
                    <Route path="venues" element={<Venues />} />
                    <Route path="bug-reports" element={<BugReports />} />
                    <Route path="reports" element={<ViewReports />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
