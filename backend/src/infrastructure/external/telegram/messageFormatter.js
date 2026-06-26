const config = require('../../../config');
const { ListingType } = require('../../../domain/enums');

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

const getBotUsername = () => (
  config.telegram.botUsername
    ? `@${config.telegram.botUsername.replace(/^@/, '')}`
    : '@semuni_delalabot'
);

const CHANNEL_TEXT = {
  en: {
    houseRent: 'House for Rent',
    houseSale: 'House for Sale',
    productSale: 'Product for Sale',
    listing: 'Listing',
    condition: 'Condition',
    brand: 'Brand',
    model: 'Model',
    year: 'Year',
    type: 'Type',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    parking: 'Parking Available',
    furnished: 'Furnished',
    negotiable: 'Negotiable',
    deposit: 'Deposit',
    perMonth: 'month',
    viewDetails: 'View Details',
    postOn: 'Post on SemuniDelala',
    cta: 'Have this property/product or want to post your requirement? Use our bot:',
    conditions: {
      new: 'new',
      used: 'used',
      refurbished: 'refurbished',
    },
  },
  am: {
    houseRent: 'የሚከራይ ቤት',
    houseSale: 'የሚሸጥ ቤት',
    productSale: 'የሚሸጥ ዕቃ',
    listing: 'ልጥፍ',
    condition: 'ሁኔታ',
    brand: 'ብራንድ',
    model: 'ሞዴል',
    year: 'ዓመት',
    type: 'አይነት',
    bedrooms: 'መኝታ ቤቶች',
    bathrooms: 'መታጠቢያ ቤቶች',
    parking: 'የመኪና ማቆሚያ አለ',
    furnished: 'የተሟላ ዕቃ ያለው',
    negotiable: 'ድርድር ይቻላል',
    deposit: 'ቅድመ ክፍያ',
    perMonth: 'ወር',
    viewDetails: 'ዝርዝር ይመልከቱ',
    postOn: 'በSemuniDelala ይለጥፉ',
    cta: 'ይህ ቤት/ዕቃ አለዎት ወይም ፍላጎትዎን መለጠፍ ይፈልጋሉ? ቦታችንን ይጠቀሙ:',
    conditions: {
      new: 'አዲስ',
      used: 'ያገለገለ',
      refurbished: 'የታደሰ',
    },
  },
  or: {
    houseRent: 'Mana Kireeffamu',
    houseSale: 'Mana Gurguramu',
    productSale: 'Meeshaa Gurgurtaa',
    listing: 'Maxxansa',
    condition: 'Haala',
    brand: 'Biraandii',
    model: 'Moodela',
    year: 'Waggaa',
    type: 'Gosa',
    bedrooms: 'Kutaa ciisichaa',
    bathrooms: 'Mana fincaanii',
    parking: 'Iddoo konkolaataa qaba',
    furnished: 'Meeshaalee waliin',
    negotiable: 'Mariin ni dandaama',
    deposit: 'Kaffaltii duraa',
    perMonth: 'ji`a',
    viewDetails: 'Bal`ina ilaali',
    postOn: 'SemuniDelala irratti maxxansi',
    cta: 'Qabeenya/meeshaa kana qabdaa yookaan fedhii kee maxxansuu barbaaddaa? Bot keenya fayyadami:',
    conditions: {
      new: 'haaraa',
      used: 'kan fayyadame',
      refurbished: 'kan haaromfame',
    },
  },
};

