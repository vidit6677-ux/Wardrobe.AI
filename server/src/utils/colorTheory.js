const COLOR_FAMILIES = {
    neutral: ["black", "white", "gray", "grey", "beige", "cream", "tan", "camel", "navy"],
    warm: ["red", "orange", "yellow", "brown", "burgundy", "maroon", "rust", "mustard", "coral"],
    cool: ["blue", "green", "teal", "mint", "olive", "purple", "lavender", "pink"]
  };
  
  const FAMILY_COMPATIBILITY = {
    neutral: ["neutral", "warm", "cool"],
    warm: ["neutral", "cool"],
    cool: ["neutral", "warm"]
  };
  
  function getColorFamily(color) {
    color = color.toLowerCase();
    for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
      if (colors.includes(color)) return family;
    }
    return "neutral";
  }
  
  function areColorsCompatible(colorA, colorB) {
    const famA = getColorFamily(colorA);
    const famB = getColorFamily(colorB);
    return FAMILY_COMPATIBILITY[famA].includes(famB);
  }
  
  module.exports = {
    getColorFamily,
    areColorsCompatible
  };
  