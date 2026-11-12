import { useRef, useState } from 'preact/hooks';
import { Btn, Icon, Bar } from './ui.jsx';
import { useStore, setState } from '../store.js';
import { api } from '../api.js';
import { sfx } from '../sfx.js';

const NEED = 10;

/* Recadre au centre en carré 320 px et compresse en JPEG (≈ 20-40 Ko) */
async function toJpegBase64(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 320, 320);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}

export function PhotoCard() {
  const s = useStore(); const p = s.player || {};
  const level = 1 + Math.floor((p.xp || 0) / 150);
  const photo = p.avatar && p.avatar.photo;
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (level < NEED) {
    const need = (NEED - 1) * 150;
    return (
      <div class="photo-card locked">
        <span class="photo-ic"><Icon name="lock" size={24} /></span>
        <div class="photo-txt">
          <b>Photo de profil personnalisée</b>
          <small>Débloquée au niveau {NEED} : encore {need - (p.xp || 0)} XP.</small>
          <Bar value={(p.xp || 0) / need * 100} color="var(--gold)" />
        </div>
      </div>
    );
  }

  const pick = async (e) => {
    const f = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const b64 = await toJpegBase64(f);
      const r = await api.photo(s.token, b64);
      if (r.player) { setState({ player: r.player }); sfx.ok(); }
      else setErr(r.error === 'level' ? 'Il faut être niveau 10.' : 'Cette image ne passe pas. Essaie une autre photo.');
    } catch { setErr("Impossible d'envoyer la photo. Vérifie ta connexion."); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setErr('');
    try { const r = await api.photoRemove(s.token); if (r.player) setState({ player: r.player }); } catch { setErr('Pas de connexion internet.'); }
    setBusy(false);
  };

  return (
    <div class="photo-card">
      {photo ? <img class="photo-prev" src={photo} alt="Ta photo de profil" /> : <span class="photo-ic gold"><Icon name="camera" size={26} /></span>}
      <div class="photo-txt">
        <b>{photo ? 'Ta photo de profil' : 'Photo de profil débloquée !'}</b>
        <small>Elle remplace ton avatar partout, même dans le classement. Choisis une photo correcte : tout le monde la voit.</small>
        <div class="row-btns">
          <Btn kind="primary" class="sm" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Envoi…' : photo ? 'Changer' : 'Choisir une photo'}</Btn>
          {photo && <Btn kind="ghost" class="sm" disabled={busy} onClick={remove}>Retirer</Btn>}
        </div>
        {err && <small class="push-err">{err}</small>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}
