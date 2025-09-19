// Data backup and persistence service
// This will help persist data between app restarts

class BackupService {
    constructor() {
        this.USERS_KEY = 'money_manager_users';
        this.TRANSACTIONS_KEY = 'money_manager_transactions';
        this.AUTO_BACKUP_INTERVAL = 60000; // 1 minute
        
        // Start auto backup
        this.startAutoBackup();
    }
    
    // Start automatic backup
    startAutoBackup() {
        setInterval(() => this.backupAllData(), this.AUTO_BACKUP_INTERVAL);
        console.log('Automatic data backup service started');
        
        // Also backup on page unload
        window.addEventListener('beforeunload', () => {
            this.backupAllData();
        });
    }
    
    // Backup all application data
    backupAllData() {
        this.backupUsers();
        this.backupTransactions();
        console.log('Data backup completed:', new Date().toLocaleTimeString());
    }
    
    // Backup users
    backupUsers() {
        // First check if API endpoint exists for all users
        fetch('/api/users')
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    // If endpoint doesn't exist, create a list of users from current user
                    throw new Error('API endpoint not available');
                }
            })
            .then(users => {
                // Remove passwords before storing
                const safeUsers = users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email
                }));
                localStorage.setItem(this.USERS_KEY, JSON.stringify(safeUsers));
                console.log(`Backed up ${safeUsers.length} users`);
            })
            .catch(error => {
                console.log('Using alternative user backup method:', error.message);
                // Get current user as fallback
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                if (currentUser) {
                    const existingUsers = this.getStoredUsers();
                    
                    // Check if user already exists in backup
                    const userExists = existingUsers.some(user => user.id === currentUser.id);
                    
                    if (!userExists) {
                        existingUsers.push({
                            id: currentUser.id,
                            username: currentUser.username,
                            email: currentUser.email
                        });
                        
                        localStorage.setItem(this.USERS_KEY, JSON.stringify(existingUsers));
                        console.log('Backed up current user');
                    }
                }
            });
    }
    
    // Backup transactions
    backupTransactions() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.id) return;
        
        fetch(`/api/transactions/user/${currentUser.id}`)
            .then(response => response.json())
            .then(transactions => {
                // Store all transactions for current user
                const existingTransactions = this.getStoredTransactions();
                
                // Filter out transactions from current user
                const otherUserTransactions = existingTransactions.filter(
                    t => t.userId !== currentUser.id
                );
                
                // Combine with new transactions from current user
                const allTransactions = [...otherUserTransactions, ...transactions];
                
                localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(allTransactions));
            })
            .catch(error => console.error('Failed to backup transactions:', error));
    }
    
    // Get stored users
    getStoredUsers() {
        const usersJson = localStorage.getItem(this.USERS_KEY);
        return usersJson ? JSON.parse(usersJson) : [];
    }
    
    // Get stored transactions
    getStoredTransactions() {
        const transactionsJson = localStorage.getItem(this.TRANSACTIONS_KEY);
        return transactionsJson ? JSON.parse(transactionsJson) : [];
    }
    
    // Restore data after app restart
    async restoreData() {
        try {
            // Check if the backend is available first
            const healthCheck = await fetch('/api/transactions').catch(() => ({ ok: false }));
            
            if (healthCheck.ok) {
                await this.restoreUsers();
                await this.restoreTransactions();
                console.log('Data restoration completed');
            } else {
                console.warn('Backend API not available, using local data only');
                this.enableOfflineMode();
            }
        } catch (error) {
            console.error('Error during data restoration:', error);
            this.enableOfflineMode();
        }
    }
    
    // Enable offline mode when backend is unavailable
    enableOfflineMode() {
        console.log('Switching to offline mode - using local storage data only');
        // We could show a UI indicator here that we're in offline mode
        window.isOfflineMode = true;
    }
    
    // Restore users
    async restoreUsers() {
        const storedUsers = this.getStoredUsers();
        if (!storedUsers.length) {
            console.log('No users to restore');
            return;
        }
        
        console.log(`Restoring ${storedUsers.length} users...`);
        
        const successfulRestores = [];
        
        for (const user of storedUsers) {
            try {
                // Skip users with no username
                if (!user.username) {
                    console.warn('Skipping user with no username');
                    continue;
                }
                
                // Check if user already exists
                try {
                    const checkResponse = await fetch(`/api/users/username/${user.username}`);
                    if (checkResponse.ok) {
                        console.log(`User ${user.username} already exists, skipping`);
                        successfulRestores.push(user);
                        continue;
                    }
                } catch (error) {
                    console.warn(`Error checking if user ${user.username} exists:`, error);
                }
                
                // Try to create user with default password if they don't exist
                try {
                    const createResponse = await fetch('/api/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: user.username,
                            email: user.email || `${user.username}@example.com`,
                            password: 'password123' // Default password for restored users
                        })
                    });
                    
                    if (createResponse.ok) {
                        console.log(`Restored user: ${user.username}`);
                        successfulRestores.push(user);
                    } else {
                        console.warn(`Failed to restore user ${user.username}: API returned ${createResponse.status}`);
                    }
                } catch (createError) {
                    console.error(`API error while creating user ${user.username}:`, createError);
                }
            } catch (error) {
                console.error(`Failed to restore user ${user.username}:`, error);
            }
        }
        
        console.log(`Successfully restored ${successfulRestores.length} of ${storedUsers.length} users`);
        return successfulRestores;
    }
    
    // Restore transactions
    async restoreTransactions() {
        const storedTransactions = this.getStoredTransactions();
        if (!storedTransactions.length) {
            console.log('No transactions to restore');
            return;
        }
        
        console.log(`Restoring ${storedTransactions.length} transactions...`);
        
        // Get the current user to only restore their transactions
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser || !currentUser.id) {
            console.warn('No current user found, cannot restore transactions');
            return;
        }
        
        // Filter transactions for current user
        const userTransactions = storedTransactions.filter(t => t.userId === currentUser.id);
        console.log(`Found ${userTransactions.length} transactions for current user`);
        
        if (userTransactions.length === 0) {
            return;
        }
        
        // Check if user already has transactions
        try {
            const existingResponse = await fetch(`/api/transactions/user/${currentUser.id}`);
            
            if (existingResponse.ok) {
                const existingTransactions = await existingResponse.json();
                
                if (existingTransactions && existingTransactions.length > 0) {
                    console.log(`User already has ${existingTransactions.length} transactions, skipping restoration`);
                    return;
                }
            }
        } catch (error) {
            console.warn('Error checking existing transactions:', error);
        }
        
        // Restore transactions in batches of 5 to avoid overloading the server
        const batchSize = 5;
        const batches = Math.ceil(userTransactions.length / batchSize);
        let successCount = 0;
        
        for (let i = 0; i < batches; i++) {
            const batchTransactions = userTransactions.slice(i * batchSize, (i + 1) * batchSize);
            
            for (const transaction of batchTransactions) {
                try {
                    // Remove ID to create a new transaction instead of updating
                    const { id, ...newTransaction } = transaction;
                    
                    // Ensure date is in correct format
                    if (newTransaction.date && typeof newTransaction.date === 'string') {
                        // Make sure the date ends with Z for ISO format if it doesn't
                        if (!newTransaction.date.endsWith('Z')) {
                            newTransaction.date = newTransaction.date + 'Z';
                        }
                    }
                    
                    const response = await fetch('/api/transactions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newTransaction)
                    });
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        console.warn(`Failed to restore transaction: ${response.status}`);
                    }
                } catch (error) {
                    console.error('Failed to restore transaction:', error);
                }
            }
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Successfully restored ${successCount} of ${userTransactions.length} transactions`);
    }
}

// Create and export the backup service instance
const backupService = new BackupService();