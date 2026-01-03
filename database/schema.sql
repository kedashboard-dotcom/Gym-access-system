-- Msingi Gym System Database Schema for cPanel with SMS Polling Support
-- Remove CREATE DATABASE line since cPanel creates it for us

USE `msingico_gym`;

-- Users table for membership management
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    membership_id VARCHAR(20) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    membership_type ENUM('standard', 'premium', 'vip') DEFAULT 'standard',
    mpesa_receipt VARCHAR(50),
    payment_date DATETIME,
    membership_start DATETIME,
    membership_end DATETIME,
    status ENUM('pending_payment', 'active', 'expired', 'cancelled') DEFAULT 'pending_payment',
    rfid_card VARCHAR(20),
    axtrax_user_id VARCHAR(50),
    payment_method ENUM('mpesa', 'cash', 'card') DEFAULT 'mpesa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_membership_id (membership_id),
    INDEX idx_status (status),
    INDEX idx_membership_end (membership_end)
);

-- ========================================
-- SMS POLLING & PAYMENT LOGGING TABLES
-- ========================================

-- Payment logs table (for SMS polling and payment tracking)
CREATE TABLE IF NOT EXISTS payment_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'timeout') DEFAULT 'pending',
    mpesa_receipt VARCHAR(50),
    transaction_date DATETIME,
    membership_id VARCHAR(20),
    merchant_request_id VARCHAR(50),
    response_code VARCHAR(10),
    response_description VARCHAR(255),
    callback_received BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_attempts INT DEFAULT 0,
    last_sms_attempt DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_checkout_request (checkout_request_id),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_sms_sent (sms_sent),
    INDEX idx_callback_received (callback_received)
);

-- SMS logs table (for tracking all SMS messages)
CREATE TABLE IF NOT EXISTS sms_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(15) NOT NULL,
    message TEXT NOT NULL,
    sms_type ENUM('payment_confirmation', 'registration', 'renewal_reminder', 'payment_reminder', 'welcome', 'other') DEFAULT 'other',
    status ENUM('sent', 'failed', 'pending', 'delivered') DEFAULT 'pending',
    provider VARCHAR(50),
    provider_message_id VARCHAR(100),
    cost DECIMAL(5,2),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_sms_type (sms_type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- ========================================
-- EXISTING TABLES (UPDATED)
-- ========================================

-- Payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    membership_id VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    mpesa_receipt VARCHAR(50),
    phone VARCHAR(15) NOT NULL,
    transaction_date DATETIME,
    checkout_request_id VARCHAR(50),
    merchant_request_id VARCHAR(50),
    result_code INT,
    result_desc VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    sms_confirmation_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_membership_id (membership_id),
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_checkout_request (checkout_request_id)
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    membership_id VARCHAR(20),
    rfid_card VARCHAR(20),
    access_time DATETIME,
    door_id VARCHAR(50),
    access_granted BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_membership_id (membership_id),
    INDEX idx_access_time (access_time)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings for SMS polling
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
-- Membership prices
('membership_price_standard', '2', 'Standard membership price (KES)'),
('membership_price_premium', '3', 'Premium membership price (KES)'),
('membership_price_vip', '5', 'VIP membership price (KES)'),
('membership_duration_days', '1', 'Membership duration in days'),

-- M-Pesa Settings
('mpesa_business_shortcode', '4188649', 'M-Pesa business shortcode'),
('mpesa_passkey', 'd7e3d670fb68120bc33bb3c6aeaeffed56b68ff81e980c79965a582b9a0e9206', 'M-Pesa passkey'),
('mpesa_callback_url', 'https://msingi.co.ke/api/payments/mpesa-callback', 'M-Pesa callback URL'),

-- SMS Settings
('sms_enabled', 'true', 'Enable SMS notifications'),
('sms_provider', 'africastalking', 'SMS service provider'),
('sms_sender_id', 'MsingiGym', 'Default SMS sender ID'),
('sms_polling_interval', '5', 'SMS polling interval in minutes'),
('sms_max_attempts', '3', 'Maximum SMS retry attempts'),
('sms_payment_confirmation_template', 'Dear {name}, your Msingi Gym payment of KSh {amount} was successful! Membership ID: {membership_id}. Receipt: {receipt}. Access active for 1 day.', 'Payment confirmation SMS template'),

-- System Settings
('system_mode', 'production', 'System operation mode'),
('default_payment_method', 'mpesa', 'Default payment method'),
('axtrax_enabled', 'true', 'Enable AxtraxNG integration'),
('auto_extend_membership', 'true', 'Auto-extend membership on payment');

-- Audit table for important system events
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    user_id INT,
    membership_id VARCHAR(20),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

-- ========================================
-- VIEWS
-- ========================================

-- Active members view
CREATE OR REPLACE VIEW active_members AS
SELECT 
    id,
    name,
    phone,
    membership_id,
    amount,
    membership_type,
    membership_start,
    membership_end,
    rfid_card,
    DATEDIFF(membership_end, CURDATE()) as days_remaining
FROM users 
WHERE status = 'active' 
AND membership_end > NOW();

-- Recent payments view
CREATE OR REPLACE VIEW recent_payments AS
SELECT 
    p.*,
    u.name,
    u.membership_type
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Pending payment logs for SMS polling
CREATE OR REPLACE VIEW pending_payments_for_sms AS
SELECT 
    pl.*,
    u.name,
    u.membership_id as user_membership_id
FROM payment_logs pl
LEFT JOIN users u ON pl.phone = u.phone
WHERE pl.status = 'pending'
AND pl.callback_received = FALSE
AND pl.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)  -- Last hour only
AND (pl.sms_sent = FALSE OR pl.sms_attempts < 3)
ORDER BY pl.created_at ASC;

