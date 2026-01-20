import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  const API_BASE = "http://localhost:3000";

  const COLOR_OPTIONS = [
    "black","white","grey","gray","charcoal","navy","blue","denim","indigo",
    "brown","tan","beige","camel","cream","ivory","khaki","olive","green","emerald","mint",
    "maroon","burgundy","wine","red","pink","lavender","purple","teal",
    "gold","silver","yellow","orange","peach"
  ];

  const SUB_OPTIONS = {
    top: ["t-shirt","shirt","hoodie","sweater","sweatshirt","kurta","sherwani","suit","bandhgala"],
    bottom: ["jeans","trousers","chino","pant","jogger","cargo","shorts","churidar","pajama"],
    footwear: ["sneaker","formal","boot","mojri"],
    outerwear: ["blazer","jacket","coat","bomber","denim jacket","leather jacket","puffer","windcheater","overshirt","nehru jacket","tuxedo blazer"],
    accessory: ["watch","smartwatch","bag","backpack"],
    other: ["other"],
  };

  const [me, setMe] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      setMe(data || null);
    } catch (e) {
      console.error("me error:", e);
      setMe(null);
    }
  };

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthErr("");
    setAuthLoading(true);

    try {
      const endpoint = authMode === "signup" ? "signup" : "login";
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `${endpoint} failed (${res.status})`);

      await fetchMe();
      setAuthForm((p) => ({ ...p, password: "" }));
    } catch (err) {
      setAuthErr(err.message || "Auth failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("logout error:", e);
    } finally {
      setMe(null);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const [outfits, setOutfits] = useState([]);
  const [stylist, setStylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState("party");
  const [city, setCity] = useState("London");

  const [closetOpen, setClosetOpen] = useState(false);
  const [closet, setCloset] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    categoryMain: "top",
    categorySub: "t-shirt",
    categorySubOther: "",
    colors: [],
    stylesText: "",
    seasonsText: "",
  });

  const verdictLabel = (v) => {
    if (v === "best") return "BEST";
    if (v === "good") return "GOOD";
    return "PASS";
  };

  const verdictColor = (v) => {
    if (v === "best") return "var(--neon-green)";
    if (v === "good") return "var(--neon-cyan)";
    return "var(--text-secondary)";
  };

  const fetchCloset = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clothes`, { credentials: "include" });
      if (res.status === 401) {
        setMe(null);
        return;
      }
      const data = await res.json().catch(() => []);
      setCloset(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fetch closet error:", e);
    }
  };

  useEffect(() => {
    if (me) fetchCloset();
  }, [me]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setClosetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const uploadToCloset = async () => {
    if (!selectedFile) return;
    setUploadErr("");
    setUploading(true);

    try {
      const form = new FormData();
      form.append("image", selectedFile);

      const res = await fetch(`${API_BASE}/api/clothes/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (res.status === 401) {
        setMe(null);
        throw new Error("Session expired. Please login again.");
      }

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        throw new Error(maybeJson?.error || `Upload failed (${res.status})`);
      }

      await res.json();
      setSelectedFile(null);
      await fetchCloset();
    } catch (e) {
      console.error(e);
      setUploadErr(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (item) => {
    const mainCat = item?.category?.main || "top";
    const rawSub = String(item?.category?.sub || "").toLowerCase();

    const allowedSubs = SUB_OPTIONS[mainCat] || [];
    const subInList = allowedSubs.includes(rawSub);

    setEditingId(item._id);
    setEditForm({
      categoryMain: mainCat,
      categorySub: subInList ? rawSub : "other",
      categorySubOther: subInList ? "" : (item?.category?.sub || ""),
      colors: Array.isArray(item?.color) ? item.color.map((c) => String(c).toLowerCase()) : [],
      stylesText: Array.isArray(item?.style) ? item.style.join(", ") : "",
      seasonsText: Array.isArray(item?.season) ? item.season.join(", ") : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      categoryMain: "top",
      categorySub: "t-shirt",
      categorySubOther: "",
      colors: [],
      stylesText: "",
      seasonsText: "",
    });
  };

  const saveEdit = async (id) => {
    const finalSub =
      editForm.categorySub === "other"
        ? (editForm.categorySubOther?.trim() || "other")
        : editForm.categorySub;

    const payload = {
      category: {
        main: editForm.categoryMain,
        sub: finalSub,
      },
      color: editForm.colors,
      style: editForm.stylesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      season: editForm.seasonsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(`${API_BASE}/api/clothes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setMe(null);
        throw new Error("Session expired. Please login again.");
      }

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        throw new Error(maybeJson?.error || `Update failed (${res.status})`);
      }

      await res.json();
      await fetchCloset();
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert(e.message || "Update failed");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this item permanently?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/clothes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 401) {
        setMe(null);
        throw new Error("Session expired. Please login again.");
      }

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        throw new Error(maybeJson?.error || `Delete failed (${res.status})`);
      }

      await fetchCloset();
    } catch (e) {
      console.error(e);
      alert(e.message || "Delete failed");
    }
  };

  const generateOutfits = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/api/outfits/recommend?occasion=${encodeURIComponent(
          occasion
        )}&city=${encodeURIComponent(city)}`,
        { credentials: "include" }
      );

      if (res.status === 401) {
        setMe(null);
        throw new Error("Session expired. Please login again.");
      }

      const data = await res.json().catch(() => null);
      setOutfits((data?.engineResults || []).slice(0, 3));
      setStylist(data?.stylist || null);
    } catch (err) {
      console.error("Generate outfits error:", err);
    } finally {
      setLoading(false);
    }
  };

  const CLOSET_SECTIONS = [
    { key: "top", title: "Tops" },
    { key: "bottom", title: "Bottoms" },
    { key: "footwear", title: "Footwear" },
    { key: "outerwear", title: "Outerwear" },
    { key: "accessory", title: "Accessories" },
    { key: "other", title: "Other" },
  ];

  const closetGroups = useMemo(() => {
    const groups = {
      top: [],
      bottom: [],
      footwear: [],
      outerwear: [],
      accessory: [],
      other: [],
    };

    for (const it of closet || []) {
      const key = it?.category?.main?.toLowerCase();
      if (groups[key]) {
        groups[key].push(it);
      } else {
        groups.other.push(it);
      }
    }

    return groups;
  }, [closet]);

  const closetStats = useMemo(() => {
    return {
      tops: closetGroups.top.length,
      bottoms: closetGroups.bottom.length,
      footwear: closetGroups.footwear.length,
      outerwear: closetGroups.outerwear.length,
      accessories: closetGroups.accessory.length,
      other: closetGroups.other.length,
      total: closet.length,
    };
  }, [closetGroups, closet]);

  const ClosetItemCard = ({ item }) => {
    const isEditing = editingId === item._id;

    return (
      <div className="glass-card" style={{ marginBottom: 12 }}>
        <img
          src={item.imageUrl}
          alt="Closet item"
          style={{
            width: "100%",
            height: 200,
            objectFit: "cover",
            borderRadius: 12,
            marginBottom: 10,
          }}
        />

        {!isEditing ? (
          <>
            <h4 style={{ margin: "0 0 8px 0" }}>{item.category?.sub || "item"}</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(item.color || []).map((c, i) => (
                <span key={`c-${i}`} className="tag">{c}</span>
              ))}
              {(item.season || []).map((s, i) => (
                <span key={`s-${i}`} className="tag">{s}</span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="neon-button cyan"
                onClick={() => startEdit(item)}
                style={{ flex: 1 }}
              >
                Edit
              </button>
              <button
                className="neon-button pink"
                onClick={() => deleteItem(item._id)}
                style={{ flex: 1 }}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {/* Main category */}
            <select
              className="futuristic-input"
              value={editForm.categoryMain}
              onChange={(e) => {
                const nextMain = e.target.value;
                const firstSub = (SUB_OPTIONS[nextMain] || ["other"])[0] || "other";
                setEditForm((p) => ({
                  ...p,
                  categoryMain: nextMain,
                  categorySub: firstSub,
                  categorySubOther: "",
                }));
              }}
            >
              <option value="top">top</option>
              <option value="bottom">bottom</option>
              <option value="footwear">footwear</option>
              <option value="outerwear">outerwear</option>
              <option value="accessory">accessory</option>
              <option value="other">other</option>
            </select>

            {/* Subcategory */}
            <select
              className="futuristic-input"
              value={editForm.categorySub}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, categorySub: e.target.value }))
              }
            >
              {(SUB_OPTIONS[editForm.categoryMain] || ["other"]).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="other">other</option>
            </select>

            {editForm.categorySub === "other" && (
              <input
                className="futuristic-input"
                value={editForm.categorySubOther}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, categorySubOther: e.target.value }))
                }
                placeholder="Enter sub-category"
              />
            )}

            {/* Colors multi-select */}
            <div className="glass-card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
                Colors (click to toggle)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {COLOR_OPTIONS.map((c) => {
                  const active = editForm.colors.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className="tag"
                      onClick={() =>
                        setEditForm((p) => ({
                          ...p,
                          colors: active
                            ? p.colors.filter((x) => x !== c)
                            : [...p.colors, c],
                        }))
                      }
                      style={{
                        opacity: active ? 1 : 0.55,
                        borderColor: active
                          ? "var(--neon-cyan)"
                          : "rgba(0,240,255,0.35)",
                      }}
                      title="Click to toggle"
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              className="futuristic-input"
              value={editForm.stylesText}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, stylesText: e.target.value }))
              }
              placeholder="Styles (comma separated)"
            />

            <input
              className="futuristic-input"
              value={editForm.seasonsText}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, seasonsText: e.target.value }))
              }
              placeholder="Seasons (comma separated)"
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button className="neon-button cyan" onClick={() => saveEdit(item._id)}>
                Save
              </button>
              <button className="neon-button pink" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!me) {
    return (
      <div className="page">
        <div className="cyber-grid"></div>

        <div className="App">
          <div className="glass-card holographic scanlines fade-in" style={{ maxWidth: 520, margin: "50px auto" }}>
            <h1 className="neon-text" style={{ fontSize: "2.5rem", marginBottom: 10 }}>
              WARDROBE AI
            </h1>
            <p className="glow-text" style={{ marginBottom: 30, fontSize: "1.1rem" }}>
              Futuristic Stylist • Real Weather
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button
                className={`neon-button ${authMode === "login" ? "cyan" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={`neon-button ${authMode === "signup" ? "cyan" : ""}`}
                onClick={() => setAuthMode("signup")}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={submitAuth} style={{ display: "grid", gap: 15 }}>
              <input
                className="futuristic-input"
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                autoComplete="email"
              />

              <input
                className="futuristic-input"
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Password"
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              />

              {authErr && (
                <div style={{ color: "var(--neon-pink)", fontWeight: 700 }}>{authErr}</div>
              )}

              <button className="neon-button purple" type="submit" disabled={authLoading}>
                {authLoading ? "Processing..." : authMode === "signup" ? "Create Account" : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="cyber-grid"></div>

      <div className="App">
        {/* NAVBAR */}
        <div className="glass-card neon-border" style={{ marginBottom: 30 }}>
          <div className="neon-border-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 className="neon-text" style={{ margin: 0, fontSize: "1.5rem" }}>
                WARDROBE AI
              </h2>
              <p style={{ margin: "5px 0 0 0", color: "var(--text-secondary)" }}>{me.email}</p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{
                display: "flex",
                gap: 8,
                marginRight: 10,
                fontSize: "13px",
                color: "var(--text-secondary)"
              }}>
                <span className="tag">Tops: {closetStats.tops}</span>
                <span className="tag">Bottoms: {closetStats.bottoms}</span>
                <span className="tag">Shoes: {closetStats.footwear}</span>
                <span className="tag">Outerwear: {closetStats.outerwear}</span>
              </div>
              <button className="neon-button cyan" onClick={() => setClosetOpen(true)}>
                Closet ({closetStats.total})
              </button>
              <button className="neon-button pink" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* CLOSET DRAWER */}
        {closetOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              zIndex: 1000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={() => setClosetOpen(false)}
          >
            <div
              className="glass-card scanlines"
              style={{
                width: "min(900px, 90vw)",
                height: "85vh",
                overflowY: "auto",
                borderRadius: 24,
                padding: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 className="glow-text">MY CLOSET</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <span className="tag">Total: {closetStats.total}</span>
                    <span className="tag">Tops: {closetStats.tops}</span>
                    <span className="tag">Bottoms: {closetStats.bottoms}</span>
                    <span className="tag">Shoes: {closetStats.footwear}</span>
                    <span className="tag">Outerwear: {closetStats.outerwear}</span>
                    <span className="tag">Accessories: {closetStats.accessories}</span>
                  </div>
                </div>
                <button className="neon-button pink" onClick={() => setClosetOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
                alignItems: "stretch"
              }}>
                <label style={{
                  flex: 1,
                  position: "relative",
                  cursor: "pointer"
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  <div className="futuristic-input" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    cursor: "pointer",
                    border: "2px dashed var(--neon-cyan)",
                    textAlign: "center"
                  }}>
                    <span style={{ fontSize: "20px" }}>📁</span>
                    <span>{selectedFile ? selectedFile.name : "Choose File"}</span>
                  </div>
                </label>

                <button
                  className="neon-button cyan"
                  onClick={uploadToCloset}
                  disabled={!selectedFile || uploading}
                  style={{ minWidth: "120px" }}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>

              {uploadErr && <div style={{ color: "var(--neon-pink)", marginBottom: 10 }}>{uploadErr}</div>}

              {closet.length === 0 ? (
                <p>No items yet. Upload one!</p>
              ) : (
                CLOSET_SECTIONS.map((section) => {
                  const items = closetGroups[section.key] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={section.key} style={{ marginBottom: 30 }}>
                      <h3 className="glow-text">{section.title} ({items.length})</h3>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "16px"
                      }}>
                        {items.map((item) => (
                          <ClosetItemCard key={item._id} item={item} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="glass-card holographic" style={{ marginBottom: 30, padding: 30 }}>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 250px", gap: 15 }}>
            <select
              className="futuristic-input"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            >
              <option value="party">Party</option>
              <option value="date">Date</option>
              <option value="office">Office</option>
              <option value="wedding">Wedding</option>
              <option value="travel">Travel</option>
              <option value="casual">Casual</option>
            </select>

            <input
              className="futuristic-input"
              type="text"
              value={city}
              placeholder="Enter city"
              onChange={(e) => setCity(e.target.value)}
            />

            <button className="neon-button purple" onClick={generateOutfits} disabled={loading}>
              {loading ? <div className="cyber-spinner" style={{ width: 20, height: 20 }}></div> : "Generate Outfits"}
            </button>
          </div>
        </div>

        {/* OUTFITS GRID */}
        <div className="outfits-grid">
          {loading && (
            <div className="glass-card" style={{ gridColumn: "1 / -1" }}>
              <div className="cyber-spinner" style={{ margin: "50px auto" }}></div>
            </div>
          )}

          {!loading && outfits.length === 0 && (
            <div className="glass-card" style={{ gridColumn: "1 / -1", padding: 30, textAlign: "center" }}>
              <p style={{ color: "var(--neon-pink)", fontSize: "18px", marginBottom: 15 }}>
                ⚠️ No outfits generated
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                Make sure you have at least 1 top, 1 bottom, and 1 pair of shoes in your closet.
              </p>
            </div>
          )}

          {outfits.slice(0, 3).map((o, i) => {
            const isBest = stylist && stylist.bestIndex === i;
            const rank = stylist?.rankings?.find((r) => r.index === i);

            return (
              <div
                key={i}
                className={`outfit-card-enhanced ${isBest ? "ai-pick-premium" : ""} slide-in-left`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {isBest && (
                  <div className="ai-pick-badge-premium">
                    ★ AI PICK
                  </div>
                )}

                <div className="outfit-items-grid">
                  <div className="outfit-item-premium">
                    <img src={o.top.imageUrl} alt="Top" />
                    <span className="outfit-item-label">{o.top.category.sub}</span>
                  </div>

                  {o.outerwear && (
                    <div className="outfit-item-premium">
                      <img src={o.outerwear.imageUrl} alt="Outerwear" />
                      <span className="outfit-item-label">{o.outerwear.category.sub}</span>
                    </div>
                  )}

                  <div className="outfit-item-premium">
                    <img src={o.bottom.imageUrl} alt="Bottom" />
                    <span className="outfit-item-label">{o.bottom.category.sub}</span>
                  </div>

                  <div className="outfit-item-premium">
                    <img src={o.shoe.imageUrl} alt="Shoes" />
                    <span className="outfit-item-label">{o.shoe.category.sub}</span>
                  </div>
                </div>

                {rank && (
                  <div className="verdict-section-premium">
                    <div className="verdict-header-premium">
                      <span className="verdict-label-premium">AI Verdict</span>
                      <span
                        className="verdict-badge-premium"
                        style={{ color: verdictColor(rank.verdict) }}
                      >
                        {verdictLabel(rank.verdict)}
                      </span>
                    </div>
                    <p className="verdict-reason-premium">
                      {rank.reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* STYLIST SUMMARY */}
        {stylist && (
          <div className="glass-card neon-border fade-in" style={{ marginBottom: 30, marginTop: 30 }}>
            <div className="neon-border-inner">
              <h2 className="glow-text">AI Stylist Recommendation</h2>
              <p style={{ marginBottom: 15 }}>
                <strong>Why this works:</strong> {stylist.explanation}
              </p>
              <ul style={{ marginBottom: 15 }}>
                {stylist.tips?.map((tip, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>{tip}</li>
                ))}
              </ul>
              <p style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 15 }}>
                <strong>Weather Tip:</strong> {stylist.weatherAlternative}
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 50, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          <p>© {new Date().getFullYear()} Wardrobe AI • Weather + outfits are local</p>
        </div>
      </div>
    </div>
  );
}

export default App;