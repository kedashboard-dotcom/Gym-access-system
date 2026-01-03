// Payment polling configuration
const POLLING_CONFIG = {
    maxAttempts: 30,      // Max polling attempts (30 * 10s = 5 minutes)
    interval: 10000,      // Poll every 10 seconds
    successStatus: 'completed',
    pendingStatus: 'pending'
};

// Global variables for polling
let pollingInterval;
let currentCheckoutId;
let currentMembershipId;
let currentPhone;
let pollingAttempts = 0;

// Initialize form handlers
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registrationForm');
    const renewalForm = document.getElementById('renewalForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    if (renewalForm) {
        renewalForm.addEventListener('submit', handleRenewal);
    }
    
    // Check for payment status in URL parameters
    checkUrlForPaymentStatus();
});

// Check URL for payment status (for success page)
function checkUrlForPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutId = urlParams.get('checkout_id');
    const membershipId = urlParams.get('membership_id');
    
    if (checkoutId && membershipId) {
        // Start polling for payment confirmation
        startPaymentPolling(checkoutId, membershipId);
    }
}

// Handle registration form submission
async function handleRegistration(e) {
    e.preventDefault();
    
    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const amount = form.amount.value;
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/members/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, amount })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Start polling for payment confirmation
            currentCheckoutId = result.data.checkout_request_id;
            currentMembershipId = result.data.membership_id;
            currentPhone = result.data.phone;
            
            // Show payment instruction modal
            showPaymentInstructions(result.data);
            
            // Start polling for payment confirmation
            startPaymentPolling(currentCheckoutId, currentMembershipId, currentPhone);
        } else {
            showError(result.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please check your connection.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle renewal form submission
async function handleRenewal(e) {
    e.preventDefault();
    
    const form = e.target;
    const membershipId = form.membership_id?.value?.trim();
    const phone = form.phone?.value?.trim();
    const amount = form.amount.value;
    
    if (!membershipId && !phone) {
        showError('Please enter either Membership ID or Phone Number');
        return;
    }
    
    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/members/renew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ membership_id: membershipId, phone, amount })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            currentCheckoutId = result.data.checkout_request_id;
            currentMembershipId = result.data.membership_id || membershipId;
            currentPhone = result.data.phone;
            
            // Show payment instruction modal
            showPaymentInstructions(result.data);
            
            // Start polling for payment confirmation
            startPaymentPolling(currentCheckoutId, currentMembershipId, currentPhone);
        } else {
            showError(result.message || 'Renewal failed');
        }
    } catch (error) {
        console.error('Renewal error:', error);
        showError('Network error. Please check your connection.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Start polling for payment confirmation
function startPaymentPolling(checkoutRequestId, membershipId, phone = null) {
    console.log('🔍 Starting payment polling:', { checkoutRequestId, membershipId });
    
    // Reset polling attempts
    pollingAttempts = 0;
    
    // Clear any existing interval
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Start polling
    pollingInterval = setInterval(async () => {
        if (pollingAttempts >= POLLING_CONFIG.maxAttempts) {
            stopPolling('max_attempts_reached');
            showInfo('Payment confirmation taking longer than expected. You will receive an SMS when payment is confirmed.');
            return;
        }
        
        pollingAttempts++;
        console.log(`Polling attempt ${pollingAttempts}/${POLLING_CONFIG.maxAttempts}`);
        
        try {
            const response = await fetch('/api/payments/check-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    checkout_request_id: checkoutRequestId,
                    membership_id: membershipId,
                    phone: phone
                })
            });
            
            const result = await response.json();
            
            console.log('Polling response:', result);
            
            if (result.status === 'success' && result.payment_status === 'completed') {
                // Payment successful!
                stopPolling('payment_confirmed');
                
                // Update payment instruction modal
                updatePaymentStatus('confirmed', {
                    receipt: result.data.MpesaReceiptNumber || result.data.receipt,
                    sms_sent: result.sms_sent
                });
                
                // Redirect to success page after 3 seconds
                setTimeout(() => {
                    redirectToSuccessPage(membershipId, phone);
                }, 3000);
                
            } else if (result.status === 'failed') {
                // Payment failed
                stopPolling('payment_failed');
                updatePaymentStatus('failed', {
                    error: result.message
                });
            }
            // If status is 'pending', continue polling
            
        } catch (error) {
            console.error('Polling error:', error);
            // Continue polling on network errors
        }
    }, POLLING_CONFIG.interval);
    
    // Show polling status
    showPollingStatus();
}

