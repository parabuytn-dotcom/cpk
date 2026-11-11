import { useStore, markSeen } from '../store.js';
import { useTyped, Btn } from './ui.jsx';

/* Pingo, la mascotte. mood : idle | happy | wave | sad | think | talk */
export function Penguin({ mood = 'idle', size = 120, class: cls = '' }) {
  const happy = mood === 'happy';
  return (
    <svg class={`pg pg-${mood} ${cls}`} width={size} height={size * 1.15} viewBox="0 0 120 138" aria-hidden="true">
      <ellipse class="pg-shadow" cx="60" cy="133" rx="30" ry="4" />
      <g class="pg-all">
        <g class="pg-feet"><ellipse cx="45" cy="127" rx="11" ry="5" fill="#FF9A2E" /><ellipse cx="75" cy="127" rx="11" ry="5" fill="#FF9A2E" /></g>
        <g class="pg-wl"><ellipse cx="20" cy="86" rx="9" ry="24" fill="#1B2A55" transform="rotate(18 20 86)" /></g>
        <g class="pg-wr"><ellipse cx="100" cy="86" rx="9" ry="24" fill="#1B2A55" transform="rotate(-18 100 86)" /></g>
        <ellipse cx="60" cy="78" rx="41" ry="50" fill="#1B2A55" />
        <ellipse cx="60" cy="88" rx="29" ry="37" fill="#FFFFFF" />
        <path d="M30 70 Q60 84 90 70 L90 79 Q60 93 30 79 Z" fill="#FF4D5E" />
        <path d="M78 80 l9 22 l-10 -2 z" fill="#E43A4C" />
        <g class="pg-eyes">
          {happy || mood === 'talk-happy' ? (
            <g fill="none" stroke="#1B2A55" stroke-width="4" stroke-linecap="round">
              <path d="M40 50 q7 -8 14 0" /><path d="M66 50 q7 -8 14 0" />
            </g>
          ) : (
            <g>
              <circle cx="47" cy="49" r="10" fill="#fff" /><circle cx="73" cy="49" r="10" fill="#fff" />
              <circle class="pg-pupil" cx={mood === 'think' ? 50 : 48} cy={mood === 'think' ? 45 : 50} r="5.5" fill="#0E1633" />
              <circle class="pg-pupil" cx={mood === 'think' ? 76 : 74} cy={mood === 'think' ? 45 : 50} r="5.5" fill="#0E1633" />
              <circle cx="50" cy="47" r="1.8" fill="#fff" /><circle cx="76" cy="47" r="1.8" fill="#fff" />
            </g>
          )}
          {mood === 'sad' && <g stroke="#0E1633" stroke-width="3" stroke-linecap="round"><path d="M38 36l14 4" /><path d="M82 36l-14 4" /></g>}
        </g>
        <ellipse cx="34" cy="62" rx="6" ry="4" fill="#FF8FA3" opacity=".6" />
        <ellipse cx="86" cy="62" rx="6" ry="4" fill="#FF8FA3" opacity=".6" />
        <g class="pg-beak">
          <path d="M51 58 L69 58 L60 68 Z" fill="#FF9A2E" />
          <path class="pg-beak-low" d="M53 63 L67 63 L60 71 Z" fill="#E07A12" />
        </g>
      </g>
    </svg>
  );
}

export function Pingo({ say, mood = 'idle', size = 96, side = 'left' }) {
  const typed = useTyped(say);
  const talking = say && typed.length < say.length;
  return (
    <div class={`pingo pingo-${side}`}>
      <Penguin mood={talking ? (mood === 'happy' ? 'happy' : 'talk') : mood} size={size} />
      {say && <div class="bubble" aria-live="polite"><span class="sr-only">{say}</span><span aria-hidden="true">{typed}<span class="ghost">{say.slice(typed.length)}</span></span></div>}
    </div>
  );
}

export function Bubble({ say }) {
  const typed = useTyped(say);
  return <div class="bubble solo" aria-live="polite"><span class="sr-only">{say}</span><span aria-hidden="true">{typed}<span class="ghost">{say.slice(typed.length)}</span></span></div>;
}

/* Bulle d'aide de Pingo, affichée une seule fois par identifiant */
export function Coach({ id, text, mood = 'wave', cta = 'Compris !' }) {
  const s = useStore();
  if (s.seen[id]) return null;
  return (
    <div class="coach">
      <div class="coach-in">
        <Pingo say={text} mood={mood} size={78} />
        <Btn kind="primary" class="sm" onClick={() => markSeen(id)}>{cta}</Btn>
      </div>
    </div>
  );
}
