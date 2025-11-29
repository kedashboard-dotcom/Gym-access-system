-- Gym Access Control System Database Schema
-- Created for Msingi Gym 24/7 Access System

CREATE DATABASE IF NOT EXISTS gym_access_system;
USE gym_access_system;

-- Users table for membership management
CREATE TABLE users (
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

-- Payments table for transaction history
CREATE TABLE payments (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_membership_id (membership_id),
    INDEX idx_phone (phone),
    INDEX idx_status (status)
);

-- Access logs table (would be integrated with AxtraxNG)
CREATE TABLE access_logs (
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
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('membership_price_standard', '2000', 'Standard membership monthly price'),
('membership_price_premium', '3500', 'Premium membership monthly price'),
('membership_price_vip', '5000', 'VIP membership monthly price'),
('membership_duration_days', '30', 'Membership duration in days'),
('mpesa_business_shortcode', '123456', 'M-Pesa business shortcode'),
('system_mode', 'production', 'System operation mode');

-- Audit table for important system events
CREATE TABLE audit_logs (
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

-- Create views for common queries
CREATE VIEW active_members AS
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

CREATE VIEW recent_payments AS
SELECT 
    p.*,
    u.name,
    u.membership_type
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Sample data for testing
INSERT INTO users (name, phone, membership_id, amount, membership_type, status, membership_start, membership_end) VALUES
('John Doe', '254712345678', 'GYM001A1B2C', 2000.00, 'standard', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
('Jane Smith', '254723456789', 'GYM002D3E4F', 3500.00, 'premium', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY));

DELIMITER //

-- Trigger to update user status when membership expires
CREATE TRIGGER update_user_status_on_expiry
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.membership_end < NOW() AND OLD.status = 'active' THEN
        SET NEW.status = 'expired';
    END IF;
END//

-- Stored procedure for membership renewal
CREATE PROCEDURE RenewMembership(
    IN p_membership_id VARCHAR(20),
    IN p_amount DECIMAL(10,2),
    IN p_mpesa_receipt VARCHAR(50)
)
BEGIN
    DECLARE user_exists INT DEFAULT 0;
    DECLARE current_end_date DATETIME;
    
    -- Check if user exists
    SELECT COUNT(*), membership_end INTO user_exists, current_end_date
    FROM users 
    WHERE membership_id = p_membership_id;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Membership ID not found';
    ELSE
        -- Update membership end date (extend from current end date or now if expired)
        IF current_end_date > NOW() THEN
            UPDATE users 
            SET membership_end = DATE_ADD(current_end_date, INTERVAL 30 DAY),
                amount = p_amount,
                mpesa_receipt = p_mpesa_receipt,
                payment_date = NOW(),
                status = 'active',
                updated_at = NOW()
            WHERE membership_id = p_membership_id;
        ELSE
            UPDATE users 
            SET membership_end = DATE_ADD(NOW(), INTERVAL 30 DAY),
                amount = p_amount,
                mpesa_receipt = p_mpesa_receipt,
                payment_date = NOW(),
                membership_start = NOW(),
                status = 'active',
                updated_at = NOW()
            WHERE membership_id = p_membership_id;
        END IF;
    END IF;
END//

DELIMITER ;