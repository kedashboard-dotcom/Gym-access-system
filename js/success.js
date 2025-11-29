

// API Base URL for cPanel production - FIXED
const API_BASE_URL = '/api';  // Relative path for same domain

// Success Page JavaScript
class SuccessPage {
    constructor() {
        this.membershipData = this.getMembershipDataFromURL();
        this.init();
    }

    // Get membership data from URL parameters
    getMembershipDataFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Default data (for demo purposes)
        const defaultData = {
            membership_id: 'GYM' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: 'John Doe',
            phone: '254712345678',
            membership_type: 'Standard',
            amount: '2000',
            activation_date: new Date().toLocaleDateString('en-GB'),
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
            rfid_card: 'RFID' + Math.random().toString().substr(2, 8),
            mpesa_receipt: 'RE' + Math.random().toString().substr(2, 9),
            status: 'active'
        };

        // Override with URL parameters if available
        const data = { ...defaultData };
        
        urlParams.forEach((value, key) => {
            if (value && value !== 'undefined') {
                data[key] = value;
            }
        });

        return data;
    }

    // Initialize the page
    init() {
        this.displayMembershipData();
        this.setupEventListeners();
        this.startAutoRefresh();
        
        // Log successful registration
        this.logSuccess();
    }

    // Display membership data on the page
    displayMembershipData() {
        const data = this.membershipData;
        
        // Update all data fields
        document.getElementById('membershipId').textContent = data.membership_id;
        document.getElementById('memberName').textContent = data.name;
        document.getElementById('memberPhone').textContent = data.phone;
        document.getElementById('membershipPlan').textContent = this.formatMembershipType(data.membership_type);
        document.getElementById('amountPaid').textContent = `KSh ${parseInt(data.amount).toLocaleString()}`;
        document.getElementById('activationDate').textContent = this.formatDate(data.activation_date);
        document.getElementById('expiryDate').textContent = this.formatDate(data.expiry_date);
        document.getElementById('expiryDateReminder').textContent = this.formatDate(data.expiry_date);
        document.getElementById('rfidNumber').textContent = data.rfid_card;
        document.getElementById('mpesaReceipt').textContent = data.mpesa_receipt;
        
        // Update status badge
        const statusBadge = document.getElementById('statusBadge');
        if (data.status === 'active') {
            statusBadge.style.background = '#28a745';
            statusBadge.textContent = 'ACTIVE';
        } else {
            statusBadge.style.background = '#dc3545';
            statusBadge.textContent = data.status.toUpperCase();
        }

        // Update page title with member name
        document.title = `Welcome ${data.name} - Msingi Gym`;
    }

    // Format membership type for display
    formatMembershipType(type) {
        const types = {
            'standard': 'Standard',
            'premium': 'Premium',
            'vip': 'VIP'
        };
        return types[type.toLowerCase()] || type;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Print functionality
        window.printPage = this.printPage.bind(this);
        
        // Navigation
        window.goToHome = this.goToHome.bind(this);
        window.checkAnotherMembership = this.checkAnotherMembership.bind(this);
        
        // Share functionality
        window.shareMembership = this.shareMembership.bind(this);
        window.shareViaWhatsApp = this.shareViaWhatsApp.bind(this);
        window.shareViaEmail = this.shareViaEmail.bind(this);
        window.copyToClipboard = this.copyToClipboard.bind(this);
        
        // Additional actions
        window.downloadReceipt = this.downloadReceipt.bind(this);
        window.addToCalendar = this.addToCalendar.bind(this);
        window.viewFacilityMap = this.viewFacilityMap.bind(this);
        window.contactSupport = this.contactSupport.bind(this);
        window.setupAutoRenewal = this.setupAutoRenewal.bind(this);
        
        // Modal controls
        window.closeModal = this.closeModal.bind(this);
    }

    // Print page
    printPage() {
        window.print();
    }

    // Navigate to home
    goToHome() {
        window.location.href = 'index.html';
    }

    // Check another membership
    checkAnotherMembership() {
        window.location.href = 'index.html#status';
    }

    // Share membership modal
    shareMembership() {
        document.getElementById('shareModal').style.display = 'flex';
    }

    // Share via WhatsApp
    shareViaWhatsApp() {
        const data = this.membershipData;
        const message = `🏋️ My Msingi Gym Membership Details:\n\n` +
                       `Membership ID: ${data.membership_id}\n` +
                       `Name: ${data.name}\n` +
                       `Plan: ${this.formatMembershipType(data.membership_type)}\n` +
                       `Expires: ${this.formatDate(data.expiry_date)}\n\n` +
                       `Keep this information safe!`;
        
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    // Share via Email
    shareViaEmail() {
        const data = this.membershipData;
        const subject = `Msingi Gym Membership - ${data.membership_id}`;
        const body = `Hello,\n\nHere are my gym membership details:\n\n` +
                    `Membership ID: ${data.membership_id}\n` +
                    `Full Name: ${data.name}\n` +
                    `Phone: ${data.phone}\n` +
                    `Membership Plan: ${this.formatMembershipType(data.membership_type)}\n` +
                    `Amount Paid: KSh ${parseInt(data.amount).toLocaleString()}\n` +
                    `Activation Date: ${this.formatDate(data.activation_date)}\n` +
                    `Expiry Date: ${this.formatDate(data.expiry_date)}\n` +
                    `RFID Card: ${data.rfid_card}\n` +
                    `M-Pesa Receipt: ${data.mpesa_receipt}\n\n` +
                    `Best regards,\n${data.name}`;
        
        const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
    }

    // Copy to clipboard
    async copyToClipboard() {
        const data = this.membershipData;
        const text = `Msingi Gym Membership Details:\n\n` +
                    `Membership ID: ${data.membership_id}\n` +
                    `Name: ${data.name}\n` +
                    `Phone: ${data.phone}\n` +
                    `Plan: ${this.formatMembershipType(data.membership_type)}\n` +
                    `Amount: KSh ${parseInt(data.amount).toLocaleString()}\n` +
                    `Activation: ${this.formatDate(data.activation_date)}\n` +
                    `Expiry: ${this.formatDate(data.expiry_date)}\n` +
                    `RFID: ${data.rfid_card}\n` +
                    `Receipt: ${data.mpesa_receipt}`;
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Membership details copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showNotification('Failed to copy details', 'error');
        }
    }

    // Download receipt
    downloadReceipt() {
        const data = this.membershipData;
        
        const receiptContent = `
            MSINGI GYM - MEMBERSHIP RECEIPT
            ================================
            
            Receipt No: ${data.mpesa_receipt}
            Date: ${new Date().toLocaleString()}
            
            MEMBERSHIP DETAILS:
            ------------------
            Membership ID: ${data.membership_id}
            Name: ${data.name}
            Phone: ${data.phone}
            Plan: ${this.formatMembershipType(data.membership_type)}
            
            PAYMENT INFORMATION:
            -------------------
            Amount: KSh ${parseInt(data.amount).toLocaleString()}
            Method: M-Pesa
            Date: ${this.formatDate(data.activation_date)}
            
            ACCESS DETAILS:
            ---------------
            RFID Card: ${data.rfid_card}
            Activation: ${this.formatDate(data.activation_date)}
            Expiry: ${this.formatDate(data.expiry_date)}
            Status: ${data.status.toUpperCase()}
            
            ================================
            Thank you for choosing Msingi Gym!
            Support: +254 700 000 000
            Email: support@msingi.co.ke
            
            This is an automated receipt.
        `;
        
        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MsingiGym-Receipt-${data.membership_id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Receipt downloaded successfully!', 'success');
    }

    // Add to calendar
    addToCalendar() {
        const data = this.membershipData;
        const expiryDate = new Date(data.expiry_date);
        
        // Create calendar event for renewal reminder (7 days before expiry)
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 7);
        
        const event = {
            title: `Msingi Gym Membership Renewal - ${data.membership_id}`,
            description: `Your Msingi Gym membership expires on ${this.formatDate(data.expiry_date)}. Renew to continue uninterrupted access.`,
            location: 'Msingi Gym, Nairobi',
            start: reminderDate,
            end: reminderDate
        };
        
        // For Google Calendar
        const googleUrl = 'https://calendar.google.com/calendar/render?' +
            'action=TEMPLATE&' +
            `text=${encodeURIComponent(event.title)}&` +
            `details=${encodeURIComponent(event.description)}&` +
            `location=${encodeURIComponent(event.location)}&` +
            `dates=${this.formatDateForCalendar(reminderDate)}/${this.formatDateForCalendar(reminderDate)}`;
        
        window.open(googleUrl, '_blank');
        this.showNotification('Calendar event created for renewal reminder!', 'success');
    }

    // Format date for calendar
    formatDateForCalendar(date) {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    }

    // View facility map
    viewFacilityMap() {
        const mapUrl = 'https://maps.google.com/maps?q=Msingi+Gym+Nairobi&z=15';
        window.open(mapUrl, '_blank');
    }

    // Contact support
    contactSupport() {
        const phone = '+254700000000';
        const email = 'support@msingi.co.ke';
        
        const choice = confirm('Contact Msingi Gym Support:\n\nCall: ' + phone + '\nEmail: ' + email + '\n\nClick OK to call, Cancel to email.');
        
        if (choice) {
            window.location.href = `tel:${phone}`;
        } else {
            window.location.href = `mailto:${email}`;
        }
    }

    // Setup auto-renewal
    setupAutoRenewal() {
        this.showNotification('Auto-renewal feature coming soon!', 'info');
        // Future implementation: Connect to backend for auto-renewal setup
    }

    // Close modal
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Get notification color
    getNotificationColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }

    // Start auto-refresh for real-time status updates
    startAutoRefresh() {
        // Refresh status every 30 seconds for first 5 minutes
        let refreshCount = 0;
        const maxRefreshes = 10; // 5 minutes
        
        const refreshInterval = setInterval(() => {
            if (refreshCount >= maxRefreshes) {
                clearInterval(refreshInterval);
                return;
            }
            
            this.checkMembershipStatus();
            refreshCount++;
        }, 30000);
    }

    // Check membership status with backend
    async checkMembershipStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/members/status?membership_id=${this.membershipData.membership_id}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                // Update status if changed
                if (result.data.user.status !== this.membershipData.status) {
                    this.membershipData.status = result.data.user.status;
                    this.displayMembershipData();
                    this.showNotification('Membership status updated!', 'info');
                }
            }
        } catch (error) {
            console.error('Status check failed:', error);
        }
    }

    // Log successful registration
    logSuccess() {
        console.log('🎉 Membership activated successfully:', this.membershipData);
        
        // Track conversion (for analytics)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'membership_activation', {
                'membership_id': this.membershipData.membership_id,
                'membership_type': this.membershipData.membership_type,
                'value': this.membershipData.amount
            });
        }
    }
}

// CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
    }
    
    @media print {
        .action-buttons, .footer, .next-steps {
            display: none !important;
        }
        
        .success-hero {
            background: #28a745 !important;
            -webkit-print-color-adjust: exact;
        }
    }
`;
document.head.appendChild(style);

// Initialize the success page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.successPage = new SuccessPage();
});

// API Base URL (same as main script)
const API_BASE_URL = 'http://localhost:3000/api';