// Stop polling
function stopPolling(reason) {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    
    console.log('Polling stopped:', reason);
}

// Show payment instructions modal
function showPaymentInstructions(data) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal active';
    modal.innerHTML = `
        <div class="payment-modal-content">
            <div class="payment-header">
                <i class="fas fa-mobile-alt"></i>
                <h3>Check Your Phone</h3>
            </div>
            
            <div class="payment-body">
                <div class="payment-step active" id="step1">
                    <div class="step-icon">
                        <i class="fas fa-sms"></i>
                    </div>
                    <div class="step-content">
                        <h4>Step 1: Enter PIN</h4>
                        <p>An M-Pesa prompt has been sent to <strong>${data.phone || 'your phone'}</strong>.</p>
                        <p>Enter your M-Pesa PIN to complete payment of <strong>KSh ${data.amount || 2}</strong>.</p>
                    </div>
                </div>
                
                <div class="payment-step" id="step2">
                    <div class="step-icon">
                        <i class="fas fa-hourglass-half"></i>
                    </div>
                    <div class="step-content">
                        <h4>Step 2: Await Confirmation</h4>
                        <p>Processing your payment...</p>
                        <div class="polling-status">
                            <div class="spinner"></div>
                            <span>Checking payment status...</span>
                        </div>
                        <div class="polling-attempts">
                            <small>Attempt: <span id="pollingCount">0</span>/${POLLING_CONFIG.maxAttempts}</small>
                        </div>
                    </div>
                </div>
                
                <div class="payment-step" id="step3">
                    <div class="step-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="step-content">
                        <h4>Step 3: Payment Confirmed</h4>
                        <p id="confirmationMessage">Payment successful! You will receive an SMS confirmation.</p>
                    </div>
                </div>
            </div>
            
            <div class="payment-details">
                <div class="detail-item">
                    <span class="detail-label">Membership ID:</span>
                    <span class="detail-value">${data.membership_id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value">KSh ${data.amount || 2}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Checkout ID:</span>
                    <span class="detail-value">${data.checkout_request_id}</span>
                </div>
            </div>
            
            <div class="payment-actions">
                <button class="btn-secondary" onclick="resendPaymentPrompt()">
                    <i class="fas fa-redo"></i> Resend Prompt
                </button>
                <button class="btn-secondary" onclick="cancelPayment()">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add CSS for modal
    if (!document.querySelector('#payment-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'payment-modal-styles';
        style.textContent = `
            .payment-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .payment-modal.active {
                display: flex;
            }
            
            .payment-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                padding: 2rem;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .payment-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .payment-header i {
                font-size: 3rem;
                color: #667eea;
                margin-bottom: 1rem;
            }
            
            .payment-header h3 {
                color: #333;
                margin: 0;
            }
            
            .payment-step {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
                opacity: 0.5;
            }
            
            .payment-step.active {
                opacity: 1;
            }
            
            .step-icon {
                width: 40px;
                height: 40px;
                background: #f0f0f0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .payment-step.active .step-icon {
                background: #667eea;
                color: white;
            }
            
            .step-content h4 {
                margin: 0 0 0.5rem 0;
                color: #333;
            }
            
            .step-content p {
                margin: 0;
                color: #666;
                font-size: 0.9rem;
            }
            
            .polling-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .payment-details {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1rem;
                margin: 1.5rem 0;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            
            .detail-item:last-child {
                margin-bottom: 0;
            }
            
            .detail-label {
                font-weight: 600;
                color: #555;
            }
            
            .detail-value {
                color: #333;
                font-family: monospace;
            }
            
            .payment-actions {
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
            }
            
            .payment-actions button {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }
}

