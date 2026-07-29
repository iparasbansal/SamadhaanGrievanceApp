/* eslint-disable react-refresh/only-export-components */
// 🌐 React Core
import React, { useState, createContext, useContext } from "react";
import { loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [skipped, setSkipped] = useState(false);

    const login = async (email, password) => {
        const data = await loginUser({ email, password });
        console.log("Login API response:", data);
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            console.log("User object stored:", data.user);
        } else if (data.msg) {
            throw new Error(data.msg);
        }
        return data;
    };

    const register = async (userData) => {
        const data = await registerUser(userData);
        console.log("Register API response:", data);
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            console.log("User object stored:", data.user);
        } else if (data.msg) {
            throw new Error(data.error || data.msg);
        }
        return data;
    };


    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setSkipped(false);
    };

    const skipLogin = () => {
        setSkipped(true);
    };

    const unskip = () => {
        setSkipped(false);
    };

    const value = { 
        user,
        token,
        skipped,
        login,
        register,
        logout,
        skipLogin,
        unskip,
        isAuthenticated: !!token,
        userRole: user ? user.role : 'guest',
        isAuthority: user && (user.role === 'authority' || user.role === 'super_admin'),
        isSuperAdmin: user && user.role === 'super_admin',
        firstName: user ? user.firstName : 'Guest',
        departmentId: user ? user.departmentId : null,
        isEmailVerified: true, // Assuming all users from the new DB are verified
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    return useContext(AuthContext);
};
