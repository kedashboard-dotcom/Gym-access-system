// Phone number validation for Kenyan numbers
const validatePhone = (phone) => {
  const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
  return phoneRegex.test(phone);
};

// Name validation
const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return nameRegex.test(name.trim());
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Membership ID validation
const validateMembershipID = (id) => {
  const idRegex = /^GYM[A-Z0-9]{9}$/;
  return idRegex.test(id);
};

// Amount validation
const validateAmount = (amount) => {
  return !isNaN(amount) && amount >= 500 && amount <= 50000;
};

module.exports = {
  validatePhone,
  validateName,
  validateEmail,
  validateMembershipID,
  validateAmount
};