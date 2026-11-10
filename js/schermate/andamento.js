// Schermata 3 — Andamento: grafici per POD + tabella giorno per giorno.

import { prendi, rilevazioniDi } from '../db.js';
import { etichettaPaziente, nomeBreveIntervento, testoPod } from '../modello.js';
import {
  datiAndamento, diCategoria, puntiNelTempo, puntiGiornalieri,
} from '../andamento.js';
import { grafico } from '../grafico.js';
import { soglie } from '../soglie.js';
import {
  ASPETTI_DRENAGGIO, ALIMENTAZIONE, MOBILIZZAZIONE, FERITA, NAUSEA_VOMITO,
} from '../../config/liste.js';
import { ESAMI } from '../../config/esami.js';
import { el, formatNumero, nomeDi } from '../util.js';
import { intestazione, fondo, scelta } from '../ui.js';

export async function andamento(c, id) {
  const p = await prendi('pazienti', id);
  if (!p) { location.hash = '#/'; return; }
  const A = datiAndamento(p, await rilevazioniDi(id));

  const grafici = el('div', { class: 'pila' }, costruisciGrafici(p, A));
  const boxTabella = el('div', { class: 'tabella-scorri', hidden: true }, costruisciTabella(p, A));
  const mostra = (vista) => {
    grafici.hidden = vista !== 'grafici';
    boxTabella.hidden = vista !== 'tabella';
    if (vista === 'tabella') boxTabella.scrollLeft = boxTabella.scrollWidth; // mostra subito gli ultimi giorni
  };

  c.append(
    intestazione({
      titolo: etichettaPaziente(p),
      sottotitolo: ['Andamento', nomeBreveIntervento(p), testoPod(A.podOggi)].filter(Boolean).join(' · '),
      indietro: `#/paziente/${p.id}`,
    }),
    el('div', { class: 'contenuto' },
      scelta({
        opzioni: [{ id: 'grafici', etichetta: 'Grafici' }, { id: 'tabella', etichetta: 'Tabella' }],
        valore: 'grafici', deselezionabile: false, classe: 'schede-vista', onCambio: mostra,
      }),
      grafici,
      boxTabella),
    fondo(
      el('a', { class: 'btn', href: `#/paziente/${p.id}` }, 'Scheda'),
      el('a', { class: 'btn btn-primario', href: `#/paziente/${p.id}/inserisci` }, '+ Inserisci dati')),
  );
}

// --- Grafici ----------------------------------------------------------------------------------