const REQUIREMENT_TEXT = {
  en: {
    requirement: 'Requirement',
    lookingToBuy: 'Looking to Buy',
    lookingToRent: 'Looking to Rent',
    need: 'Need',
    matchingCta: 'Have a matching property/product or want to post your requirement? Use our bot:',
  },
  am: {
    requirement: '\u134d\u120b\u130e\u1275',
    lookingToBuy: '\u1208\u1218\u130d\u12db\u1275 \u12ed\u1348\u120d\u130b\u1209',
    lookingToRent: '\u1208\u1218\u12a8\u122b\u12e8\u1275 \u12ed\u1348\u120d\u130b\u1209',
    need: '\u134d\u120b\u130e\u1275',
    viewOnDelala: '\u1260Delala \u120b\u12ed \u12ed\u1218\u120d\u12a8\u1271',
    matchingCta: '\u1270\u1218\u1233\u1233\u12ed \u1264\u1275/\u12d5\u1243 \u12a0\u1208\u12ce\u1275 \u12c8\u12ed\u121d \u134d\u120b\u130e\u1275\u12ce\u1295 \u1218\u1208\u1320\u134d \u12ed\u1348\u120d\u130b\u1209? \u1266\u1273\u127d\u1295\u1295 \u12ed\u1320\u1240\u1219:',
  },
  or: {
    requirement: 'Fedhii',
    lookingToBuy: 'Bitachuuf barbaada',
    lookingToRent: 'Kireeffachuuf barbaada',
    need: 'Fedhii',
    viewOnDelala: 'Delala irratti ilaali',
    matchingCta: 'Qabeenya/meeshaa walfakkaatu qabdaa yookaan fedhii kee maxxansuu barbaaddaa? Bot keenya fayyadami:',
  },
};

const normalizeChannelLang = (lang = 'en') => (lang === 'om' ? 'or' : lang);
const channelText = (lang = 'en') => {
  const normalizedLang = normalizeChannelLang(lang);
  return {
    ...CHANNEL_TEXT.en,
    ...(CHANNEL_TEXT[normalizedLang] || {}),
    ...REQUIREMENT_TEXT.en,
    ...(REQUIREMENT_TEXT[normalizedLang] || {}),
  };
};

const appendPostYoursCta = (lines, label, text = CHANNEL_TEXT.en) => {
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`📢 <b>${label}</b>`);
  lines.push(`${text.cta} ${getBotUsername()}`);
};

const formatListingMessage = (property, lang = 'en') => {
  const text = channelText(lang);
  const lines = [
    `🏠 <b>${escapeHtml(property.title)}</b>`,
    '',
    `📍 ${escapeHtml(property.subCity)}, ${escapeHtml(property.city)}, ${escapeHtml(property.region)}`,
  ];

  if (property.landmark) {
    lines.push(escapeHtml(property.landmark));
  }

  lines.push('');
  lines.push(`💰 <b>${property.rentPrice.toLocaleString()} ETB/${text.perMonth}</b>`);

  if (property.depositAmount > 0) {
    lines.push(`💳 ${text.deposit}: ${property.depositAmount.toLocaleString()} ETB`);
  }

  if (property.isNegotiable) {
    lines.push(`🤝 ${text.negotiable}`);
  }

  lines.push('');
  lines.push(`🛏 ${property.bedrooms} ${text.bedrooms}`);
  lines.push(`🚿 ${property.bathrooms} ${text.bathrooms}`);

  if (property.parking) lines.push(`🚗 ${text.parking}`);
  if (property.furnished) lines.push(`🪑 ${text.furnished}`);

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
  lines.push(
    `#${property.subCity.replace(/\s/g, '')} #${property.propertyType} #Ethiopia #Delala`
  );
  appendPostYoursCta(lines, text.postOn, text);

  return lines.join('\n');
};

const formatRequirementMessage = (requirement, lang = 'en') => {
  const text = channelText(lang);
  const typeLabel = requirement.listingType === 'buy' ? text.lookingToBuy : text.lookingToRent;
  const lines = [
    `📝 <b>${text.requirement} - ${typeLabel}</b>`,
    '',
    `📌 <b>${escapeHtml(requirement.title)}</b>`,
    '',
    `📍 ${escapeHtml(requirement.location)}`,
    `💰 <b>${requirement.budget.toLocaleString()} ETB</b>`,
    `🛎️ <b>${text.need}:</b> ${typeLabel}`,
    '',
    `📞 ${requirement.contactPhone}`,
  ];

  const desc = requirement.description.length > 500
    ? `${requirement.description.slice(0, 497)}...`
    : requirement.description;

  lines.push('');
  lines.push(`📝 ${escapeHtml(desc)}`);
  lines.push('');
  lines.push(`📩 ${text.matchingCta} ${getBotUsername()}`);
  lines.push('');
  lines.push(`#${normalizeTag(requirement.location)} #${requirement.listingType === 'rent' ? 'ForRent' : 'ForSale'} #Requirement #Delala`);

  return lines.join('\n');
};

