const ClothingItem = require("../models/ClothingItem");
const { areColorsCompatible } = require("../utils/colorTheory");
const { cosineSimilarity } = require("../utils/vectorMath");
const { getStylistAdvice } = require("../services/geminiStylist.service");
const { getWeather } = require("../services/weather.service");


function occasionBonus(occasion, outfit) {
  const occ = String(occasion || "casual").toLowerCase();
  const topSub = (outfit.top?.category?.sub || "").toLowerCase();
  const bottomSub = (outfit.bottom?.category?.sub || "").toLowerCase();
  const shoeSub = (outfit.shoe?.category?.sub || "").toLowerCase();
  const hasOuterwear = !!outfit.outerwear;
  const outerSub = (outfit.outerwear?.category?.sub || "").toLowerCase();

  let bonus = 0;

  const isShirt = topSub.includes("shirt");
  const isTee = topSub.includes("t-shirt") || topSub.includes("tshirt");
  const isHoodie = topSub.includes("hoodie");
  const isSweater = topSub.includes("sweater");
  const isJacketOrCoat = outerSub.includes("jacket") || outerSub.includes("coat");

  const isJeans = bottomSub.includes("jeans");
  const isTrousers = bottomSub.includes("trousers");

  const isFormalShoe = shoeSub.includes("formal");
  const isSneaker = shoeSub.includes("sneakers");

  if (occ === "office") {
    if (isShirt) bonus += 0.18;
    if (isTrousers) bonus += 0.12;
    if (isFormalShoe) bonus += 0.12;
    if (hasOuterwear && isJacketOrCoat) bonus += 0.10;

    if (isTee) bonus -= 0.18;
    if (isHoodie) bonus -= 0.25;
    if (isSneaker) bonus -= 0.10;
    if (isJeans) bonus -= 0.06;
  }

  if (occ === "casual") {
    if (isTee) bonus += 0.16;
    if (isSneaker) bonus += 0.12;
    if (isJeans) bonus += 0.10;
    if (isHoodie) bonus += 0.08;
    if (isFormalShoe) bonus -= 0.08;
  }

  if (occ === "wedding") {
    if (isShirt) bonus += 0.20;
    if (hasOuterwear && isJacketOrCoat) bonus += 0.18;
    if (isFormalShoe) bonus += 0.16;
    if (isTrousers) bonus += 0.10;

    if (isTee) bonus -= 0.25;
    if (isHoodie) bonus -= 0.35;
    if (isSneaker) bonus -= 0.18;
    if (isJeans) bonus -= 0.12;
  }

  if (occ === "party" || occ === "date") {
    if (hasOuterwear && isJacketOrCoat) bonus += 0.14;
    if (isShirt) bonus += 0.10;
    if (isTee) bonus += 0.05;
    if (isFormalShoe) bonus += 0.06;
  }

  return bonus;
}

exports.recommendOutfits = async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await ClothingItem.find({ userId });
    const weather = await getWeather(req.query.city || "Bangalore");
    const isCold = typeof weather?.temp === "number" && weather.temp <= 12;

    const tops = items.filter((i) => i?.category?.main === "top");
    const bottoms = items.filter((i) => i?.category?.main === "bottom");
    const shoes = items.filter((i) => i?.category?.main === "footwear");
    const outerwear = items.filter((i) => i?.category?.main === "outerwear");

    let outfits = [];

    for (let top of tops) {
      for (let bottom of bottoms) {
        if (!areColorsCompatible(top.color?.[0], bottom.color?.[0])) continue;

        const tbSimilarity = cosineSimilarity(top.embedding, bottom.embedding);

        for (let shoe of shoes) {
          if (
            areColorsCompatible(top.color?.[0], shoe.color?.[0]) &&
            areColorsCompatible(bottom.color?.[0], shoe.color?.[0])
          ) {
            const tsSimilarity = cosineSimilarity(top.embedding, shoe.embedding);
            const bsSimilarity = cosineSimilarity(bottom.embedding, shoe.embedding);

            const baseScore = (tbSimilarity + tsSimilarity + bsSimilarity) / 3;

            let pickedOuterwear = null;
            let outerwearBonus = 0;

            if (isCold && outerwear.length > 0) {
              let bestJacket = null;
              let bestSim = -Infinity;

              for (const ow of outerwear) {

                const sim = cosineSimilarity(top.embedding, ow.embedding);
                if (sim > bestSim) {
                  bestSim = sim;
                  bestJacket = ow;
                }
              }

              if (bestJacket) {
                pickedOuterwear = bestJacket;
                outerwearBonus = 0.12;
              }
            }

            const occasion = req.query.occasion || "casual";
            const occBonus = occasionBonus(occasion, { top, bottom, shoe, outerwear: pickedOuterwear });

            outfits.push({
              top,
              bottom,
              shoe,
              outerwear: pickedOuterwear,
              score: baseScore + outerwearBonus + occBonus,
            });
          }
        }
      }
    }

    outfits.sort((a, b) => b.score - a.score);

    const topOutfits = outfits.slice(0, 4).map((o) => ({
      top: { ...o.top._doc, embedding: undefined },
      bottom: { ...o.bottom._doc, embedding: undefined },
      shoe: { ...o.shoe._doc, embedding: undefined },
      outerwear: o.outerwear ? { ...o.outerwear._doc, embedding: undefined } : null,
      score: o.score,
    }));

    let stylist = null;
    try {
      stylist = await getStylistAdvice(topOutfits, {
        occasion: req.query.occasion || "casual",
        weather,
      });
    } catch (e) {
      console.error("Gemini stylist failed:", e?.message || e);

      stylist = {
        bestIndex: 0,
        rankings: topOutfits.map((_, i) => ({
          index: i,
          verdict: i === 0 ? "best" : "good",
          reason: `${weather?.temp ?? "?"}°C ${weather?.description ?? ""} — Gemini quota reached.`,
        })),
        explanation: `Engine picked outfit 0 for ${weather?.temp ?? "?"}°C, ${weather?.description ?? "current conditions"}.`,
        tips: ["Add one warm layer.", "Keep colors consistent.", "Choose clean footwear."],
        weatherAlternative: `At ${weather?.temp ?? "this"}°C, add a jacket or coat as an outer layer.`,
      };
    }

    res.json({
      engineResults: topOutfits,
      stylist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to recommend outfits" });
  }
};