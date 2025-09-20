// Authentication functionality for Money Manager application

document.addEventListener('DOMContentLoaded', async function() {
    // Try to restore data if app just started
    try {
        if (localStorage.getItem('app_just_started') !== 'true') {
            console.log('Application just started, attempting to restore data from login page...');
            localStorage.setItem('app_just_started', 'true');
            
            // Wait for data restoration if backup service exists
            if (window.backupService) {
                await window.backupService.restoreData();
            } else {
                console.warn('Backup service not available on login page');
            }
        }
    } catch (error) {
        console.error('Error during data restoration:', error);
    }
    
    // Check if user is already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        // Redirect to main application if already logged in
        window.location.href = 'index.html';
    }

    // Set up event listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-link').addEventListener('click', showRegisterModal);
    document.getElementById('register-btn').addEventListener('click', handleRegister);

    // Initialize Bootstrap components
    const registerModal = new bootstrap.Modal(document.getElementById('register-modal'));
    window.registerModal = registerModal;
    
    // Ensure there's an admin account
    ensureAdminAccount();
});

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    // Get the login button and show loading state
    const loginButton = document.querySelector('button[type="submit"]');
    const originalButtonText = loginButton.textContent;
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    
    // Clear any previous alerts
    const alertElement = document.getElementById('login-alert');
    alertElement.style.display = 'none';
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        showLoginAlert('Please enter your username.');
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
        return;
    }
    
    if (!password) {
        showLoginAlert('Please enter your password.');
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
        return;
    }
    
    try {
        console.log('Starting login process for:', username);
        
        // Try to log in
        const loginSuccess = await attemptLogin(username, password);
        
        if (loginSuccess) {
            // Show success message before redirect
            alertElement.classList.remove('alert-danger');
            alertElement.classList.add('alert-success');
            alertElement.textContent = 'Login successful! Redirecting...';
            alertElement.style.display = 'block';
            
            // Redirect to main application
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
            return;
        }
        
        // If login failed, show error message
        showLoginAlert('Invalid username or password. Please try again.');
        console.log('Login failed for user:', username);
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
        
        // Log debug info but don't show it to user
        try {
            await verifyLoginCredentials(username, password);
        } catch (debugError) {
            console.error('Debug verification error:', debugError);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginAlert('An error occurred during login. Please try again.');
        loginButton.disabled = false;
        loginButton.textContent = originalButtonText;
    }
}

// Attempt to log in with given credentials
async function attemptLogin(username, password) {
    try {
        console.log('Attempting login for user:', username);
        
        // First try server authentication endpoint if it exists
        try {
            const authResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            if (authResponse.ok) {
                const userData = await authResponse.json();
                console.log('Server authentication successful');
                
                // Store user data in local storage
                const userToStore = {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userToStore));
                localStorage.setItem('isAuthenticated', 'true');
                
                return true;
            } else {
                console.log('Server authentication failed, falling back to direct user check');
            }
        } catch (authError) {
            console.log('Auth endpoint not available, falling back to direct user check');
        }
        
        // Fall back to direct user authentication if server auth fails or is unavailable
        const response = await fetch(`/api/users/username/${username}`);
        
        if (!response.ok) {
            console.log(`User not found: ${username}`);
            return false;
        }
        
        const user = await response.json();
        console.log('User found:', username);
        
        // Handle all possible password formats
        let userPassword = user.password;
        
        // Handle null/undefined passwords
        if (userPassword === null || userPassword === undefined) {
            userPassword = "";
        }
        
        // Handle object passwords (from some ORM frameworks)
        if (typeof userPassword === 'object' && userPassword !== null) {
            userPassword = String(userPassword);
        }
        
        // For passwords that might be numbers
        const inputPassword = String(password);
        const storedPassword = String(userPassword);
        
        console.log('Password comparison:', {
            inputType: typeof password,
            storedType: typeof userPassword,
            match: inputPassword === storedPassword
        });
        
        // If passwords don't match, try one more approach with trimming
        if (inputPassword !== storedPassword) {
            const trimmedInput = inputPassword.trim();
            const trimmedStored = storedPassword.trim();
            
            if (trimmedInput !== trimmedStored) {
                console.log('Password mismatch even after trimming');
                return false;
            }
        }
        
        // Store user data in local storage (except password)
        const userToStore = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userToStore));
        localStorage.setItem('isAuthenticated', 'true');
        
        return true;
        
    } catch (error) {
        console.error('Authentication attempt failed:', error);
        return false;
    }
}

