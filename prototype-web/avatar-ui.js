"use strict";

// Présentation des portraits de mercenaires.
// Le futur moteur de matching n'a qu'à renseigner :
// mercenary.avatar = { id: "avatar_0042", file: "ogre_0042.webp" }
// Les fichiers locaux sont servis depuis prototype-web/assets/avatars/.

function mercenaryAvatarUrl(mercenary){
  const raw=String(mercenary?.avatar?.file||"").trim();
  if(!raw) return null;
  if(/^(?:https?:)?\/\//i.test(raw)||raw.startsWith("/")||raw.startsWith("data:")) return raw;
  const safePath=raw.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return "/assets/avatars/"+safePath;
}

function avatarInitials(mercenary){
  const parts=String(mercenary?.name||"?").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "?";
  return parts.slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("");
}

function renderAvatar(mercenary,{variant="detail"}={}){
  const src=mercenaryAvatarUrl(mercenary);
  const name=String(mercenary?.name||"Mercenaire");
  const people=String(mercenary?.people||"");
  const avatarId=String(mercenary?.avatar?.id||"");
  const image=src
    ? \`<img src="\${esc(src)}" alt="Portrait de \${esc(name)}" loading="\${variant==="card"?"lazy":"eager"}" decoding="async" onerror="this.hidden=true;this.parentElement.classList.add('avatar-frame--missing')">\`
    : "";

  return \`<figure class="avatar-frame avatar-frame--\${esc(variant)} \${src?"":"avatar-frame--missing"}" \${avatarId?\`data-avatar-id="\${esc(avatarId)}"\`:""}>
    <div class="avatar-fallback" aria-hidden="true">
      <span>\${esc(avatarInitials(mercenary))}</span>
      <small>\${esc(people||"Portrait à attribuer")}</small>
    </div>
    \${image}
  </figure>\`;
}
