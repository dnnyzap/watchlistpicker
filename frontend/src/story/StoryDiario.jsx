import { useEffect, useRef, useState } from 'react';
import { desenharStory, OPCOES_PADRAO } from './desenharStory';
import './StoryDiario.css';

const CHAVE_OPCOES = 'story-opcoes';
const FUNDOS = [
  { id: 'banner', rotulo: 'Banner' },
  { id: 'preto', rotulo: 'Preto' },
  { id: 'cor', rotulo: 'Cor' },
];

function lerOpcoes() {
  try {
    return { ...OPCOES_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_OPCOES) || '{}') };
  } catch {
    return OPCOES_PADRAO;
  }
}

export default function StoryDiario({ story, user, nomeArquivo }) {
  const canvasRef = useRef(null);
  const [opcoes, setOpcoesState] = useState(lerOpcoes);
  const [desenhado, setDesenhado] = useState(null); // { story, opcoes } que ja estao no canvas
  const [podeCompartilhar] = useState(() =>
    Boolean(navigator.canShare?.({ files: [new File([''], 'teste.png', { type: 'image/png' })] })));
  const pronto = desenhado?.story === story && desenhado?.opcoes === opcoes;

  const setOpcoes = (mudanca) => {
    const novas = { ...opcoes, ...mudanca };
    setOpcoesState(novas);
    try { localStorage.setItem(CHAVE_OPCOES, JSON.stringify(novas)); } catch { /* sem storage */ }
  };

  useEffect(() => {
    let cancelado = false;
    // Desenha num canvas fora da tela e copia no final, para o preview nao piscar ao trocar opcoes.
    const rascunho = document.createElement('canvas');
    desenharStory(rascunho, { story, user, opcoes }).then(() => {
      if (cancelado || !canvasRef.current) return;
      const alvo = canvasRef.current;
      alvo.width = rascunho.width;
      alvo.height = rascunho.height;
      alvo.getContext('2d').drawImage(rascunho, 0, 0);
      setDesenhado({ story, opcoes });
    });
    return () => { cancelado = true; };
  }, [story, user, opcoes]);

  const gerarArquivo = () => new Promise((resolve, reject) => {
    canvasRef.current.toBlob((blob) => {
      if (blob) resolve(new File([blob], nomeArquivo, { type: 'image/png' }));
      else reject(new Error('Não foi possível gerar a imagem.'));
    }, 'image/png');
  });

  const baixar = async () => {
    const arquivo = await gerarArquivo();
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const compartilhar = async () => {
    const arquivo = await gerarArquivo();
    try {
      await navigator.share({ files: [arquivo] });
    } catch {
      // usuario cancelou o compartilhamento
    }
  };

  return (
    <div className="story">
      <div className={`story-moldura${pronto ? '' : ' carregando'}`}>
        <canvas ref={canvasRef} className="story-canvas" />
        {!desenhado && <span className="story-status">Montando o story...</span>}
      </div>

      <div className="story-lateral">
        <fieldset className="story-grupo">
          <legend>Mostrar</legend>
          <label className="story-check">
            <input type="checkbox" checked={opcoes.notas} onChange={(e) => setOpcoes({ notas: e.target.checked })} />
            Notas em estrelas
          </label>
          <label className="story-check">
            <input type="checkbox" checked={opcoes.marcas} onChange={(e) => setOpcoes({ marcas: e.target.checked })} />
            Curtidos e revistos
          </label>
        </fieldset>

        <fieldset className="story-grupo">
          <legend>Fundo</legend>
          <div className="segmentado">
            {FUNDOS.map(({ id, rotulo }) => (
              <button key={id} type="button" className={opcoes.fundo === id ? 'ativo' : ''}
                onClick={() => setOpcoes({ fundo: id })}>
                {rotulo}
              </button>
            ))}
          </div>
          {opcoes.fundo === 'cor' && (
            <label className="story-cor">
              <input type="color" value={opcoes.cor} onChange={(e) => setOpcoes({ cor: e.target.value })} />
              {opcoes.cor.toUpperCase()}
            </label>
          )}
        </fieldset>

        <div className="story-acoes">
          {podeCompartilhar && (
            <button type="button" className="story-btn primario" onClick={compartilhar} disabled={!pronto}>
              Compartilhar
            </button>
          )}
          <button type="button" className={`story-btn${podeCompartilhar ? '' : ' primario'}`}
            onClick={baixar} disabled={!pronto}>
            Baixar imagem
          </button>
        </div>
      </div>
    </div>
  );
}
