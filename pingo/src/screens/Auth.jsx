import { useState } from 'preact/hooks';
import { Btn, Icon, confetti } from '../components/ui.jsx';
import { Penguin, Pingo, Bubble } from '../components/Penguin.jsx';
import { AvatarBuilder, DEFAULT_AVATAR, COLORS } from '../components/Avatar.jsx';
import { api } from '../api.js';
import { signIn } from '../store.js';
import { go } from '../router.js';
import { sfx } from '../sfx.js';

const ERR = {
  network: 'Pas de connexion internet. Réessaie dans un instant.',
  phone_taken: 'Ce numéro a déjà un compte. Connecte-toi plutôt !',
  bad_phone: 'Ce numéro ne semble pas valide (8 chiffres minimum).',
  bad_name: 'Ton prénom doit faire entre 2 et 24 caractères.',
  bad_pin: 'Code PIN incorrect.',
  unknown_phone: 'Aucun compte avec ce numéro. Inscris-toi !',
  locked: 'Trop d\'essais ratés. Réessaie dans 15 minutes.'
};

export function PinPad({ value, onChange, onDone }) {
  const press = (d) => {
    sfx.tap();
    if (d === 'del') return onChange(value.slice(0, -1));
    if (value.length >= 4) return;
    const v = value + d; onChange(v);
    if (v.length === 4 && onDone) setTimeout(() => onDone(v), 150);
  };
  return (
    <div class="pinpad">
      <div class="pin-dots" aria-label={`${value.length} chiffres sur 4`}>{[0, 1, 2, 3].map((i) => <span class={i < value.length ? 'on' : ''} />)}</div>
      <div class="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => k === '' ? <span /> : (
          <button type="button" class="key" onClick={() => press(k)} aria-label={k === 'del' ? 'Effacer' : k}>{k === 'del' ? <Icon name="back" /> : k}</button>
        ))}
      </div>
    </div>
  );
}

export function Welcome() {
  return (
    <div class="screen welcome">
      <div class="welcome-art">
        <div class="ice ice1" /><div class="ice ice2" /><div class="ice ice3" />
        <Penguin mood="wave" size={170} />
      </div>
      <h1 class="logo">Pingo</h1>
      <p class="tagline">Révise tes devoirs avec tes potes.<br />Gagne des XP. Deviens n°1 de la classe.</p>
      <Bubble say="Salut ! Moi c'est Pingo. Je vais t'aider à réviser, leçon par leçon." />
      <div class="stack">
        <Btn kind="primary" class="wide" onClick={() => go('signup')}>C'est parti !</Btn>
        <Btn kind="ghost" class="wide" onClick={() => go('login')}>J'ai déjà un compte</Btn>
      </div>
    </div>
  );
}