// Handle user registration
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    // Validate form
    if (!username || !email || !password || !confirmPassword) {
        showRegisterAlert('All fields are required.');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showRegisterAlert('Username must be between 3 and 20 characters.');
        return;
    }
    
    if (password.length < 6) {
        showRegisterAlert('Password must be at least 6 characters.');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegisterAlert('Passwords do not match.');
        return;
    }
    
    try {
        // Check if username already exists by trying a request
        try {
            const checkResponse = await fetch(`/api/users/username/${username}`);
            if (checkResponse.ok) {
                showRegisterAlert('Username already exists.');
                return;
            }
        } catch (error) {
            // If error is 404, that's good - username doesn't exist
            // Otherwise log the error but continue (could be network issue)
            if (error.message.indexOf('404') === -1) {
                console.warn('Error checking username:', error);
            }
        }
        
        // Create new user with explicit string password
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: String(password) // Ensure password is sent as string
            })
        });
        
        if (!response.ok) {
            try {
                const errorData = await response.json();
                showRegisterAlert(errorData.message || 'Registration failed.');
            } catch (e) {
                showRegisterAlert('Registration failed. Please try again.');
            }
            return;
        }
        
        const newUser = await response.json();
        console.log('User registered successfully:', newUser.username);
        
        // Close modal
        window.registerModal.hide();
        
        // Show success message
        document.getElementById('login-alert').classList.remove('alert-danger');
        document.getElementById('login-alert').classList.add('alert-success');
        document.getElementById('login-alert').textContent = 'Registration successful! You can now log in.';
        document.getElementById('login-alert').style.display = 'block';
        
        // Fill username field
        document.getElementById('username').value = username;
        document.getElementById('password').value = '';
        
        // Backup the new user data
        if (window.backupService) {
            window.backupService.backupUsers();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showRegisterAlert('An error occurred during registration. Please try again.');
    }
}

// Display login alert message
function showLoginAlert(message) {
    const alertElement = document.getElementById('login-alert');
    alertElement.textContent = message;
    alertElement.style.display = 'block';
}

// Display registration alert message
function showRegisterAlert(message) {
    const alertElement = document.getElementById('register-alert');
    alertElement.textContent = message;
    alertElement.style.display = 'block';
}

// Handle API response errors
async function handleApiError(response) {
    if (response.ok) return null;
    
    let errorMessage = 'An unexpected error occurred';
    
    try {
        const errorData = await response.json();
        errorMessage = errorData.message || 'API error: ' + response.status;
    } catch (error) {
        errorMessage = 'API error: ' + response.status;
    }
    
    return errorMessage;
}

// Show registration modal
function showRegisterModal(event) {
    event.preventDefault();
    
    // Clear form and alert
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm-password').value = '';
    document.getElementById('register-alert').style.display = 'none';
    
    // Show modal
    window.registerModal.show();
    
    // Set focus after modal is shown
    document.getElementById('register-modal').addEventListener('shown.bs.modal', function () {
        document.getElementById('reg-username').focus();
    });
}