-- SMS delivery report view
CREATE OR REPLACE VIEW sms_delivery_report AS
SELECT 
    DATE(sent_at) as date,
    sms_type,
    status,
    COUNT(*) as count,
    SUM(CASE WHEN status = 'sent' THEN cost ELSE 0 END) as total_cost
FROM sms_logs
GROUP BY DATE(sent_at), sms_type, status
ORDER BY date DESC, sms_type;

-- ========================================
-- STORED PROCEDURES & TRIGGERS
-- ========================================

DELIMITER //

-- Trigger to update user status when membership expires
CREATE TRIGGER IF NOT EXISTS update_user_status_on_expiry
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.membership_end < NOW() AND OLD.status = 'active' THEN
        SET NEW.status = 'expired';
    END IF;
END//

-- Trigger to log payment initiation for SMS polling
CREATE TRIGGER IF NOT EXISTS log_payment_initiation
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    -- Insert into payment_logs for SMS polling
    INSERT INTO payment_logs (
        checkout_request_id,
        phone,
        amount,
        membership_id,
        merchant_request_id,
        status,
        created_at
    ) VALUES (
        NEW.checkout_request_id,
        NEW.phone,
        NEW.amount,
        NEW.membership_id,
        NEW.merchant_request_id,
        NEW.status,
        NEW.created_at
    )
    ON DUPLICATE KEY UPDATE
        updated_at = NOW();
END//

-- Stored procedure for membership renewal with SMS
CREATE PROCEDURE IF NOT EXISTS RenewMembershipWithSMS(
    IN p_membership_id VARCHAR(20),
    IN p_amount DECIMAL(10,2),
    IN p_mpesa_receipt VARCHAR(50),
    IN p_checkout_request_id VARCHAR(100)
)
BEGIN
    DECLARE user_exists INT DEFAULT 0;
    DECLARE current_end_date DATETIME;
    DECLARE user_phone VARCHAR(15);
    DECLARE user_name VARCHAR(100);
    
    -- Check if user exists and get current details
    SELECT COUNT(*), COALESCE(membership_end, NOW()), phone, name 
    INTO user_exists, current_end_date, user_phone, user_name
    FROM users 
    WHERE membership_id = p_membership_id;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Membership ID not found';
    ELSE
        -- Update membership end date (extend by 1 day)
        IF current_end_date > NOW() THEN
            UPDATE users 
            SET membership_end = DATE_ADD(current_end_date, INTERVAL 1 DAY),
                amount = p_amount,
                mpesa_receipt = p_mpesa_receipt,
                payment_date = NOW(),
                status = 'active',
                updated_at = NOW()
            WHERE membership_id = p_membership_id;
        ELSE
            UPDATE users 
            SET membership_end = DATE_ADD(NOW(), INTERVAL 1 DAY),
                amount = p_amount,
                mpesa_receipt = p_mpesa_receipt,
                payment_date = NOW(),
                membership_start = NOW(),
                status = 'active',
                updated_at = NOW()
            WHERE membership_id = p_membership_id;
        END IF;
        
        -- Update payment log
        UPDATE payment_logs 
        SET 
            status = 'completed',
            mpesa_receipt = p_mpesa_receipt,
            transaction_date = NOW(),
            callback_received = TRUE,
            updated_at = NOW()
        WHERE checkout_request_id = p_checkout_request_id;
        
        -- Log SMS to be sent (will be picked up by cron job)
        INSERT INTO sms_logs (phone, message, sms_type, status) VALUES (
            user_phone,
            CONCAT('Dear ', user_name, ', your Msingi Gym renewal of KSh ', p_amount, 
                   ' was successful! Receipt: ', p_mpesa_receipt, 
                   '. Membership extended. ID: ', p_membership_id),
            'payment_confirmation',
            'pending'
        );
        
        -- Audit log
        INSERT INTO audit_logs (event_type, description, membership_id) VALUES (
            'membership_renewal',
            CONCAT('Membership renewed via M-Pesa. Amount: ', p_amount, ', Receipt: ', p_mpesa_receipt),
            p_membership_id
        );
    END IF;
