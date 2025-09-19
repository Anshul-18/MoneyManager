document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the saved theme
    document.body.classList.add(currentTheme + '-mode');
    
    // Set up theme toggle functionality if there is a toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (document.body.classList.contains('light-mode')) {
                document.body.classList.replace('light-mode', 'dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.replace('dark-mode', 'light-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }
    
    // Convert currency from $ to ₹
    convertCurrencyToRupee();
});

/**
 * Function to replace dollar signs with rupee symbol and convert amounts
 * Assumes an exchange rate of 1 USD = 75 INR (adjust as needed)
 */
function convertCurrencyToRupee() {
    // Convert all elements with currency values
    const currencyElements = document.querySelectorAll('.currency, .price, .amount');
    const exchangeRate = 75; // 1 USD = 75 INR (example rate)
    
    currencyElements.forEach(function(element) {
        let text = element.textContent || element.innerText;
        
        // Replace $ symbol with ₹
        if (text.includes('$')) {
            // Extract the number after $ symbol
            const matches = text.match(/\$\s*([\d,]+(\.\d{1,2})?)/);
            
            if (matches && matches[1]) {
                const dollarValue = parseFloat(matches[1].replace(/,/g, ''));
                const rupeeValue = (dollarValue * exchangeRate).toFixed(2);
                
                // Format with Indian numbering system (optional)
                const formattedValue = formatIndianCurrency(rupeeValue);
                
                // Replace the text
                element.textContent = text.replace(/\$\s*[\d,]+(\.\d{1,2})?/, '₹ ' + formattedValue);
            } else {
                // Simple replacement if we can't parse the number
                element.textContent = text.replace(/\$/g, '₹');
            }
        }
    });
}

/**
 * Format numbers according to Indian numbering system (optional)
 * e.g., 1,00,000 instead of 100,000
 */
function formatIndianCurrency(num) {
    const number = parseFloat(num);
    const result = number.toFixed(2).toString().split('.');
    let lastThree = result[0].length > 3 ? result[0].slice(-3) : result[0];
    const otherNumbers = result[0].slice(0, -3);
    if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
    }
    const formattedNumber = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    return formattedNumber + (result[1] ? '.' + result[1] : '');
}
