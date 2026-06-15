const normalizeEthiopianPhone = (phone) => {
  if (!phone) return null;

  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (/^\+2519\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^09\d{8}$/.test(cleaned)) {
    return `+251${cleaned.slice(1)}`;
  }

  if (/^9\d{8}$/.test(cleaned)) {
    return `+251${cleaned}`;
  }

  return null;
};

const isValidEthiopianPhone = (phone) => {
  return normalizeEthiopianPhone(phone) !== null;
};

module.exports = { normalizeEthiopianPhone, isValidEthiopianPhone };
