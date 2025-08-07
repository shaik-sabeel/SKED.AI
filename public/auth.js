// Authentication class to handle login and signup
class Auth {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api'; // Make sure this matches your server port
        this.init();
        this.checkAuthStatus(); // New: Check auth status on page load
    }

    init() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    }

    // New: Check if user is logged in
    checkAuthStatus() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                // If on login/signup page and already logged in, redirect to index
                if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html')) {
                    window.location.href = 'index.html';
                }
                // Optionally decode token to get user name, etc., for display on index.html
                const userInfo = JSON.parse(user);
                if (window.location.pathname.endsWith('index.html')) {
                    const userNameSpan = document.getElementById('user-name');
                    if (userNameSpan) {
                        userNameSpan.textContent = `Welcome, ${userInfo.name}!`;
                    }
                }
            } catch (error) {
                console.error("Error parsing user info from localStorage:", error);
                this.logout(); // Clear corrupted data
            }
        } else {
            // If on index.html and not logged in, redirect to login
            if (window.location.pathname.endsWith('index.html')) {
                this.logout();
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('All fields are required');
            return;
        }

        try {
            console.log('Attempting to login...');
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('Login Response data:', data);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user)); // Store user object (id, name, email)
                window.location.href = 'index.html';
            } else {
                this.showError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Unable to connect to the server. Please ensure the backend is running and try again later.');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            this.showError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        try {
            console.log('Attempting to sign up...');
            const response = await fetch(`${this.apiUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();
            console.log('Signup Response data:', data);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user)); // Store user object (id, name, email)
                window.location.href = 'index.html';
            } else {
                this.showError(data.message || 'Signup failed. This email might already be in use.');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Unable to connect to the server. Please ensure the backend is running and try again later.');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    getToken() {
        return localStorage.getItem('token');
    }

    showError(message) {
        let errorElement = document.querySelector('.auth-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'auth-error';
            const authForm = document.querySelector('.auth-form');
            if(authForm) {
                authForm.prepend(errorElement);
            } else {
                console.warn("Could not find .auth-form to prepend error element.");
                // As a fallback, maybe append to body if it's not a typical auth page
                document.body.appendChild(errorElement);
            }
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';

        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Global instance for reuse
window.auth = new Auth(); // Make it globally accessible for other scripts if needed

// Add logout functionality (can be done here or in script.js as you had it)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.auth.logout();
        });
    }
});