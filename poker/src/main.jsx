import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '@fontsource-variable/outfit';
import '@fontsource/bebas-neue';
import './styles.css';
import './sound.js';
import { TopNav, Toasts } from './components/ui.jsx';
import { HomePage } from './pages/Home.jsx';
import { LearnIndex, LessonPage } from './pages/Learn.jsx';
import { TrainIndex, DrillPage } from './pages/Train.jsx';
import { PlayPage } from './pages/Play.jsx';
import { GlossaryPage, ProfilePage } from './pages/Misc.jsx';

const getRoute = () => location.hash.replace(/^#\/?/, '');

function App() {
  const [route, setRoute] = useState(getRoute());
  useEffect(() => {
    const on = () => { setRoute(getRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [a, b] = route.split('/');
  let page;
  if (a === 'apprendre') page = b ? <LessonPage id={b} /> : <LearnIndex />;
  else if (a === 'entrainement') page = b ? <DrillPage id={b} /> : <TrainIndex />;
  else if (a === 'jouer') page = <PlayPage />;
  else if (a === 'lexique') page = <GlossaryPage />;
  else if (a === 'profil') page = <ProfilePage />;
  else page = <HomePage />;
  const fullscreen = a === 'jouer';
  useEffect(() => { document.body.classList.toggle('no-scroll', fullscreen); }, [fullscreen]);
  return (
    <>
      {!fullscreen && <TopNav route={route} />}
      {page}
      <Toasts />
    </>
  );
}

render(<App />, document.getElementById('app'));