// Verify a user for troubleshooting purposes
async function verifyUser(username) {
    try {
        // Add error handling for when the API returns 404
        try {
            const response = await fetch(`/api/users/username/${username}`);
            
            if (!response.ok) {
                console.warn(`User ${username} not found - Status: ${response.status}`);
                return null;
            }
            
            const user = await response.json();
            
            // Log useful details but don't expose sensitive data
            const passwordInfo = user.password ? {
                type: typeof user.password,
                isEmpty: user.password === '' || user.password === null,
                length: String(user.password).length
            } : { type: 'undefined', isEmpty: true, length: 0 };
            
            console.log('User data:', { 
                id: user.id, 
                username: user.username,
                email: user.email,
                passwordLength: passwordInfo.length,
                passwordType: passwordInfo.type,
                passwordEmpty: passwordInfo.isEmpty
            });
            
            return user;
        } catch (fetchError) {
            console.error(`Error fetching user ${username}:`, fetchError);
            return null;
        }
    } catch (error) {
        console.error('Error verifying user:', error);
        return null;
    }
}

// Debug function to verify login directly with username and password
async function verifyLoginCredentials(username, password) {
    try {
        // Get user by username
        const response = await fetch(`/api/users/username/${username}`);
        
        if (!response.ok) {
            console.error('Login verification failed: User not found');
            return false;
        }
        
        const user = await response.json();
        
        // Special handling for registration issues
        // If password is null or undefined, try comparing with empty string
        let userPassword = user.password;
        if (userPassword === null || userPassword === undefined) {
            userPassword = "";
            console.warn('User has null/undefined password!');
        }
        
        // For database passwords that might be stored as objects with toString()
        if (typeof userPassword === 'object' && userPassword !== null) {
            console.warn('Password is stored as an object, converting to string');
            userPassword = String(userPassword);
        }
        
        // Convert input password to string for comparison
        const inputPassword = String(password);
        const storedPassword = String(userPassword);
        
        // Show detailed debug info
        console.log('Login verification debug:');
        console.log('- User found:', !!user);
        console.log('- Username:', username);
        console.log('- Password received type:', typeof password);
        console.log('- Password stored type:', typeof userPassword);
        console.log('- Password lengths:', inputPassword.length, 'vs', storedPassword.length);
        console.log('- Password match:', inputPassword === storedPassword);
        
        // For security, don't log actual passwords, just first and last chars for debugging
        if (storedPassword.length > 0 && inputPassword.length > 0) {
            const userPassFirstChar = storedPassword.charAt(0);
            const userPassLastChar = storedPassword.charAt(storedPassword.length - 1);
            const inputPassFirstChar = inputPassword.charAt(0);
            const inputPassLastChar = inputPassword.charAt(inputPassword.length - 1);
            
            console.log('- First chars match:', userPassFirstChar === inputPassFirstChar);
            console.log('- Last chars match:', userPassLastChar === inputPassLastChar);
            
            // Check for common issues
            if (inputPassword !== storedPassword) {
                console.log('- Checking for common issues:');
                console.log('  - Whitespace issue:', inputPassword.trim() === storedPassword.trim());
                console.log('  - Case sensitivity:', inputPassword.toLowerCase() === storedPassword.toLowerCase());
            }
        }
        
        return inputPassword === storedPassword;
    } catch (error) {
        console.error('Login verification error:', error);
        return false;
    }
}

// Function to manually create a session for a user
function createManualSession(userId, username, email) {
    // Store user data in local storage
    const userToStore = {
        id: userId,
        username: username,
        email: email || `${username}@example.com`
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userToStore));
    localStorage.setItem('isAuthenticated', 'true');
    
    console.log('Manual session created for user:', username);
    return true;
}

// Emergency login function - only use when API fails
function emergencyLogin(username, userId) {
    console.log('Attempting emergency login for:', username);
    const loginSuccess = createManualSession(userId || 1, username, `${username}@example.com`);
    
    if (loginSuccess) {
        window.location.href = 'index.html';
    }
    
    return loginSuccess;
}

// Helper function to check if a field exists in console
function debugLoginForm() {
    console.log('Login Form Fields:');
    console.log('Username field exists:', !!document.getElementById('username'));
    console.log('Username value:', document.getElementById('username')?.value);
    console.log('Password field exists:', !!document.getElementById('password'));
    console.log('Password has value:', !!document.getElementById('password')?.value);
}

