import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [business, setBusiness] = useState(null);
    const navigate = useNavigate();

    // Check if token is expired
    const isTokenExpired = (token) => {
        if (!token) return true;
        if (token === 'DEMO_TOKEN') return false;

        try {
            const decoded = jwtDecode(token);
            return decoded.exp * 1000 < Date.now();
        } catch (error) {
            return true;
        }
    };

    // Load user from localStorage
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedToken = localStorage.getItem('authToken');
                const storedRefreshToken = localStorage.getItem('refreshToken');

                if (storedToken && !isTokenExpired(storedToken)) {
                    // Token is valid
                    if (storedToken === 'DEMO_TOKEN') {
                        setUser({
                            userId: 'demo-user-id',
                            email: 'demo@example.com',
                            role: 'admin'
                        });
                        setToken(storedToken);
                    } else {
                        const decoded = jwtDecode(storedToken);
                        setUser({
                            userId: decoded.userId,
                            email: decoded.email,
                            role: decoded.role
                        });
                        setToken(storedToken);

                        // Load business data
                        if (decoded.businessId) {
                            try {
                                const response = await axios.get(`/api/businesses/${decoded.businessId}`, {
                                    headers: {
                                        Authorization: `Bearer ${storedToken}`
                                    }
                                });
                                setBusiness(response.data);
                            } catch (err) {
                                console.error('Failed to load business:', err);
                            }
                        }
                    }
                } else if (storedRefreshToken) {
                    // Try to refresh token
                    try {
                        const response = await axios.post('/api/auth/refresh', {
                            refreshToken: storedRefreshToken
                        });

                        const { auth_token, refresh_token } = response.data;

                        // Store new tokens
                        localStorage.setItem('authToken', auth_token);
                        localStorage.setItem('refreshToken', refresh_token);

                        // Decode and set user
                        const decoded = jwtDecode(auth_token);
                        setUser({
                            userId: decoded.userId,
                            email: decoded.email,
                            role: decoded.role
                        });
                        setToken(auth_token);

                        // Load business data
                        if (decoded.businessId) {
                            try {
                                const businessResponse = await axios.get(`/api/businesses/${decoded.businessId}`, {
                                    headers: {
                                        Authorization: `Bearer ${auth_token}`
                                    }
                                });
                                setBusiness(businessResponse.data);
                            } catch (err) {
                                console.error('Failed to load business:', err);
                            }
                        }
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('refreshToken');
                    }
                } else {
                    // No valid session found - user needs to login manually
                    console.log('No valid session found - user needs to login');
                }
            } catch (error) {
                console.error('Failed to load user:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password });

            const { auth_token, refresh_token, user: userData, business: businessData } = response.data;

            // Store tokens
            localStorage.setItem('authToken', auth_token);
            localStorage.setItem('refreshToken', refresh_token);

            // Set user and business
            setUser(userData);
            setBusiness(businessData);
            setToken(auth_token);

            return { success: true };
        } catch (error) {
            console.error('Login failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await axios.post('/api/auth/register', userData);

            const { auth_token, refresh_token, user: userDataResponse, business: businessData } = response.data;

            // Store tokens
            localStorage.setItem('authToken', auth_token);
            localStorage.setItem('refreshToken', refresh_token);

            // Set user and business
            setUser(userDataResponse);
            setBusiness(businessData);
            setToken(auth_token);

            return { success: true };
        } catch (error) {
            console.error('Registration failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout', {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Clear state
            setUser(null);
            setToken(null);
            setBusiness(null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            navigate('/login');
        }
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await axios.put('/api/users/profile', profileData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setUser(prev => ({ ...prev, ...response.data }));
            return { success: true };
        } catch (error) {
            console.error('Profile update failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || 'Profile update failed'
            };
        }
    };

    const updatePassword = async (currentPassword, newPassword) => {
        try {
            await axios.put('/api/users/password', {
                currentPassword,
                newPassword
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Password update failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || 'Password update failed'
            };
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                business,
                loading,
                isAuthenticated: !!user && !!token,
                login,
                register,
                logout,
                updateProfile,
                updatePassword
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;