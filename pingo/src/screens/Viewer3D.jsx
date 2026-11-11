import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/ui.jsx';
import { Penguin } from '../components/Penguin.jsx';
import { MODELS } from '../three/meta.js';
import { useStore, markSeen } from '../store.js';
import { sfx } from '../sfx.js';

export function Viewer3D({ model = 'virus', onClose, lockModel = false }) {
  const box = useRef(null), api = useRef(null);
  const [cur, setCur] = useState(MODELS.some((m) => m.id === model) ? model : 'virus');
  const [sel, setSel] = useState(null);
  const [cut, setCut] = useState(false);
  const [labels, setLabels] = useState(true);
  const [auto, setAuto] = useState(true);
  const [state, setState] = useState('loading');
  const s = useStore();

  useEffect(() => {
    let v, dead = false;
    import('../three/viewer.js').then((m) => {
      if (dead) return;
      try { v = m.createViewer(box.current, { onSelect: (p) => setSel(p ? { label: p.label, info: p.info, color: p.color } : null) }); api.current = v; v.setModel(cur); setState('ok'); }
      catch { setState('error'); }
    }).catch(() => setState('error'));
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { dead = true; removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); v && v.destroy(); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, []);

  const pick = (id) => { sfx.tap(); setCur(id); setSel(null); setCut(false); api.current && api.current.setModel(id); };
  const toggle = (k) => {
    sfx.tap();
    if (k === 'cut') { const v = !cut; setCut(v); api.current && api.current.setCut(v); }
    if (k === 'labels') { const v = !labels; setLabels(v); api.current && api.current.setLabels(v); }
    if (k === 'auto') { const v = !auto; setAuto(v); api.current && api.current.setAuto(v); }
  };
  const fullscreen = () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => {}); };
  const meta = MODELS.find((m) => m.id === cur);

  return (
    <div class="viewer" role="dialog" aria-label={'Modèle 3D : ' + meta.full}>
      <div class="v-stage" ref={box} />
      <div class="v-top">
        <button type="button" class="v-round" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button>
        <div class="v-title"><b>{meta.full}</b><small>Taille réelle {meta.size}</small></div>
        {document.documentElement.requestFullscreen ? <button type="button" class="v-round" onClick={fullscreen} aria-label="Plein écran"><Icon name="expand" /></button> : <span class="v-round ghost" />}
      </div>
      {state === 'loading' && <div class="v-center"><Penguin mood="think" size={90} /><p>Préparation du microscope…</p></div>}
      {state === 'error' && <div class="v-center"><Penguin mood="sad" size={90} /><p>La 3D ne marche pas sur cet appareil. Les animations des leçons marchent quand même.</p></div>}
      <div class="v-bottom">
        {sel ? (
          <div class="v-info pop" key={sel.label}>
            <div class="v-info-h"><i style={{ background: sel.color }} /><b>{sel.label}</b><button type="button" class="v-x" onClick={() => api.current && api.current.reset()} aria-label="Fermer l'info"><Icon name="x" size={18} /></button></div>
            <p>{sel.info}</p>
          </div>
        ) : (
          <p class="v-hint">{meta.desc} <b>Touche une étiquette</b> pour en savoir plus.</p>
        )}
        <div class="v-tools">
          <button type="button" class={'v-tool' + (cut ? ' on' : '')} onClick={() => toggle('cut')}><Icon name="cut" /><span>Couper</span></button>
          <button type="button" class={'v-tool' + (labels ? ' on' : '')} onClick={() => toggle('labels')}><Icon name="tag" /><span>Étiquettes</span></button>
          <button type="button" class={'v-tool' + (auto ? ' on' : '')} onClick={() => toggle('auto')}><Icon name="spin" /><span>Rotation</span></button>
          <button type="button" class="v-tool" onClick={() => { sfx.tap(); api.current && api.current.reset(); }}><Icon name="target" /><span>Recentrer</span></button>
        </div>
        {!lockModel && (
          <div class="v-models">
            {MODELS.map((m) => <button type="button" class={'v-model' + (m.id === cur ? ' on' : '')} onClick={() => pick(m.id)}>{m.name}</button>)}
          </div>
        )}
      </div>
      {!s.seen['tour-3d'] && state === 'ok' && (
        <div class="v-tip pop" onClick={() => markSeen('tour-3d')}>
          <Penguin mood="wave" size={60} />
          <p><b>Glisse un doigt</b> pour tourner, <b>pince</b> pour zoomer. Touche « Couper » pour voir l'intérieur !</p>
          <button type="button" class="btn primary sm">OK</button>
        </div>
      )}
    </div>
  );
}
