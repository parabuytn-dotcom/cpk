import { render } from 'preact';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './styles.css';
import { App } from './app.jsx';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
render(<App />, document.getElementById('app'));
