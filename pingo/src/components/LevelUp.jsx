import { useEffect, useState } from 'preact/hooks';
import { useStore, setState } from '../store.js';
import { go } from '../router.js';
import { sfx } from '../sfx.js';
import { Btn, confetti } from './ui.jsx';
import { Penguin } from './Penguin.jsx';
import { Avatar, ACCS } from './Avatar.jsx';

/* Fête du passage de niveau : s'affiche après le gain d'XP qui fait monter de niveau */
export function LevelUp() {
  const s = useStore();
  const lu = s.levelUp;
  const [show, setShow] = useState(false);
  const [num, setNum] = useState(null);

  useEffect(() => {
    if (!lu) return;
    setNum(lu.from);
    const t1 = setTimeout(() => { setShow(true); sfx.levelUp(); confetti(); }, 900);
    const t2 = setTimeout(() => { setNum(lu.to); confetti(); }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lu && lu.to]);

  if (!lu || !show) return null;
  const unlocked = ACCS.filter(([, , lv]) => lv > lu.from && lv <= lu.to);
  const close = () => { setShow(false); setState({ levelUp: null }); };

  return (
    <div class="lvl-back" onClick={close}>
      <div class="lvl" role="dialog" aria-label={`Niveau ${lu.to} atteint`} onClick={(e) => e.stopPropagation()}>
        <div class="lvl-stage">
          <div class="lvl-rays" />
          <div class="lvl-badge">
            <small>NIVEAU</small>
            <b class="lvl-num" key={num}>{num}</b>
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => <i class={'lvl-spark s' + i} />)}
        </div>
        <Penguin mood="happy" size={96} class="jump" />
        <h2>Niveau supérieur !</h2>
        <p class="muted">Tu passes du niveau {lu.from} au niveau {lu.to}. Continue comme ça, tu grimpes dans le classement !</p>
        {unlocked.length > 0 && (
          <div class="lvl-unlock">
            <span class="lvl-eyebrow">Nouveau pour ton avatar</span>
            <div class="lvl-items">
              {unlocked.map(([k, n]) => (
                <div class="lvl-item"><Avatar av={{ ...((s.player && s.player.avatar) || {}), x: k }} size={66} /><small>{n}</small></div>
              ))}
            </div>
          </div>
        )}
        <Btn kind="gold" class="wide" onClick={close}>Trop bien !</Btn>
        {unlocked.length > 0 && <Btn kind="ghost" class="wide" onClick={() => { close(); go('avatar'); }}>Essayer sur mon avatar</Btn>}
      </div>
    </div>
  );
}
