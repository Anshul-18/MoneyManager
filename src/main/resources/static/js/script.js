// Money Manager Application JavaScript

// Global variables
let currentUser = null;
let allUsers = [];
let allTransactions = [];
let categories = new Set();
let transactionModal = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check if we need to restore data (app just started)
        if (localStorage.getItem('app_just_started') !== 'true') {
            console.log('Application just started, attempting to restore data...');
            localStorage.setItem('app_just_started', 'true');
            
            // Wait for data restoration
            if (window.backupService) {
                await window.backupService.restoreData();
            } else {
                console.warn('Backup service not available');
            }
        }
    } catch (error) {
        console.error('Error during data restoration:', error);
    }
    
    // Check authentication
    checkAuth();
    
    // Initialize Bootstrap components
    transactionModal = new bootstrap.Modal(document.getElementById('transaction-modal'));
    
    // Set up event listeners
    setupEventListeners();
    
    // Set default date in the transaction form
    document.getElementById('date').value = new Date().toISOString().slice(0, 16);
});

// Check if user is authenticated
function checkAuth() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const storedUser = localStorage.getItem('currentUser');
    
    console.log('Authentication check:', { isAuthenticated, hasStoredUser: !!storedUser });
    
    if (!isAuthenticated || !storedUser) {
        // Redirect to login page if not authenticated
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Set current user from local storage
        currentUser = JSON.parse(storedUser);
        
        console.log('Current user loaded:', { 
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email 
        });
        
        // Update UI with current user
        document.getElementById('current-user').textContent = currentUser.username;
        
        // Verify the user exists on the server
        verifyCurrentUser();
        
        // Load user data
        loadUserTransactions(currentUser.id);
        loadFinancialSummary(currentUser.id);
    } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAuthenticated');
        window.location.href = 'login.html';
    }
}

// Verify the current user exists on the server
async function verifyCurrentUser() {
    if (!currentUser || !currentUser.username) return;
    
    try {
        const response = await fetch(`/api/users/username/${currentUser.username}`);
        if (!response.ok) {
            console.warn('Current user no longer exists on server');
            logout();
            return;
        }
        
        const userData = await response.json();
        console.log('User verified with server:', userData.username);
    } catch (error) {
        console.error('Error verifying current user:', error);
    }
}