// Debug functions - Only visible when debug panel is enabled
document.addEventListener('DOMContentLoaded', function() {
    // Debug buttons may be hidden by default - they're for troubleshooting only
    const verifyUserBtn = document.getElementById('verify-user-btn');
    const checkPasswordBtn = document.getElementById('check-password-btn');
    const clearStorageBtn = document.getElementById('clear-storage-btn');
    const emergencyLoginBtn = document.getElementById('emergency-login-btn');
    
    if (verifyUserBtn) {
        verifyUserBtn.addEventListener('click', async () => {
            const username = document.getElementById('debug-username').value;
            if (!username) return;
            
            const user = await verifyUser(username);
            
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput) {
                if (user) {
                    debugOutput.innerHTML = `User found: ${user.username}<br>ID: ${user.id}<br>Email: ${user.email}<br>Has Password: ${!!user.password}<br>Password Type: ${typeof user.password}`;
                } else {
                    debugOutput.innerHTML = `User not found: ${username}`;
                }
            }
        });
    }
    
    if (checkPasswordBtn) {
        checkPasswordBtn.addEventListener('click', async () => {
            const username = document.getElementById('debug-username-check').value;
            const password = document.getElementById('debug-password-check').value;
            
            if (!username || !password) {
                const debugOutput = document.getElementById('debug-output');
                if (debugOutput) {
                    debugOutput.innerHTML = 'Please enter both username and password for checking';
                }
                return;
            }
            
            const result = await verifyLoginCredentials(username, password);
            
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput) {
                debugOutput.innerHTML = `Password check for ${username}: ${result ? 'MATCH' : 'NO MATCH'}<br><br>See console for detailed comparison information`;
            }
        });
    }
    
    if (emergencyLoginBtn) {
        emergencyLoginBtn.addEventListener('click', () => {
            const username = document.getElementById('emergency-username').value;
            const userIdInput = document.getElementById('emergency-userid').value;
            const userId = userIdInput ? parseInt(userIdInput) : null;
            
            if (!username) {
                const debugOutput = document.getElementById('debug-output');
                if (debugOutput) {
                    debugOutput.innerHTML = 'Please enter a username for emergency login';
                }
                return;
            }
            
            const result = emergencyLogin(username, userId);
            
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput && !result) {
                debugOutput.innerHTML = `Emergency login initiated for ${username}`;
            }
        });
    }
    
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAuthenticated');
            
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput) {
                debugOutput.innerHTML = 'Local storage cleared';
            }
        });
    }
});

// Create admin account if it doesn't exist
async function ensureAdminAccount() {
    try {
        // First check if admin account exists
        const checkResponse = await fetch('/api/users/username/admin');
        
        if (checkResponse.ok) {
            console.log('Admin account already exists');
            
            // Show hint about admin account even if it exists
            const loginAlert = document.getElementById('login-alert');
            loginAlert.classList.remove('alert-danger');
            loginAlert.classList.add('alert-info');
            loginAlert.textContent = 'Hint: You can login with username "admin" and password " "';
            loginAlert.style.display = 'block';
            
            return; // Admin already exists, nothing to do
        }
        
        // Create admin account
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                email: 'admin@moneymanager.com',
                password: 'admin123'
            })
        });
        
        if (response.ok) {
            console.log('Admin account created successfully');
            
            // Show hint about admin account
            const loginAlert = document.getElementById('login-alert');
            loginAlert.classList.remove('alert-danger');
            loginAlert.classList.add('alert-info');
            loginAlert.textContent = 'Hint: You can login with username "admin" and password "admin123"';
            loginAlert.style.display = 'block';
            
        } else {
            console.error('Failed to create admin account');
            
            // Try one more time with a test account
            const testResponse = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'test',
                    email: 'test@example.com',
                    password: 'test123'
                })
            });
            
            if (testResponse.ok) {
                console.log('Test account created successfully');
                const loginAlert = document.getElementById('login-alert');
                loginAlert.classList.remove('alert-danger');
                loginAlert.classList.add('alert-info');
                loginAlert.textContent = 'Hint: You can login with username "test" and password "test123"';
                loginAlert.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error ensuring admin account:', error);
    }
}