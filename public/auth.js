class Auth {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.init();
        this.checkAuthStatus();
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

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html')) {
                    window.location.href = 'index.html';
                }
                const userInfo = JSON.parse(user);
                if (window.location.pathname.endsWith('index.html')) {
                    const userNameSpan = document.getElementById('user-name');
                    if (userNameSpan) {
                        userNameSpan.textContent = `Welcome, ${userInfo.name}!`;
                    }
                }
            } catch (error) {
                console.error("Error parsing user info from localStorage:", error);
                this.logout();
            }
        } else {
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
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
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
            const response = await fetch(`${this.apiUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
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

window.auth = new Auth();

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.auth.logout();
        });
    }
});