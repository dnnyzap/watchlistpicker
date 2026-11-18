import { useState } from 'react';
import Sorteador from './components/Sorteador';
import Diario from './components/Diario';
import { useUsuario } from './hooks/useUsuario';
import './App.css';

const ABAS = [
  { id: 'watchlist', rotulo: '🎬 Watchlist' },
  { id: 'recente', rotulo: '📅 Recentes' },
  { id: 'diario', rotulo: '📆 Diário' },
];

export default function App() {
  const [aba, setAba] = useState('watchlist');
  const [user, setUser] = useUsuario();

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
          : <Sorteador key={aba} modo={aba} user={user} setUser={setUser} />}
      </main>
    </div>
  );
}
