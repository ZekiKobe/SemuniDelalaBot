const generateSlug = (title, id) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const suffix = id ? id.toString().slice(-6) : Date.now().toString(36);
  return `${base}-${suffix}`;
};

module.exports = { generateSlug };
