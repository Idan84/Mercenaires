"use strict";

// Présentation des deux visuels d'un mercenaire.
// Convention cible :
// mercenary.avatar = {
//   id: "avatar_0042",
//   full: "ogre_0042_full.webp",
//   portrait: "ogre_0042_portrait.webp"
// }
// "file" reste accepté comme fallback de compatibilité pendant la transition.
// Les fichiers locaux sont servis depuis prototype-web/assets/avatars/.

function resolveMercenaryAvatarFile(mercenary,kind="portrait"){
  const avatar=mercenary?.avatar||{};
  if(kind==="full") return avatar.full||avatar.file||avatar.portrait||null;
  return avatar.portrait||avatar.file||avatar.full||null;
}

function mercenaryAvatarUrl(mercenary,kind="portrait"){
  const raw=String(resolveMercenaryAvatarFile(mercenary,kind)||"").trim();
  if(!raw) return null;
  if(/^(?:https?:)?\/\//i.test(raw)||raw.startsWith("/")||raw.startsWith("data:")) return raw;
  const safePath=raw.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return "/assets/avatars/"+safePath;
}

function avatarInitials(mercenary){
  const parts=String(mercenary?.name||"?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(part=>!/^[0-9]+$/.test(part));
  if(!parts.length) return "?";
  return parts.slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("");
}

function avatarKindForVariant(variant){
  return ["detail","interview"].includes(variant)?"full":"portrait";
}

function renderAvatar(mercenary,{variant="detail",kind=null}={}){
  const resolvedKind=kind||avatarKindForVariant(variant);
  const src=mercenaryAvatarUrl(mercenary,resolvedKind);
  const name=String(mercenary?.name||"Mercenaire");
  const people=String(mercenary?.people||"");
  const avatarId=String(mercenary?.avatar?.id||"");
  const image=src
    ? `<img src="${esc(src)}" alt="Portrait de ${esc(name)}" loading="${["card","compact","battle"].includes(variant)?"lazy":"eager"}" decoding="async" onerror="this.hidden=true;this.parentElement.classList.add('avatar-frame--missing')">`
    : "";

  return `<figure class="avatar-frame avatar-frame--${esc(variant)} avatar-frame--${esc(resolvedKind)} ${src?"":"avatar-frame--missing"}" ${avatarId?`data-avatar-id="${esc(avatarId)}"`:""}>
    <div class="avatar-fallback" aria-hidden="true">
      <span>${esc(avatarInitials(mercenary))}</span>
      <small>${esc(people||"Portrait à attribuer")}</small>
    </div>
    ${image}
  </figure>`;
}