function costruisciGrafici(p, A) {
  const carte = [];
  const aggiungi = (titolo, unita, opzioni, legenda) => {
    if (!opzioni.serie.some((se) => se.punti.length)) return; // niente dati, niente grafico
    carte.push(el('section', { class: 'blocco' },
      el('h2', {}, titolo, unita ? el('span', { class: 'unita-titolo' }, unita) : null),
      legenda ? el('div', { class: 'legenda' }, legenda.map((l) => el('span', {}, el('span', { class: `pallino ${l.classe}` }), l.testo))) : null,
      grafico({ dominio: A.dominio, descrizione: titolo, ...opzioni })));
  };

  const vit = diCategoria(A, 'vitali');

  // 1. Febbre e vitali
  aggiungi('Temperatura', '°C', {
    serie: [{ tipo: 'linea', classe: 's1', punti: puntiNelTempo(vit, 'tc') }],
    riferimenti: [{ y: soglie().tc, etichetta: formatNumero(soglie().tc, 1) }],
    minimoY: 36, decimali: 1,
  });
  aggiungi('Frequenza cardiaca', 'bpm', {
    serie: [{ tipo: 'linea', classe: 's1', punti: puntiNelTempo(vit, 'fc') }],
    riferimenti: [{ y: soglie().fc, etichetta: String(soglie().fc) }],
  });
  aggiungi('Pressione arteriosa', 'mmHg', {
    serie: [{
      tipo: 'intervallo', classe: 's1',
      punti: vit.filter((x) => x.v.pas != null).map((x) => ({ x: x.x, y: x.v.pas, y2: x.v.pad ?? x.v.pas })),
    }],
    riferimenti: [{ y: soglie().pas, etichetta: `PAS ${soglie().pas}` }],
  }, [{ classe: 's1', testo: 'da diastolica a sistolica' }]);

  // 2. Diuresi
  const rifDiuresi = p.peso ? [{ y: soglie().diuresiMlKgH * p.peso * 24, etichetta: `${formatNumero(soglie().diuresiMlKgH)} ml/kg/h` }] : [];
  aggiungi('Diuresi 24 h', 'ml', {
    serie: [{ tipo: 'barre', classe: 's1', punti: puntiGiornalieri(diCategoria(A, 'diuresi'), 'ml') }],
    riferimenti: rifDiuresi, includiZero: true,
  });

  // 3. Drenaggi (e SNG se presente)
  const serieDren = [1, 2].map((n) => {
    const lista = diCategoria(A, 'drenaggio', (x) => x.v.n === n);
    const sede = lista.map((x) => x.v.sede).filter(Boolean).at(-1);
    return { n, sede, punti: puntiGiornalieri(lista, 'ml') };
  }).filter((d) => d.punti.length);
  aggiungi('Drenaggi', 'ml/24 h', {
    serie: serieDren.map((d, i) => ({ tipo: 'barre', classe: `s${i + 1}`, punti: d.punti })),
    includiZero: true,
  }, serieDren.map((d, i) => ({ classe: `s${i + 1}`, testo: `D${d.n}${d.sede ? ` ${d.sede}` : ''}` })));
  aggiungi('SNG', 'ml/24 h', {
    serie: [{ tipo: 'barre', classe: 's2', punti: puntiGiornalieri(diCategoria(A, 'gastro'), 'sngMl') }],
    includiZero: true,
  });

  // 4. Esami in evidenza
  const esami = diCategoria(A, 'esami');
  aggiungi('PCR', 'mg/l', { serie: [{ tipo: 'linea', classe: 's1', punti: puntiNelTempo(esami, 'pcr') }], includiZero: true });
  aggiungi('Hb', 'g/dl', { serie: [{ tipo: 'linea', classe: 's1', punti: puntiNelTempo(esami, 'hb') }], decimali: 1 });
  aggiungi('GB', '×10³/µl', { serie: [{ tipo: 'linea', classe: 's1', punti: puntiNelTempo(esami, 'gb') }], decimali: 1 });

  if (!carte.length) return el('p', { class: 'vuoto lista-vuota' }, 'Ancora nessun dato da mostrare. I grafici compaiono man mano che inserisci i dati.');
  return [
    ...carte,
    el('p', { class: 'avvertenza' }, 'Ogni colonna è un giorno post-operatorio (POD). Linee tratteggiate rosse = soglie delle allerte (modificabili nelle Impostazioni).'),
  ];
}

// --- Tabella giorno per giorno ---------------------------------------------------------------

