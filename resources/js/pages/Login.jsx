import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            setLoading(true);
            const response = await axios.post('/api/login', { email, password });
            const user = response.data.user;

            // Role Validation based on selected login type
            if (loginType === 'admin') {
                if (user.role !== 'admin' && user.role !== 'staff') {
                    setError('Access Denied: You do not have admin privileges.');
                    return;
                }
            } else {
                // Optional: restrict admins from logging in as 'user'? 
                // Usually admins can access user features, so we'll allow it.
            }

            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(user));
            
            if (loginType === 'admin') {
                navigate('/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-900">VenueVisor</h1>
                    <p className="text-gray-600">Sign in to manage bookings</p>
                </div>
                
                {/* Login Type Toggle */}
                <div className="flex mb-6 border-b border-gray-200">
                    <button
                        type="button"
                        className={`flex-1 py-2 text-center font-medium transition-colors ${
                            loginType === 'user' 
                                ? 'border-b-2 border-blue-900 text-blue-900' 
                                : 'text-gray-500 hover:text-blue-700'
                        }`}
                        onClick={() => setLoginType('user')}
                    >
                        User Login
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2 text-center font-medium transition-colors ${
                            loginType === 'admin' 
                                ? 'border-b-2 border-blue-900 text-blue-900' 
                                : 'text-gray-500 hover:text-blue-700'
                        }`}
                        onClick={() => setLoginType('admin')}
                    >
                        Admin Login
                    </button>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">LNU Email</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-900 text-white py-2 rounded hover:bg-blue-800 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
