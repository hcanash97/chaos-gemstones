import { createFileRoute } from "@tanstack/react-router";

const SCRIPT = `(function(){
  var scripts = document.querySelectorAll('script[data-chaos-key]');
  var s = scripts[scripts.length - 1];
  if (!s) return;
  var key = s.getAttribute('data-chaos-key');
  var targetSel = s.getAttribute('data-target') || '#chaos-feed';
  var base = s.getAttribute('data-base') || (new URL(s.src)).origin;
  var mount = document.querySelector(targetSel);
  if (!mount) {
    mount = document.createElement('div');
    s.parentNode.insertBefore(mount, s);
  }
  var css = '\\n.chaos-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));font-family:Inter,system-ui,sans-serif}\\n.chaos-card{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;transition:box-shadow .2s,transform .2s}\\n.chaos-card:hover{box-shadow:0 8px 24px rgba(15,27,61,.10);transform:translateY(-2px)}\\n.chaos-img{aspect-ratio:1/1;background:#f5f3ee;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px}\\n.chaos-img img{width:100%;height:100%;object-fit:cover;display:block}\\n.chaos-meta{padding:12px}\\n.chaos-title{font-family:Cormorant Garamond,Georgia,serif;font-size:18px;color:#0F1B3D;text-transform:capitalize}\\n.chaos-sub{font-size:12px;color:#64748b;margin-top:2px}\\n.chaos-price{font-size:14px;color:#0F1B3D;margin-top:8px;font-weight:600}\\n.chaos-empty{padding:32px;text-align:center;color:#64748b;font-size:14px;font-family:Inter,system-ui,sans-serif}\\n';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  mount.innerHTML = '<div class="chaos-empty">Loading inventory…</div>';
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function safeUrl(u){ var str = String(u || ''); return /^https?:\\/\\//i.test(str) ? esc(str) : ''; }
  function formatPrice(amount, currency){
    if (amount == null) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(Number(amount));
    } catch (e) {
      // Fallback for unknown currency codes
      return (currency || '') + ' ' + Number(amount).toLocaleString();
    }
  }
  fetch(base + '/api/public/feed?key=' + encodeURIComponent(key))
    .then(function(r){ if(!r.ok) throw new Error('feed'); return r.json(); })
    .then(function(data){
      if (!data.stones || !data.stones.length) {
        mount.innerHTML = '<div class="chaos-empty">No stones in this feed yet.</div>'; return;
      }
      var html = '<div class="chaos-grid">' + data.stones.map(function(s){
        // The feed exposes a flat image_url field (resolved from stone_images
        // on the server). We fall back to legacy stone_images in case the
        // jeweller is on an older feed format.
        var img = s.image_url || '';
        if (!img && s.stone_images && s.stone_images.length) {
          var p = s.stone_images.find(function(i){return i.is_primary;}) || s.stone_images[0];
          img = (p && (p.storage_url || p.external_image_url)) || '';
        }
        var imgUrl = safeUrl(img);
        var bits = esc([s.shape, s.origin || s.country_of_origin, s.cert_lab].filter(Boolean).join(' · '));
        var price = formatPrice(s.retail_price, s.retail_currency);
        var stoneType = esc(s.stone_type);
        var carat = s.carat_weight ? esc(s.carat_weight) + 'ct ' : '';
        return '<div class="chaos-card">' +
          '<div class="chaos-img">' + (imgUrl ? '<img loading="lazy" src="'+imgUrl+'" alt="'+stoneType+'">' : 'No image') + '</div>' +
          '<div class="chaos-meta">' +
            '<div class="chaos-title">' + carat + stoneType + '</div>' +
            '<div class="chaos-sub">' + bits + '</div>' +
            (price ? '<div class="chaos-price">' + esc(price) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>';
      mount.innerHTML = html;
    })
    .catch(function(){
      mount.innerHTML = '<div class="chaos-empty">Unable to load feed. Check the API key.</div>';
    });
})();`;

export const Route = createFileRoute("/api/public/chaos.js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SCRIPT, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});