// Schermata 2 — Scheda estesa: ultimo valore + ora + fonte, in ordine di priorità.

import { prendi, rilevazioniDi, salvaInsieme } from '../db.js';
import {
  analizza, etichettaPaziente, interventoDi, nomeBreveIntervento, podDi, testoPod, nuovaRilevazione,
} from '../modello.js';
import { valutaPercorso } from '../percorso.js';
import { calcolaAllerte } from '../allerte.js';
import {
  FONTI, VIE, VITALI, TIPI_DRENAGGIO, ASPETTI_DRENAGGIO, DOSAGGI_DRENAGGIO, ASPETTI_SNG,
  NAUSEA_VOMITO, ALIMENTAZIONE, MOBILIZZAZIONE, FERITA, TERAPIE,
} from '../../config/liste.js';
import { ESAMI, GRUPPI_ESAMI } from '../../config/esami.js';
import {
  el, formatNumero, formatQuando, formatData, frecciaTra, nomeDi, nomeLetto, adesso,
} from '../util.js';
import { intestazione, fondo, avviso } from '../ui.js';

const ICONE = {
  fatto: '✓', oggi: '○', ritardo: '!', futuro: '·', 'senza-dati': '?', info: 'i',
};
const SPIEGAZIONE = {
  fatto: 'fatto',
  oggi: 'atteso oggi',
  ritardo: 'in ritardo',
  futuro: 'nei prossimi giorni',
  'senza-dati': 'nessun dato per verificarlo',
  info: '',
};

let percorsoAperto = false; // ricorda se "Percorso completo" era aperto (es. dopo una spunta)