END//

-- Procedure to process pending SMS messages
CREATE PROCEDURE IF NOT EXISTS ProcessPendingSMS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_phone VARCHAR(15);
    DECLARE v_message TEXT;
    DECLARE v_sms_type VARCHAR(50);
    DECLARE v_retry_count INT;
    
    DECLARE cur CURSOR FOR 
        SELECT id, phone, message, sms_type, retry_count 
        FROM sms_logs 
        WHERE status = 'pending' 
        AND retry_count < 3
        AND sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_id, v_phone, v_message, v_sms_type, v_retry_count;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Here you would call your SMS sending function
        -- For now, we'll simulate sending and mark as sent
        UPDATE sms_logs 
        SET 
            status = 'sent',
            retry_count = v_retry_count + 1,
            sent_at = NOW()
        WHERE id = v_id;
        
        -- Add a small delay to prevent overwhelming the SMS service
        DO SLEEP(0.1);
    END LOOP;
    
    CLOSE cur;
END//

-- Procedure to clean up old payment logs
CREATE PROCEDURE IF NOT EXISTS CleanupOldPaymentLogs()
BEGIN
    -- Delete payment logs older than 7 days
    DELETE FROM payment_logs 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND status IN ('completed', 'failed', 'timeout');
    
    -- Delete SMS logs older than 30 days
    DELETE FROM sms_logs 
    WHERE sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Log cleanup activity
    INSERT INTO audit_logs (event_type, description) VALUES (
        'cleanup',
        'Cleaned up old payment and SMS logs'
    );
END//

DELIMITER ;

-- ========================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ========================================

-- Sample users
INSERT IGNORE INTO users (name, phone, membership_id, amount, membership_type, status, membership_start, membership_end) VALUES
('John Doe', '254721533822', 'GYM001A1B2C', 2.00, 'standard', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY)),
('Jane Smith', '254712345678', 'GYM002D3E4F', 3.00, 'premium', 'active', NOW(), DATE_Add(NOW(), INTERVAL 1 DAY)),
('Test User', '254700000000', 'TEST001', 2.00, 'standard', 'pending_payment', NOW(), NULL);

-- Sample payment log for SMS polling test
INSERT IGNORE INTO payment_logs (checkout_request_id, phone, amount, status, membership_id) VALUES
('ws_CO_TEST_001', '254721533822', 2.00, 'pending', 'GYM001A1B2C'),
('ws_CO_TEST_002', '254712345678', 3.00, 'pending', 'GYM002D3E4F');

-- ========================================
-- FINAL NOTES
-- ========================================

-- Grant necessary permissions (run these in cPanel MySQL interface)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON msingico_gym.* TO 'msingico_gymuser'@'localhost';
-- FLUSH PRIVILEGES;

-- To manually run SMS polling (from server console):
-- mysql -u msingico_gymuser -p -e "USE msingico_gym; CALL ProcessPendingSMS();"

-- To schedule cleanup (add to crontab):
-- 0 2 * * * mysql -u msingico_gymuser -p'gymuser321_' -e "USE msingico_gym; CALL CleanupOldPaymentLogs();"