import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginModal = ({ isOpen, onClose, onSwitchToSignup, onLoggedIn }) => {
    const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            setLoading(true);
            const response = await axios.post('/api/login', {
                email,
                password
            });
            const user = response.data.user;

            // Role Validation based on selected login type
            if (loginType === 'admin') {
                if (user.role !== 'admin' && user.role !== 'staff') {
                    setError('Access Denied: You do not have admin privileges.');
                    return;
                }
            }
            
            const accessToken = response.data.access_token;
            localStorage.setItem('token', accessToken);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Reset form
            setEmail('');
            setPassword('');
            
            // Close modal and navigate
            if (loginType === 'admin') {
                onClose();
                navigate('/dashboard');
            } else {
                if (typeof onLoggedIn === 'function') {
                    onLoggedIn(user, accessToken);
                }
                onClose();
            }
            
        } catch (err) {
            console.error("Login error:", err);
            const msg = err.response?.data?.message || 'Invalid credentials';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8">
                    <div className="text-center mb-6">
                        <img 
                            src="/assets/LNULogo.png" 
                            alt="LNU Logo" 
                            className="h-24 mx-auto mb-4"
                        />
                        <h2 className="text-2xl font-bold text-blue-900">Welcome Back</h2>
                        <p className="text-gray-600 mt-1">Sign in to manage bookings</p>
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

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-6 border border-red-100 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LNU Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="name@lnu.edu.ph"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <button 
                                    type="button"
                                    onClick={() => alert('Forgot password functionality coming soon!')}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-10 pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.25 0-9.75-3.5-11-8 1.272-4.057 5.063-7 9.54-7 1.102 0 2.164.17 3.156.487M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            aria-disabled={loading}
                            aria-busy={loading}
                            className="w-full bg-blue-900 text-white font-bold py-2.5 rounded-lg transition-colors mt-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-900"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?
                            <button 
                                onClick={onSwitchToSignup}
                                className="ml-1 text-blue-900 font-bold hover:underline focus:outline-none"
                            >
                                Sign Up
                            </button>
                        </p>
                    </div>
                </div>
                
                <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-500 border-t border-gray-100">
                    Protected by VenueVisor Security
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