function costruisciTabella(p, A) {
  const { giorni } = A;
  const del = (g, cat, filtro = () => true) => (A.perGiorno.get(g) || []).filter((x) => x.r.categoria === cat && filtro(x)).map((x) => x.v);
  const valori = (g, cat, k, filtro) => del(g, cat, filtro).map((v) => v[k]).filter((v) => v != null);
  const massimo = (g, cat, k) => { const v = valori(g, cat, k); return v.length ? Math.max(...v) : null; };
  const minimo = (g, cat, k) => { const v = valori(g, cat, k); return v.length ? Math.min(...v) : null; };
  const ultimo = (g, cat, k, filtro) => valori(g, cat, k, filtro).at(-1) ?? null;
  const n = (x, dec) => (x == null ? '' : formatNumero(x, dec));
  const sn = (x) => (x == null ? '' : x ? 'sì' : 'no');
  const almenoUnSi = (g, cat, k) => { const v = valori(g, cat, k); return v.length ? v.some((x) => x === true) : null; };
  const etichetta = (lista) => (x) => nomeDi(lista, x) ?? '';

  const righe = [
    { gruppo: 'Febbre e vitali' },
    { nome: 'TC max', f: (g) => n(massimo(g, 'vitali', 'tc'), 1) },
    { nome: 'FC max', f: (g) => n(massimo(g, 'vitali', 'fc')) },
    {
      nome: 'PA (ultima)',
      f: (g) => {
        const v = del(g, 'vitali').filter((x) => x.pas != null).at(-1);
        return v ? `${n(v.pas)}/${n(v.pad) || '–'}` : '';
      },
    },
    { nome: 'PAS min', f: (g) => n(minimo(g, 'vitali', 'pas')) },
    { nome: 'SpO2 min', f: (g) => n(minimo(g, 'vitali', 'spo2')) },
    { nome: 'FR max', f: (g) => n(massimo(g, 'vitali', 'fr')) },
    { nome: 'Glicemia max', f: (g) => n(massimo(g, 'vitali', 'glicemia')) },

    { gruppo: 'Canalizzazione' },
    { nome: 'Gas', f: (g) => sn(almenoUnSi(g, 'gastro', 'gas')) },
    { nome: 'Feci', f: (g) => sn(almenoUnSi(g, 'gastro', 'feci')) },
    {
      nome: 'Nausea/vomito',
      f: (g) => {
        const ordine = ['no', 'nausea', 'vomito'];
        const v = valori(g, 'gastro', 'nauseaVomito');
        return v.length ? nomeDi(NAUSEA_VOMITO, v.reduce((a, b) => (ordine.indexOf(b) > ordine.indexOf(a) ? b : a))).toLowerCase() : '';
      },
    },
    { nome: 'SNG ml', f: (g) => n(ultimo(g, 'gastro', 'sngMl')) },
    { nome: 'Alimentazione', f: (g) => etichetta(ALIMENTAZIONE)(ultimo(g, 'gastro', 'alimentazione')) },

    { gruppo: 'Drenaggi' },
    ...[1, 2].flatMap((d) => {
      const filtro = (x) => x.v.n === d;
      const sede = A.tutte.filter((x) => x.r.categoria === 'drenaggio' && x.v.n === d).map((x) => x.v.sede).filter(Boolean).at(-1);
      const nome = `D${d}${sede ? ` ${sede}` : ''}`;
      return [
        { nome: `${nome} ml`, f: (g) => n(ultimo(g, 'drenaggio', 'ml', filtro)) },
        {
          nome: `${nome} aspetto`,
          f: (g) => {
            const asp = etichetta(ASPETTI_DRENAGGIO)(ultimo(g, 'drenaggio', 'aspetto', filtro));
            const rimosso = valori(g, 'drenaggio', 'rimosso', filtro).includes(true);
            return [asp, rimosso ? 'rimosso' : ''].filter(Boolean).join(' · ');
          },
        },
        { nome: `${nome} amilasi`, f: (g) => n(ultimo(g, 'drenaggio', 'amilasi', filtro)) },
        { nome: `${nome} bilirubina`, f: (g) => n(ultimo(g, 'drenaggio', 'bilirubina', filtro)) },
        { nome: `${nome} trigliceridi`, f: (g) => n(ultimo(g, 'drenaggio', 'trigliceridi', filtro)) },
      ];
    }),

    { gruppo: 'Diuresi' },
    { nome: 'Diuresi ml', f: (g) => n(ultimo(g, 'diuresi', 'ml')) },
    { nome: 'ml/kg/h', f: (g) => { const ml = ultimo(g, 'diuresi', 'ml'); return ml != null && p.peso ? n(ml / p.peso / 24, 2) : ''; } },
    { nome: 'Catetere', f: (g) => sn(ultimo(g, 'diuresi', 'catetere')) },

    { gruppo: 'Dolore e ripresa' },
    { nome: 'NRS max', f: (g) => n(massimo(g, 'dolore', 'nrs')) },
    { nome: 'Mobilizzazione', f: (g) => etichetta(MOBILIZZAZIONE)(ultimo(g, 'mobilizzazione', 'livello')) },
    { nome: 'Ferita', f: (g) => etichetta(FERITA)(ultimo(g, 'ferita', 'stato')) },

    { gruppo: 'Esami' },
    ...[...ESAMI.filter((e) => e.evidenza), ...ESAMI.filter((e) => !e.evidenza)].map((e) => ({
      nome: e.etichetta, f: (g) => n(ultimo(g, 'esami', e.id)),
    })),
  ];

  // Calcola le celle e toglie righe vuote e gruppi rimasti senza righe
  const piene = [];
  let gruppoInSospeso = null;
  for (const riga of righe) {
    if (riga.gruppo) { gruppoInSospeso = riga; continue; }
    const celle = giorni.map((g) => riga.f(g));
    if (!celle.some((x) => x !== '')) continue;
    if (gruppoInSospeso) { piene.push(gruppoInSospeso); gruppoInSospeso = null; }
    piene.push({ ...riga, celle });
  }
  if (!piene.length) return el('p', { class: 'vuoto lista-vuota' }, 'Ancora nessun dato da mostrare.');

  const dataBreve = (g) => {
    const d = A.dataDelGiorno(g);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const classeGiorno = (g) => (g === A.podOggi ? 'oggi' : null);

  return el('table', { class: 'tabella' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'POD'),
      giorni.map((g) => el('th', { class: classeGiorno(g) }, g < 0 ? 'pre' : String(g), el('span', { class: 'data' }, dataBreve(g)))))),
    el('tbody', {}, piene.map((r) => (r.gruppo
      ? el('tr', { class: 'gruppo' }, el('td', {}, r.gruppo), el('td', { colspan: String(giorni.length) }))
      : el('tr', {}, el('td', {}, r.nome), r.celle.map((x, i) => el('td', { class: classeGiorno(giorni[i]) }, x)))))));
}
