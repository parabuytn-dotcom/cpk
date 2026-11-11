import { useEffect } from 'preact/hooks';
import { useStore, refresh, flush } from './store.js';
import { useRoute, go, back } from './router.js';
import { Welcome, Signup, Login } from './screens/Auth.jsx';
import { Home, Exams, Path, Leaderboard, Profile, AvatarEdit, BottomNav } from './screens/Main.jsx';
import { Lesson } from './screens/Lesson.jsx';
import { Viewer3D } from './screens/Viewer3D.jsx';
import { LevelUp } from './components/LevelUp.jsx';

export function App() {
  const s = useStore();
  const r = useRoute();
  useEffect(() => {
    refresh(); flush();
    const on = () => { flush(); refresh(); };
    addEventListener('online', on);
    const vis = () => { if (document.visibilityState === 'visible') on(); };
    document.addEventListener('visibilitychange', vis);
    return () => { removeEventListener('online', on); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const key = r.join('/');
  if (!s.token) {
    const p = r[0];
    const screen = p === 'signup' ? <Signup /> : p === 'login' ? <Login /> : <Welcome />;
    return <div class="screen-wrap" key={p || 'welcome'}>{screen}</div>;
  }

  const [a, b, c] = r;
  let screen, nav = true;
  switch (a) {
    case 's': screen = <Exams subject={b} />; break;
    case 'e': screen = <Path examId={b} />; break;
    case 'l': screen = <Lesson examId={b} lessonId={c} key={key} />; nav = false; break;
    case 'rank': screen = <Leaderboard />; break;
    case 'me': screen = <Profile />; break;
    case 'avatar': screen = <AvatarEdit />; nav = false; break;
    case '3d': screen = <Viewer3D model={b} onClose={() => back('')} />; nav = false; break;
    case 'signup': case 'login': go('', true); return null;
    default: screen = <Home />;
  }
  return (
    <>
      <div class="screen-wrap" key={key}>{screen}</div>
      {nav && <BottomNav active={a} />}
      <LevelUp />
    </>
  );
}