const formatMarketplaceListingMessage = (listing, lang = 'en') => {
  const text = channelText(lang);
  const isProduct = listing.listingType === ListingType.PRODUCT_SALE;
  const typeLabel = {
    [ListingType.HOUSE_RENT]: text.houseRent,
    [ListingType.HOUSE_SALE]: text.houseSale,
    [ListingType.PRODUCT_SALE]: text.productSale,
  }[listing.listingType] || text.listing;
  const typeTag = {
    [ListingType.HOUSE_RENT]: 'HouseForRent',
    [ListingType.HOUSE_SALE]: 'HouseForSale',
    [ListingType.PRODUCT_SALE]: 'ProductForSale',
  }[listing.listingType] || 'Listing';

  const location = [
    listing.location?.area,
    listing.location?.subCity,
    listing.location?.city,
    listing.location?.region,
  ].filter(Boolean).map(escapeHtml).join(', ');

  const lines = [
    `${isProduct ? '🛍️' : '🏠'} <b>${escapeHtml(listing.title)}</b>`,
    '',
    `<b>${typeLabel}</b>`,
  ];

  if (location) lines.push(`📍 ${location}`);
  if (listing.price !== undefined && listing.price !== null) {
    lines.push(`💰 <b>${listing.price.toLocaleString()} ${escapeHtml(listing.currency || 'ETB')}</b>`);
  }
  if (listing.isNegotiable) lines.push(`🤝 ${text.negotiable}`);

  if (isProduct && listing.productDetails) {
    const condition = text.conditions[listing.productDetails.condition] || listing.productDetails.condition;
    if (listing.productDetails.condition) lines.push(`${text.condition}: ${escapeHtml(condition)}`);
    if (listing.productDetails.brand) lines.push(`${text.brand}: ${escapeHtml(listing.productDetails.brand)}`);
    if (listing.productDetails.model) lines.push(`${text.model}: ${escapeHtml(listing.productDetails.model)}`);
    if (listing.productDetails.year) lines.push(`${text.year}: ${listing.productDetails.year}`);
  }

  if (!isProduct && listing.propertyDetails) {
    if (listing.propertyDetails.propertyType) lines.push(`${text.type}: ${escapeHtml(listing.propertyDetails.propertyType)}`);
    if (listing.propertyDetails.bedrooms !== undefined) lines.push(`🛏 ${listing.propertyDetails.bedrooms} ${text.bedrooms}`);
    if (listing.propertyDetails.bathrooms !== undefined) lines.push(`🚿 ${listing.propertyDetails.bathrooms} ${text.bathrooms}`);
    if (listing.propertyDetails.parking) lines.push(`🚗 ${text.parking}`);
    if (listing.propertyDetails.furnished) lines.push(`🪑 ${text.furnished}`);
  }

  lines.push('');
  lines.push(`📞 ${escapeHtml(listing.contactPhone)}`);

  if (listing.telegramUsername) {
    lines.push(`✈️ @${escapeHtml(listing.telegramUsername.replace('@', ''))}`);
  }

  const desc = listing.description.length > 500
    ? `${listing.description.slice(0, 497)}...`
    : listing.description;

  lines.push('');
  lines.push(`📝 ${escapeHtml(desc)}`);
  lines.push('');
  lines.push(`#${normalizeTag(listing.location?.city)} #${typeTag} #Delala`);
  appendPostYoursCta(lines, text.postOn, text);

  return lines.join('\n');
};

module.exports = { formatListingMessage, formatRequirementMessage, formatMarketplaceListingMessage };
