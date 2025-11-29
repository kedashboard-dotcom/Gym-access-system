// API Base URL - Update this to your backend URL
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const registrationForm = document.getElementById('registrationForm');
const renewalForm = document.getElementById('renewalForm');
const statusForm = document.getElementById('statusForm');
const tabButtons = document.querySelectorAll('.tab-button');
const forms = document.querySelectorAll('.form');
const loadingModal = document.getElementById('loadingModal');
const successModal = document.getElementById('successModal');

// Tab Switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show target form
        forms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${targetTab}Form`).classList.add('active');
    });
});

// Phone number formatting
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Convert to 254 format if it starts with 0 or 7
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
        cleaned = '254' + cleaned;
    }
    
    return cleaned;
}

// Validation functions
function validateName(name) {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name.trim());
}

function validatePhone(phone) {
    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    return phoneRegex.test(phone);
}

function validateMembershipID(id) {
    const idRegex = /^GYM[A-Z0-9]{9}$/;
    return idRegex.test(id);
}

// Show error message
function showError(inputId, message) {
    const errorElement = document.getElementById(inputId + 'Error');
    const inputElement = document.getElementById(inputId);
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    inputElement.style.borderColor = '#dc3545';
    
    return false;
}

// Clear error message
function clearError(inputId) {
    const errorElement = document.getElementById(inputId + 'Error');
    const inputElement = document.getElementById(inputId);
    
    errorElement.style.display = 'none';
    inputElement.style.borderColor = '#e9ecef';
    
    return true;
}

// Real-time validation
document.getElementById('name')?.addEventListener('input', function() {
    if (this.value.trim() === '') {
        showError('name', 'Name is required');
    } else if (!validateName(this.value)) {
        showError('name', 'Please enter a valid name (letters and spaces only)');
    } else {
        clearError('name');
    }
});

document.getElementById('phone')?.addEventListener('input', function() {
    if (this.value.trim() === '') {
        showError('phone', 'Phone number is required');
    } else if (!validatePhone(this.value)) {
        showError('phone', 'Please enter a valid Kenyan phone number');
    } else {
        clearError('phone');
    }
});

document.getElementById('membershipId')?.addEventListener('input', function() {
    if (this.value.trim() !== '' && !validateMembershipID(this.value)) {
        showError('membershipId', 'Please enter a valid Membership ID (e.g., GYM123ABC)');
    } else {
        clearError('membershipId');
    }
});

document.getElementById('renewalPhone')?.addEventListener('input', function() {
    if (this.value.trim() !== '' && !validatePhone(this.value)) {
        showError('renewalPhone', 'Please enter a valid Kenyan phone number');
    } else {
        clearError('renewalPhone');
    }
});

// Form submission handlers
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(registrationForm);
    const data = {
        name: formData.get('name').trim(),
        phone: formatPhoneNumber(formData.get('phone')),
        amount: parseInt(formData.get('amount')),
        membership_type: formData.get('membership_type')
    };
    
    // Validate form
    if (!validateName(data.name)) {
        showError('name', 'Please enter a valid name');
        return;
    }
    
    if (!validatePhone(data.phone)) {
        showError('phone', 'Please enter a valid Kenyan phone number');
        return;
    }
    
    if (data.amount < 500 || data.amount > 50000) {
        alert('Please enter a valid amount between KSh 500 and KSh 50,000');
        return;
    }
    
    await submitRegistration(data);
});

renewalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(renewalForm);
    const data = {
        amount: parseInt(formData.get('amount'))
    };
    
    // Check if membership ID or phone is provided
    const membershipId = formData.get('membership_id')?.trim();
    const phone = formData.get('phone')?.trim();
    
    if (membershipId) {
        if (!validateMembershipID(membershipId)) {
            showError('membershipId', 'Please enter a valid Membership ID');
            return;
        }
        data.membership_id = membershipId;
    } else if (phone) {
        if (!validatePhone(phone)) {
            showError('renewalPhone', 'Please enter a valid Kenyan phone number');
            return;
        }
        data.phone = formatPhoneNumber(phone);
    } else {
        alert('Please provide either Membership ID or Phone Number');
        return;
    }
    
    if (data.amount < 500 || data.amount > 50000) {
        alert('Please enter a valid amount between KSh 500 and KSh 50,000');
        return;
    }
    
    await submitRenewal(data);
});

statusForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('statusInput').value.trim();
    let queryParam = '';
    
    if (validateMembershipID(input)) {
        queryParam = `membership_id=${input}`;
    } else if (validatePhone(input)) {
        queryParam = `phone=${formatPhoneNumber(input)}`;
    } else {
        alert('Please enter a valid Membership ID or Phone Number');
        return;
    }
    
    await checkMembershipStatus(queryParam);
});

// API Functions
async function submitRegistration(data) {
    try {
        showLoading('Sending payment request to your phone...');
        
        const response = await fetch(`${API_BASE_URL}/members/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showSuccess('Payment request sent! Check your phone to complete the M-Pesa transaction. Your access will activate automatically after payment.');
            
            // Reset form
            registrationForm.reset();
            document.getElementById('amount').value = '2000';
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function submitRenewal(data) {
    try {
        showLoading('Processing your renewal request...');
        
        const response = await fetch(`${API_BASE_URL}/members/renew`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showSuccess('Renewal request sent! Check your phone to complete the M-Pesa transaction. Your access will be extended automatically.');
            
            // Reset form
            renewalForm.reset();
            document.getElementById('renewalAmount').value = '2000';
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Renewal error:', error);
        alert('Renewal failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function checkMembershipStatus(queryParam) {
    try {
        const response = await fetch(`${API_BASE_URL}/members/status?${queryParam}`);
        const result = await response.json();
        
        const statusResult = document.getElementById('statusResult');
        
        if (result.status === 'success') {
            const user = result.data.user;
            const isActive = user.status === 'active';
            const endDate = new Date(user.membership_end).toLocaleDateString();
            
            statusResult.innerHTML = `
                <div class="status-header">
                    <h4>Membership Status: <span style="color: ${isActive ? '#28a745' : '#dc3545'}">${isActive ? 'ACTIVE' : 'EXPIRED'}</span></h4>
                </div>
                <div class="status-details">
                    <p><strong>Name:</strong> ${user.name}</p>
                    <p><strong>Membership ID:</strong> ${user.membership_id}</p>
                    <p><strong>Phone:</strong> ${user.phone}</p>
                    <p><strong>Plan:</strong> ${user.membership_type}</p>
                    <p><strong>Expiry Date:</strong> ${endDate}</p>
                    <p><strong>Days Remaining:</strong> ${user.days_remaining}</p>
                    ${user.rfid_card ? `<p><strong>RFID Card:</strong> ${user.rfid_card}</p>` : ''}
                </div>
            `;
            statusResult.className = 'status-result ' + (isActive ? 'success' : 'error');
            statusResult.style.display = 'block';
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        const statusResult = document.getElementById('statusResult');
        statusResult.innerHTML = `<p>Error: ${error.message}</p>`;
        statusResult.className = 'status-result error';
        statusResult.style.display = 'block';
    }
}

// UI Helper Functions
function showLoading(message = 'Processing your request...') {
    const modal = document.getElementById('loadingModal');
    const messageElement = modal.querySelector('p');
    messageElement.textContent = message;
    modal.style.display = 'flex';
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    modal.style.display = 'none';
}

function showSuccess(message) {
    const modal = document.getElementById('successModal');
    const messageElement = document.getElementById('successMessage');
    messageElement.textContent = message;
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Membership type change handler
document.getElementById('membershipType')?.addEventListener('change', function() {
    const amountInput = document.getElementById('amount');
    switch (this.value) {
        case 'standard':
            amountInput.value = '2000';
            break;
        case 'premium':
            amountInput.value = '3500';
            break;
        case 'vip':
            amountInput.value = '5000';
            break;
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Msingi Gym Access System initialized');
    
    // Set current year in footer if needed
    const currentYear = new Date().getFullYear();
    const yearElement = document.querySelector('.copyright');
    if (yearElement) {
        yearElement.textContent = `© ${currentYear} Msingi Gym. All rights reserved.`;
    }
});