// Update payment status in modal
function updatePaymentStatus(status, data = {}) {
    const modal = document.querySelector('.payment-modal');
    if (!modal) return;
    
    const step2 = modal.querySelector('#step2');
    const step3 = modal.querySelector('#step3');
    const confirmationMessage = modal.querySelector('#confirmationMessage');
    const pollingStatus = modal.querySelector('.polling-status');
    
    if (status === 'confirmed') {
        step2.classList.remove('active');
        step3.classList.add('active');
        
        if (pollingStatus) {
            pollingStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #28a745;"></i> Payment confirmed!';
        }
        
        if (confirmationMessage) {
            confirmationMessage.innerHTML = `
                Payment successful!<br>
                <strong>Receipt:</strong> ${data.receipt || 'N/A'}<br>
                ${data.sms_sent ? 'SMS confirmation sent.' : 'You will receive SMS confirmation shortly.'}
            `;
        }
    } else if (status === 'failed') {
        step2.classList.remove('active');
        step3.classList.add('active');
        step3.querySelector('.step-icon').innerHTML = '<i class="fas fa-times-circle"></i>';
        step3.querySelector('.step-icon').style.background = '#dc3545';
        
        if (confirmationMessage) {
            confirmationMessage.innerHTML = `
                Payment failed:<br>
                <strong>Reason:</strong> ${data.error || 'Unknown error'}<br>
                Please try again.
            `;
        }
    }
}

// Show polling status
function showPollingStatus() {
    const pollingCount = document.getElementById('pollingCount');
    if (pollingCount) {
        pollingCount.textContent = pollingAttempts;
    }
}

// Redirect to success page
function redirectToSuccessPage(membershipId, phone) {
    window.location.href = `/success?membership_id=${membershipId}&phone=${encodeURIComponent(phone)}&confirmed=true`;
}

// Resend payment prompt
async function resendPaymentPrompt() {
    // This would require backend support to resend STK push
    alert('Please enter your M-Pesa PIN on the existing prompt. If it expired, please retry the registration.');
}

// Cancel payment
function cancelPayment() {
    stopPolling('user_cancelled');
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.remove();
    }
}

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}

function showInfo(message) {
    alert('Info: ' + message);
}

// Success page specific functions
if (window.location.pathname.includes('success')) {
    // Populate success page with data from URL
    const urlParams = new URLSearchParams(window.location.search);
    const membershipId = urlParams.get('membership_id');
    const phone = urlParams.get('phone');
    
    if (membershipId) {
        document.getElementById('membershipId')?.textContent = membershipId;
        document.getElementById('expiryDateReminder')?.textContent = 'Loading...';
        
        // Fetch membership details
        fetch(`/api/members/status?membership_id=${membershipId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const user = data.data.user;
                    document.getElementById('memberName').textContent = user.name;
                    document.getElementById('memberPhone').textContent = user.phone;
                    document.getElementById('membershipPlan').textContent = user.membership_type || 'Standard';
                    document.getElementById('amountPaid').textContent = `KSh ${user.amount || 2}`;
                    document.getElementById('activationDate').textContent = new Date(user.membership_start).toLocaleDateString();
                    document.getElementById('expiryDate').textContent = new Date(user.membership_end).toLocaleDateString();
                    document.getElementById('expiryDateReminder').textContent = new Date(user.membership_end).toLocaleDateString();
                    document.getElementById('rfidNumber').textContent = user.rfid_card || 'To be assigned';
                    document.getElementById('mpesaReceipt').textContent = user.mpesa_receipt || 'N/A';
                    
                    // Update status badge color
                    const statusBadge = document.getElementById('statusBadge');
                    if (user.status === 'active') {
                        statusBadge.style.background = '#28a745';
                        statusBadge.textContent = 'ACTIVE';
                    } else {
                        statusBadge.style.background = '#dc3545';
                        statusBadge.textContent = 'EXPIRED';
                    }
                }
            })
            .catch(error => {
                console.error('Failed to load membership details:', error);
            });
    }
}