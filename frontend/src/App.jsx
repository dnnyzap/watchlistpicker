import { useState } from 'react';
import Sorteador from './components/Sorteador';
import Diario from './components/Diario';
import { useUsuario } from './hooks/useUsuario';
import { useServidor } from './hooks/useServidor';
import './App.css';

const ABAS = [
  { id: 'sortear', rotulo: 'Sortear' },
  { id: 'diario', rotulo: 'Diário' },
];

export default function App() {
  const [aba, setAba] = useState('sortear');
  const [user, setUser] = useUsuario();
  const servidor = useServidor();

  return (
    <div className="app">
      <nav className="nav">
        {ABAS.map(({ id, rotulo }) => (
          <button key={id} className={aba === id ? 'ativo' : ''} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </nav>
      <main className="main">
        {aba === 'diario'
          ? <Diario user={user} setUser={setUser} />
          : <Sorteador user={user} setUser={setUser} />}
      </main>

      {servidor === 'acordando' && (
        <div className="servidor-aviso" role="status">
          <span className="servidor-spinner" />
          Acordando o servidor… Ele roda num plano gratuito e dorme quando ninguém usa,
          então a primeira visita pode levar até 1 minuto.
        </div>
      )}
      {servidor === 'fora' && (
        <div className="servidor-aviso erro" role="alert">
          O servidor não respondeu. Tente recarregar a página em instantes.
        </div>
      )}

      <footer className="rodape">
        <p>
          Pôsteres e imagens de <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>.
          {' '}This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>Projeto pessoal, sem vínculo com o Letterboxd.</p>
      </footer>
    </div>
  );
}