// Set up event listeners for UI interaction
function setupEventListeners() {
    // Navigation links
    document.getElementById('dashboard-link').addEventListener('click', showDashboard);
    document.getElementById('transactions-link').addEventListener('click', showTransactions);
    document.getElementById('profile-link').addEventListener('click', showProfile);
    
    // Transaction filters
    document.getElementById('filter-type').addEventListener('change', filterTransactions);
    document.getElementById('filter-category').addEventListener('change', filterTransactions);
    
    // Action buttons
    document.getElementById('add-transaction-btn').addEventListener('click', showAddTransactionModal);
    document.getElementById('save-transaction').addEventListener('click', saveTransaction);
    
    // Profile form
    document.getElementById('profile-form').addEventListener('submit', updateProfile);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// Logout function
function logout() {
    // Clear authentication data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Select a user and load their data
function selectUser(user) {
    currentUser = user;
    document.getElementById('current-user').textContent = user.username;
    
    // Load user data
    loadUserTransactions(user.id);
    loadFinancialSummary(user.id);
    
    // Update profile form
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('password').value = '';
}

// Load transactions for a user
function loadUserTransactions(userId) {
    fetch(`/api/transactions/user/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(transactions => {
            allTransactions = transactions;
            populateTransactionsTable(transactions);
            populateRecentTransactionsTable(transactions.slice(0, 5));
            updateCategoryFilter(transactions);
            
            // Backup transactions after loading
            if (window.backupService) {
                window.backupService.backupTransactions();
            }
        })
        .catch(error => {
            console.error('Error loading transactions:', error);
            
            // Try to load from backup if API failed
            if (window.backupService) {
                const storedTransactions = window.backupService.getStoredTransactions();
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                if (currentUser && storedTransactions.length > 0) {
                    // Filter transactions for current user
                    const userTransactions = storedTransactions.filter(t => t.userId === currentUser.id);
                    
                    if (userTransactions.length > 0) {
                        console.log(`Loaded ${userTransactions.length} transactions from local backup`);
                        allTransactions = userTransactions;
                        populateTransactionsTable(userTransactions);
                        populateRecentTransactionsTable(userTransactions.slice(0, 5));
                        updateCategoryFilter(userTransactions);
                        showAlert('Loaded transactions from local storage backup. Some features may be limited.', 'warning');
                        return;
                    }
                }
            }
            
            showAlert('Failed to load transactions. Please try again later.', 'danger');
        });
}

// Load financial summary for a user
function loadFinancialSummary(userId) {
    fetch(`/api/transactions/user/${userId}/summary`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(summary => {
            document.getElementById('total-income').textContent = formatCurrency(summary.income);
            document.getElementById('total-expenses').textContent = formatCurrency(summary.expense);
            document.getElementById('current-balance').textContent = formatCurrency(summary.balance);
        })
        .catch(error => {
            console.error('Error loading summary:', error);
            
            // Calculate summary from local transactions if API failed
            if (window.backupService) {
                const storedTransactions = window.backupService.getStoredTransactions();
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                
                if (currentUser && storedTransactions.length > 0) {
                    // Filter transactions for current user
                    const userTransactions = storedTransactions.filter(t => t.userId === currentUser.id);
                    
                    if (userTransactions.length > 0) {
                        // Calculate income, expenses, and balance
                        let income = 0;
                        let expense = 0;
                        
                        userTransactions.forEach(transaction => {
                            if (transaction.type === 'INCOME') {
                                income += parseFloat(transaction.amount);
                            } else if (transaction.type === 'EXPENSE') {
                                expense += parseFloat(transaction.amount);
                            }
                        });
                        
                        const balance = income - expense;
                        
                        document.getElementById('total-income').textContent = formatCurrency(income);
                        document.getElementById('total-expenses').textContent = formatCurrency(expense);
                        document.getElementById('current-balance').textContent = formatCurrency(balance);
                        
                        console.log('Loaded financial summary from local backup');
                        return;
                    }
                }
            }
            
            // Set default values if no data is available
            document.getElementById('total-income').textContent = formatCurrency(0);
            document.getElementById('total-expenses').textContent = formatCurrency(0);
            document.getElementById('current-balance').textContent = formatCurrency(0);
        });
}

// Populate transactions table
function populateTransactionsTable(transactions) {
    const tableBody = document.getElementById('transactions-body');
    tableBody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = transaction.type === 'INCOME' ? 'income-row' : 'expense-row';
        
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.category || 'Uncategorized'}</td>
            <td>${transaction.description}</td>
            <td>${transaction.type}</td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action edit-btn" data-id="${transaction.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger btn-action delete-btn" data-id="${transaction.id}">Delete</button>
            </td>
        `;
        
        // Add event listeners for action buttons
        row.querySelector('.edit-btn').addEventListener('click', () => editTransaction(transaction));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteTransaction(transaction.id));
        
        tableBody.appendChild(row);
    });
}

