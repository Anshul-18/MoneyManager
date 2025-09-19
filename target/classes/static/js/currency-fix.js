/**
 * Currency Fix - Replaces dollar signs with rupee symbols
 * This script ensures all dynamically loaded content shows rupee symbols instead of dollar signs
 */

// Function to replace $ with ₹ in all text nodes
function replaceDollarWithRupee() {
    // Fix financial summary cards
    const financialElements = [
        document.getElementById('total-income'),
        document.getElementById('total-expenses'),
        document.getElementById('current-balance')
    ];
    
    financialElements.forEach(element => {
        if (element && element.textContent) {
            element.textContent = element.textContent.replace(/\$/g, '₹');
        }
    });
    
    // Fix transaction tables
    const tables = [
        document.getElementById('recent-transactions-table'),
        document.getElementById('transactions-table')
    ];
    
    tables.forEach(table => {
        if (table) {
            const cells = table.querySelectorAll('td');
            cells.forEach(cell => {
                if (cell.textContent && cell.textContent.includes('$')) {
                    cell.textContent = cell.textContent.replace(/\$/g, '₹');
                }
            });
        }
    });
}

// Run initial replacement when DOM is loaded
document.addEventListener('DOMContentLoaded', replaceDollarWithRupee);

// Set up mutation observer to handle dynamically added content
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            replaceDollarWithRupee();
        }
    });
});

// Start observing the document with the configured parameters
observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    characterData: true 
});

// Override any JavaScript methods that might update content
if (window.jQuery) {
    const originalHtml = $.fn.html;
    $.fn.html = function(content) {
        if (typeof content === 'string' && content.includes('$')) {
            content = content.replace(/\$/g, '₹');
        }
        return originalHtml.call(this, content);
    };
    
    const originalText = $.fn.text;
    $.fn.text = function(content) {
        if (typeof content === 'string' && content.includes('$')) {
            content = content.replace(/\$/g, '₹');
        }
        return originalText.call(this, content);
    };
}

// Patch native JavaScript methods
const originalSetTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
Object.defineProperty(Node.prototype, 'textContent', {
    set(value) {
        if (typeof value === 'string' && value.includes('$')) {
            value = value.replace(/\$/g, '₹');
        }
        return originalSetTextContent.call(this, value);
    }
});

// Fix for any AJAX loaded content
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function() {
    this.addEventListener('load', function() {
        setTimeout(replaceDollarWithRupee, 10);
    });
    return originalXhrOpen.apply(this, arguments);
};
