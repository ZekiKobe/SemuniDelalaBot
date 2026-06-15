const config = require('../../../config');

const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const normalizeTag = (text) => {
  if (!text) return '';
  return text
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();
};

const formatListingMessage = (property) => {
  const lines = [
    `🏠 <b>${escapeHtml(property.title)}</b>`,
    '',
    `📍 ${escapeHtml(property.subCity)}, ${escapeHtml(property.city)}, ${escapeHtml(property.region)}`,
  ];

  if (property.landmark) {
    lines.push(escapeHtml(property.landmark));
  }

  lines.push('');
  lines.push(`💰 <b>${property.rentPrice.toLocaleString()} ETB/month</b>`);

  if (property.depositAmount > 0) {
    lines.push(`💳 Deposit: ${property.depositAmount.toLocaleString()} ETB`);
  }

  if (property.isNegotiable) {
    lines.push('🤝 Negotiable');
  }

  lines.push('');
  lines.push(`🛏 ${property.bedrooms} Bedrooms`);
  lines.push(`🚿 ${property.bathrooms} Bathrooms`);

  if (property.parking) lines.push('🚗 Parking Available');
  if (property.furnished) lines.push('🪑 Furnished');

  lines.push('');
  lines.push(`📞 ${property.contactPhone}`);

  if (property.telegramUsername) {
    const username = property.telegramUsername.replace('@', '');
    lines.push(`✈️ @${username}`);
  }

  const desc = property.description.length > 500
    ? `${property.description.slice(0, 497)}...`
    : property.description;

  lines.push('');
  lines.push(`📝 ${escapeHtml(desc)}`);
  lines.push('');
  lines.push(`🔗 <a href="${config.app.url}/property/${property.slug}">View Details</a>`);
  lines.push('');
  lines.push(
    `#${property.subCity.replace(/\s/g, '')} #${property.propertyType} #Ethiopia #Delala`
  );

  return lines.join('\n');
};

const formatRequirementMessage = (requirement) => {
  const typeLabel = requirement.listingType === 'buy' ? 'Looking to Buy' : 'Looking to Rent';
  const lines = [
    `📝 <b>Requirement — ${typeLabel}</b>`,
    '',
    `📌 <b>${escapeHtml(requirement.title)}</b>`,
    '',
    `📍 ${escapeHtml(requirement.location)}`,
    `💰 <b>${requirement.budget.toLocaleString()} ETB</b>`,
    `🛎️ <b>Need:</b> ${typeLabel}`,
    '',
    `📞 ${requirement.contactPhone}`,
  ];

  const desc = requirement.description.length > 500
    ? `${requirement.description.slice(0, 497)}...`
    : requirement.description;

  lines.push('');
  lines.push(`📝 ${escapeHtml(desc)}`);
  lines.push('');
  lines.push(`🔗 <a href="${config.app.url}">View on Delala</a>`);

  const botUsername = config.telegram.botUsername
    ? `@${config.telegram.botUsername.replace(/^@/, '')}`
    : '@semunidelalabot';
  lines.push(`📩 Want to list yours? ${botUsername}`);
  lines.push('');
  lines.push(`#${normalizeTag(requirement.location)} #${requirement.listingType === 'rent' ? 'ForRent' : 'ForSale'} #Requirement #Delala`);

  return lines.join('\n');
};

module.exports = { formatListingMessage, formatRequirementMessage };