export async function scheda(c, id) {
  const p = await prendi('pazienti', id);
  if (!p) { location.hash = '#/'; return; }
  const ora = new Date();
  const ril = await rilevazioniDi(id);
  const a = analizza(p, ril, ora);
  const percorso = valutaPercorso(p, ril, ora);
  const allerte = calcolaAllerte(p, a, ril, percorso, ora);
  const pod = podDi(p, ora);
  const num = formatNumero;
  const dimesso = p.stato === 'dimesso';

  // Spunta a mano di un passo del percorso (es. fascia, Rx transito): salvata come rilevazione
  async function spunta(passo) {
    const fatto = passo.stato !== 'fatto';
    await salvaInsieme({
      rilevazioni: [nuovaRilevazione(p.id, 'percorso', { passo: passo.id, fatto }, { dataOra: adesso(), fonte: 'io' })],
    });
    avviso(fatto ? 'Segnato come fatto' : 'Spunta tolta');
    const y = window.scrollY;
    c.replaceChildren();
    await scheda(c, id);
    window.scrollTo(0, y);
  }

  const rigaPasso = (passo, conGiorno = false) => el('div', { class: `passo ${passo.stato}` },
    el('span', { class: 'passo-icona', 'aria-hidden': 'true' }, ICONE[passo.stato]),
    el('div', { class: 'passo-testo' },
      conGiorno || passo.giorno == null ? null : el('span', { class: 'passo-giorno' }, `G${passo.giorno} `),
      passo.testo,
      SPIEGAZIONE[passo.stato] ? el('span', { class: 'passo-stato' }, SPIEGAZIONE[passo.stato]) : null),
    passo.tipo === 'manuale' && passo.stato !== 'futuro'
      ? el('button', { type: 'button', class: `btn btn-piccolo ${passo.stato === 'fatto' ? '' : 'btn-primario'}`, onclick: () => spunta(passo) },
        passo.stato === 'fatto' ? 'Togli' : 'Fatto')
      : null);

  // --- Allerte ------------------------------------------------------------------------------
  const bAllerte = allerte.length ? el('section', { class: `blocco blocco-allerte ${allerte[0].livello}` },
    el('h2', {}, `Allerte (${allerte.length})`),
    el('ul', { class: 'elenco-allerte' }, allerte.map((x) => el('li', { class: x.livello }, x.testo)))) : null;

  // --- Atteso oggi dal protocollo -----------------------------------------------------------
  let bAtteso;
  if (!percorso.disponibile) {
    bAtteso = el('section', { class: 'blocco' }, el('h2', {}, 'Percorso atteso'), el('p', { class: 'vuoto' }, percorso.motivo));
  } else {
    const n = percorso.notti;
    const degenza = n ? `Degenza prevista: ${n.aperto ? 'oltre ' : ''}${n.notti} ${n.notti === 1 ? 'notte' : 'notti'}` : null;
    // oggi: i passi di oggi, quelli in ritardo che danno allerta e le spunte a mano rimaste indietro
    const oggi = percorso.passi.filter((x) => x.giorno === pod
      || (x.stato === 'ritardo' && (x.allerta || x.tipo === 'manuale')));
    const note = percorso.passi.filter((x) => x.stato === 'info');
    const perGiorno = new Map();
    percorso.passi.filter((x) => x.giorno != null).forEach((x) => {
      if (!perGiorno.has(x.giorno)) perGiorno.set(x.giorno, []);
      perGiorno.get(x.giorno).push(x);
    });
    bAtteso = el('section', { class: 'blocco' },
      el('h2', {}, pod < 0 ? 'Percorso atteso (pre-op)' : `Atteso oggi (POD ${pod})`),
      degenza ? el('p', { class: percorso.oltreDegenza ? 'campo-nota attenzione' : 'campo-nota' }, degenza) : null,
      oggi.length ? el('div', {}, oggi.map((x) => rigaPasso(x))) : el('p', { class: 'vuoto' }, 'Nessun passo del protocollo previsto per oggi.'),
      note.length ? el('div', {}, note.map((x) => rigaPasso(x))) : null,
      el('details', { class: 'sotto', open: percorsoAperto, ontoggle: (e) => { percorsoAperto = e.target.open; } },
        el('summary', {}, 'Percorso completo'),
        el('div', { class: 'pila' }, [...perGiorno].sort((x, y) => x[0] - y[0]).map(([g, passi]) => el('div', {},
          el('div', { class: `campo-etichetta ${g === pod ? 'oggi-etichetta' : ''}` }, `G${g}${g === pod ? ' · oggi' : ''}`),
          passi.map((x) => rigaPasso(x, true)))))),
      el('p', { class: 'campo-nota' }, 'Protocollo del reparto (rev. 14/02/2026). Le voci si spuntano da sole in base ai dati inseriti; fascia, Rx transito e simili si spuntano a mano.'));
  }

  const meta = (r) => `${formatQuando(r.dataOra, ora)} · ${nomeDi(FONTI, r.fonte)}`;
  // Una riga: etichetta a sinistra, valore a destra, sotto quando e chi
  const voce = (etichetta, valore, r, dettaglio) => {
    if (valore == null || valore === '') return null;
    return el('div', { class: 'voce' },
      el('div', { class: 'voce-etichetta' }, etichetta),
      el('div', { class: 'voce-valore' }, valore, dettaglio ? el('span', { class: 'voce-dettaglio' }, dettaglio) : null),
      r ? el('div', { class: 'voce-meta' }, meta(r)) : null);
  };
  const blocco = (titolo, ...voci) => {
    const v = voci.flat(Infinity).filter(Boolean);
    return el('section', { class: 'blocco' }, el('h2', {}, titolo), v.length ? v : el('p', { class: 'vuoto' }, 'Nessun dato inserito'));
  };
  const prima = (u, unita = '') => (u?.precedente ? `${frecciaTra(u.valore, u.precedente.valore)} prima ${num(u.precedente.valore)}${unita}` : null);
  const siNo = (u) => (u == null ? null : u.valore ? 'sì' : 'no');
  const podDel = (r) => podDi(p, new Date(r.dataOra));

  // --- Intervento ---------------------------------------------------------------------------
  const int = interventoDi(p);
  const bInt = el('section', { class: 'blocco' },
    el('div', { class: 'riga-pod' },
      el('div', { class: 'pod-grande' }, testoPod(pod) || 'POD —'),
      el('a', { class: 'btn btn-piccolo', href: `#/paziente/${p.id}/andamento` }, 'Vedi andamento')),
    voce('Intervento', int?.id === 'altro' ? (p.intervento.dettaglio || 'Altro') : int?.nome, null,
      int?.id !== 'altro' && p.intervento.dettaglio ? p.intervento.dettaglio : null),
    voce('Data', formatData(p.intervento.data)),
    voce('Via', nomeDi(VIE, p.intervento.via)),
    voce('Operatore', p.intervento.operatore),
    voce('Sesso / peso', [p.sesso, p.peso ? `${num(p.peso)} kg` : null].filter(Boolean).join(' · ')));

  // --- 1. Febbre e vitali -------------------------------------------------------------------
  const v = a.vitali;
  const bVitali = blocco('Febbre e vitali',
    voce('TC massima 24 h', a.tcMax24 ? `${num(a.tcMax24.valore, 1)} °C` : 'nessuna misura', a.tcMax24?.r),
    VITALI.filter((x) => x.id !== 'pad').map((x) => {
      const u = v[x.id];
      if (!u) return null;
      if (x.id === 'pas') return voce('PA', `${num(u.valore)}/${v.pad ? num(v.pad.valore) : '–'} mmHg`, u.r);
      return voce(`${x.etichetta} (ultima)`, `${num(u.valore, x.decimali)} ${x.unita}`, u.r, prima(u));
    }));

  // --- 2. Canalizzazione e alimentazione ----------------------------------------------------
  const g = a.gastro;
  const gc = g.campi;
  let canal = null;
  if (g.primeFeci) canal = `a feci dal POD ${podDel(g.primeFeci)}`;
  else if (g.primoGas) canal = `a gas dal POD ${podDel(g.primoGas)}`;
  else if (g.presente) canal = 'non ancora';
  const bGastro = blocco('Canalizzazione e alimentazione',
    voce('Canalizzato', canal, g.primeFeci || g.primoGas || g.ultimo),
    voce('Gas (ultimo)', siNo(gc.gas), gc.gas?.r),
    voce('Feci (ultimo)', siNo(gc.feci), gc.feci?.r),
    voce('Nausea / vomito', nomeDi(NAUSEA_VOMITO, gc.nauseaVomito?.valore), gc.nauseaVomito?.r),
    voce('SNG', gc.sng ? (gc.sng.valore
      ? ['sì', gc.sngMl && `${num(gc.sngMl.valore)} ml`, gc.sngAspetto && nomeDi(ASPETTI_SNG, gc.sngAspetto.valore)].filter(Boolean).join(' · ')
      : 'no') : null, gc.sng?.r, gc.sng?.valore ? prima(gc.sngMl, ' ml') : null),
    voce('Alimentazione', nomeDi(ALIMENTAZIONE, gc.alimentazione?.valore), gc.alimentazione?.r));

  // --- 3. Drenaggi --------------------------------------------------------------------------
  const bDrenaggi = a.drenaggi.length ? a.drenaggi.map((d) => {
    const k = d.campi;
    return blocco(`Drenaggio D${d.n}${k.sede ? ` – ${k.sede.valore}` : ''}${d.rimosso ? ' (rimosso)' : ''}`,
      d.rimosso ? voce('Rimosso', formatQuando(d.ultimo.dataOra, ora), null, `POD ${podDel(d.ultimo)}`) : null,
      voce('Tipo', nomeDi(TIPI_DRENAGGIO, k.tipo?.valore)),
      voce('Quantità 24 h', k.ml ? `${num(k.ml.valore)} ml` : null, k.ml?.r, prima(k.ml, ' ml')),
      voce('Aspetto', nomeDi(ASPETTI_DRENAGGIO, k.aspetto?.valore), k.aspetto?.r,
        k.aspetto?.precedente && k.aspetto.precedente.valore !== k.aspetto.valore
          ? `prima ${nomeDi(ASPETTI_DRENAGGIO, k.aspetto.precedente.valore)}` : null),
      DOSAGGI_DRENAGGIO.map((x) => voce(`${x.etichetta} liquido`, k[x.id] ? `${num(k[x.id].valore)} ${x.unita}` : null, k[x.id]?.r, prima(k[x.id]))));
  }) : blocco('Drenaggi');

  // --- 4. Diuresi ---------------------------------------------------------------------------
  const ml = a.diuresi.ml;
  const bDiuresi = blocco('Diuresi',
    voce('Diuresi 24 h', ml ? `${num(ml.valore)} ml` : null, ml?.r,
      [ml && p.peso ? `${num(ml.valore / p.peso / 24, 2)} ml/kg/h` : null, prima(ml, ' ml')].filter(Boolean).join(' · ') || null),
    voce('Catetere', siNo(a.diuresi.catetere), a.diuresi.catetere?.r));

  // --- 5. Dolore, mobilizzazione, ferita ----------------------------------------------------
  const bAltro = blocco('Dolore, mobilizzazione, ferita',
    voce('NRS', a.dolore ? String(a.dolore.valore) : null, a.dolore?.r, prima(a.dolore)),
    voce('Mobilizzazione', nomeDi(MOBILIZZAZIONE, a.mobilizzazione?.valore), a.mobilizzazione?.r),
    voce('Ferita', nomeDi(FERITA, a.ferita.stato?.valore), a.ferita.stato?.r),
    voce('Nota ferita', a.ferita.nota?.valore, a.ferita.nota?.r));

  // --- 6. Esami -----------------------------------------------------------------------------
  const voceEsame = (e) => {
    const u = a.esami[e.id];
    return u ? voce(e.etichetta, `${num(u.valore)} ${e.unita}`.trim(), u.r, prima(u)) : null;
  };
  const altriGruppi = GRUPPI_ESAMI.map((gr) => {
    const voci = ESAMI.filter((e) => e.gruppo === gr.id && !e.evidenza).map(voceEsame).filter(Boolean);
    return voci.length ? el('div', {}, el('div', { class: 'campo-etichetta' }, gr.nome), voci) : null;
  }).filter(Boolean);
  const bEsami = blocco('Esami',
    ESAMI.filter((e) => e.evidenza).map(voceEsame),
    altriGruppi.length ? el('details', { class: 'sotto' }, el('summary', {}, 'Tutti gli esami'), el('div', { class: 'pila' }, altriGruppi)) : null);

  // --- 7. Terapia ---------------------------------------------------------------------------
  const bTerapia = blocco('Terapia',
    TERAPIE.map((t) => {
      const u = a.terapia[t.id];
      if (!u || u.valore.attivo == null) return null;
      return voce(t.etichetta, u.valore.attivo ? 'sì' : 'no', u.r, u.valore.attivo ? u.valore.nome : null);
    }));

  // --- 8. Note e storico letto --------------------------------------------------------------
  const bNote = blocco('Note',
    a.note.slice(0, 5).map((r) => el('div', { class: 'voce' },
      el('div', { class: 'nota-testo' }, r.valori.testo),
      el('div', { class: 'voce-meta' }, meta(r)))));
  const bLetti = a.letti.length ? blocco('Storico letto',
    a.letti.map((r) => voce('Cambio letto', `${nomeLetto(r.valori.da)} → ${nomeLetto(r.valori.a)}`, r))) : null;

  // Paziente dimesso: scheda in sola lettura (niente allerte, percorso, modifica o inserimento)
  if (dimesso) {
    c.append(
      intestazione({
        titolo: etichettaPaziente(p),
        sottotitolo: ['Archivio', nomeBreveIntervento(p)].filter(Boolean).join(' · '),
        indietro: '#/archivio',
      }),
      el('div', { class: 'contenuto' },
        el('div', { class: 'banner-avviso' },
          `Dimesso il ${formatData(p.dimissione?.data)}${p.dimissione?.controllo ? ` · controllo ${formatData(p.dimissione.controllo)}` : ''}. `
          + `Sola lettura. Cancellazione automatica il ${formatData(p.cancellazioneIl)}.`),
        bInt, bVitali, bGastro, bDrenaggi, bDiuresi, bAltro, bEsami, bTerapia, bNote, bLetti,
        el('p', { class: 'avvertenza' }, 'Promemoria personale: non sostituisce la cartella clinica.')),
      fondo(
        el('a', { class: 'btn', href: '#/archivio' }, 'Archivio'),
        el('a', { class: 'btn btn-primario', href: `#/paziente/${p.id}/andamento` }, 'Andamento')),
    );
    return;
  }

  c.append(
    intestazione({
      titolo: etichettaPaziente(p),
      sottotitolo: [nomeBreveIntervento(p), testoPod(pod)].filter(Boolean).join(' · '),
      indietro: '#/',
      azioni: [el('a', { class: 'btn btn-piccolo', href: `#/paziente/${p.id}/modifica` }, 'Modifica')],
    }),
    el('div', { class: 'contenuto' },
      bAllerte, bInt, bAtteso, bVitali, bGastro, bDrenaggi, bDiuresi, bAltro, bEsami, bTerapia, bNote, bLetti,
      el('a', { class: 'btn btn-largo', href: `#/paziente/${p.id}/dimetti` }, 'Dimetti paziente…'),
      el('p', { class: 'avvertenza' }, 'Promemoria personale: non sostituisce la cartella clinica.')),
    fondo(
      el('a', { class: 'btn', href: `#/paziente/${p.id}/andamento` }, 'Andamento'),
      el('a', { class: 'btn btn-primario', href: `#/paziente/${p.id}/inserisci` }, '+ Inserisci dati')),
  );
}