export function Signup() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [av, setAv] = useState({ ...DEFAULT_AVATAR, c: Math.floor(Math.random() * COLORS.length) });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, '');

  const says = [
    'Comment tu t\'appelles ? C\'est ce nom que tes potes verront dans le classement.',
    `Enchanté ${name.trim() || ''} ! Ton numéro sert seulement à te reconnecter. Personne d'autre ne le voit.`,
    'Choisis un code secret de 4 chiffres. Ne le donne à personne !',
    'Tape-le encore une fois pour être sûr.',
    'Dernière étape : crée ton avatar !'
  ];
  const nextOk = [name.trim().length >= 2 && name.trim().length <= 24, digits.length >= 8 && digits.length <= 15, pin.length === 4, pin2.length === 4, true][step];

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.register(name.trim(), digits, pin, av);
      if (r.error) { setErr(ERR[r.error] || 'Oups, une erreur. Réessaie.'); if (r.error === 'phone_taken' || r.error === 'bad_phone') setStep(1); if (r.error === 'bad_name') setStep(0); }
      else { sfx.done(); confetti(); signIn(r.token, r.player); go('', true); }
    } catch { setErr(ERR.network); }
    setBusy(false);
  };
  const next = () => {
    setErr('');
    if (step === 3 && pin2 !== pin) { sfx.bad(); setErr('Les deux codes ne sont pas pareils. Recommence.'); setPin(''); setPin2(''); setStep(2); return; }
    if (step === 4) return submit();
    sfx.tap(); setStep(step + 1);
  };

  return (
    <div class="screen auth">
      <div class="auth-top">
        <button type="button" class="icon-btn" onClick={() => (step ? setStep(step - 1) : go('', true))} aria-label="Retour"><Icon name="back" /></button>
        <div class="steps-dots">{[0, 1, 2, 3, 4].map((i) => <span class={i <= step ? 'on' : ''} />)}</div>
        <span class="icon-btn ghost" />
      </div>
      <Pingo say={says[step]} mood={step === 4 ? 'happy' : 'idle'} size={80} />
      <div class="auth-body slide-in" key={step}>
        {step === 0 && <input class="field" autoFocus placeholder="Ton prénom" maxLength={24} value={name} onInput={(e) => setName(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && nextOk && next()} autoComplete="given-name" />}
        {step === 1 && (
          <div class="phone-field">
            <span class="prefix">+216</span>
            <input class="field" autoFocus inputMode="tel" type="tel" placeholder="XX XXX XXX" value={phone} onInput={(e) => setPhone(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && nextOk && next()} autoComplete="tel-national" />
          </div>
        )}
        {step === 2 && <PinPad value={pin} onChange={setPin} onDone={() => { setPin2(''); setStep(3); }} />}
        {step === 3 && <PinPad value={pin2} onChange={setPin2} />}
        {step === 4 && <AvatarBuilder value={av} onChange={setAv} level={1} />}
        {err && <p class="err">{err}{err === ERR.phone_taken && <> <a href="#/login">Se connecter</a></>}</p>}
      </div>
      {step !== 2 && (
        <div class="auth-foot">
          <Btn kind="primary" class="wide" disabled={!nextOk || busy} onClick={next}>{busy ? 'Création…' : step === 4 ? 'Créer mon compte' : 'Continuer'}</Btn>
        </div>
      )}
    </div>
  );
}

export function Login() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, '');

  const submit = async (p) => {
    setBusy(true); setErr('');
    try {
      const r = await api.login(digits, p);
      if (r.error) { sfx.bad(); setErr((ERR[r.error] || 'Erreur.') + (r.error === 'bad_pin' && r.left ? ` Encore ${r.left} essai(s).` : '')); setPin(''); if (r.error === 'unknown_phone') setStep(0); }
      else { sfx.done(); signIn(r.token, r.player); go('', true); }
    } catch { setErr(ERR.network); setPin(''); }
    setBusy(false);
  };

  return (
    <div class="screen auth">
      <div class="auth-top">
        <button type="button" class="icon-btn" onClick={() => (step ? setStep(0) : go('', true))} aria-label="Retour"><Icon name="back" /></button>
        <b>Connexion</b>
        <span class="icon-btn ghost" />
      </div>
      <Pingo say={step === 0 ? 'Re-salut ! Quel est ton numéro ?' : 'Et ton code secret ?'} size={80} />
      <div class="auth-body slide-in" key={step}>
        {step === 0 ? (
          <div class="phone-field">
            <span class="prefix">+216</span>
            <input class="field" autoFocus inputMode="tel" type="tel" placeholder="XX XXX XXX" value={phone} onInput={(e) => setPhone(e.currentTarget.value)} onKeyDown={(e) => e.key === 'Enter' && digits.length >= 8 && setStep(1)} autoComplete="tel-national" />
          </div>
        ) : (
          <PinPad value={pin} onChange={setPin} onDone={submit} />
        )}
        {busy && <p class="muted center">Connexion…</p>}
        {err && <p class="err">{err}{err === ERR.unknown_phone && <> <a href="#/signup">Créer un compte</a></>}</p>}
      </div>
      {step === 0 && <div class="auth-foot"><Btn kind="primary" class="wide" disabled={digits.length < 8} onClick={() => { setErr(''); setStep(1); }}>Continuer</Btn></div>}
    </div>
  );
}