// Populate recent transactions table on dashboard
function populateRecentTransactionsTable(transactions) {
    const tableBody = document.getElementById('recent-transactions-body');
    tableBody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = transaction.type === 'INCOME' ? 'income-row' : 'expense-row';
        
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.category || 'Uncategorized'}</td>
            <td>${transaction.description}</td>
            <td>${transaction.type}</td>
            <td>${formatCurrency(transaction.amount)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update category filter dropdown
function updateCategoryFilter(transactions) {
    const select = document.getElementById('filter-category');
    const currentValue = select.value;
    
    // Clear existing categories
    categories = new Set();
    
    // Extract categories from transactions
    transactions.forEach(transaction => {
        if (transaction.category) {
            categories.add(transaction.category);
        }
    });
    
    // Reset select options
    select.innerHTML = '<option value="ALL">All Categories</option>';
    
    // Add options for each category
    Array.from(categories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    // Restore previous selection if it exists
    if (Array.from(select.options).some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
}

// Filter transactions based on selected type and category
function filterTransactions() {
    const typeFilter = document.getElementById('filter-type').value;
    const categoryFilter = document.getElementById('filter-category').value;
    
    let filteredTransactions = allTransactions;
    
    // Apply type filter
    if (typeFilter !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'ALL') {
        filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
    }
    
    populateTransactionsTable(filteredTransactions);
}

// Show the add transaction modal
function showAddTransactionModal() {
    // Reset form
    document.getElementById('transaction-id').value = '';
    document.getElementById('type-income').checked = true;
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('category').value = '';
    document.getElementById('date').value = new Date().toISOString().slice(0, 16);
    
    // Update modal title
    document.getElementById('modal-title').textContent = 'Add Transaction';
    
    // Show modal
    transactionModal.show();
}

// Edit an existing transaction
function editTransaction(transaction) {
    // Fill form with transaction data
    document.getElementById('transaction-id').value = transaction.id;
    document.getElementById('type-income').checked = transaction.type === 'INCOME';
    document.getElementById('type-expense').checked = transaction.type === 'EXPENSE';
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('description').value = transaction.description;
    document.getElementById('category').value = transaction.category || '';
    document.getElementById('date').value = transaction.date ? transaction.date.substring(0, 16) : '';
    
    // Update modal title
    document.getElementById('modal-title').textContent = 'Edit Transaction';
    
    // Show modal
    transactionModal.show();
}

// Save a transaction (create new or update existing)
function saveTransaction() {
    const id = document.getElementById('transaction-id').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    
    if (!amount || !description || !category || !date) {
        showAlert('Please fill in all fields.', 'warning');
        return;
    }
    
    const transaction = {
        id: id || null,
        type: type,
        amount: amount,
        description: description,
        category: category,
        date: `${date}:00Z`,
        userId: currentUser.id
    };
    
    const isNewTransaction = !id;
    const url = isNewTransaction ? '/api/transactions' : `/api/transactions/${id}`;
    const method = isNewTransaction ? 'POST' : 'PUT';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(transaction)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save transaction');
        }
        return response.json();
    })
    .then(() => {
        transactionModal.hide();
        loadUserTransactions(currentUser.id);
        loadFinancialSummary(currentUser.id);
        showAlert(`Transaction ${isNewTransaction ? 'added' : 'updated'} successfully!`, 'success');
        
        // Backup data after transaction changes
        if (window.backupService) {
            window.backupService.backupAllData();
            showBackupToast();
        }
    })
    .catch(error => {
        console.error('Error saving transaction:', error);
        showAlert('Failed to save transaction. Please try again.', 'danger');
    });
}

// Delete a transaction
function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete transaction');
        }
        loadUserTransactions(currentUser.id);
        loadFinancialSummary(currentUser.id);
        showAlert('Transaction deleted successfully!', 'success');
        
        // Backup data after transaction deletion
        if (window.backupService) {
            window.backupService.backupAllData();
            showBackupToast();
        }
    })
    .catch(error => {
        console.error('Error deleting transaction:', error);
        showAlert('Failed to delete transaction. Please try again.', 'danger');
    });
}

// Update user profile
function updateProfile(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email) {
        showAlert('Email is required.', 'warning');
        return;
    }
    
    const userData = {
        id: currentUser.id,
        username: currentUser.username,
        email: email
    };
    
    if (password) {
        userData.password = password;
    }
    
    fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        return response.json();
    })
    .then(updatedUser => {
        // Update current user data in memory and localStorage
        currentUser.email = updatedUser.email;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        document.getElementById('password').value = '';
        showAlert('Profile updated successfully!', 'success');
        
        // If password was changed, require re-login
        if (password) {
            showAlert('Password changed. Please log in again with your new password.', 'info');
            setTimeout(() => {
                logout();
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showAlert('Failed to update profile. Please try again.', 'danger');
    });
}

// Show dashboard section
function showDashboard() {
    document.getElementById('dashboard-link').classList.add('active');
    document.getElementById('transactions-link').classList.remove('active');
    document.getElementById('profile-link').classList.remove('active');
    
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('transactions-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'none';
}

// Show transactions section
function showTransactions() {
    document.getElementById('dashboard-link').classList.remove('active');
    document.getElementById('transactions-link').classList.add('active');
    document.getElementById('profile-link').classList.remove('active');
    
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('transactions-section').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
}

// Show profile section
function showProfile() {
    document.getElementById('dashboard-link').classList.remove('active');
    document.getElementById('transactions-link').classList.remove('active');
    document.getElementById('profile-link').classList.add('active');
    
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('transactions-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
}

// Show backup toast notification
function showBackupToast() {
    // Initialize toast if not already done
    const toastEl = document.getElementById('backup-toast');
    if (!window.backupToast) {
        window.backupToast = new bootstrap.Toast(toastEl, { delay: 2000 });
    }
    
    // Show the toast
    window.backupToast.show();
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Utility function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Utility function to show alerts
function showAlert(message, type) {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show`;
    alertContainer.setAttribute('role', 'alert');
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertContainer, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertContainer);
        bsAlert.close();
    }, 5000);
}