// Allerte cliniche, calcolate dai dati più recenti con le soglie in uso.
// Livelli: "allerta" (rosso) e "attenzione" (arancione).
// Ogni allerta ha una "chiave" che la collega alla voce della riga riassunto da colorare.

import { soglie } from './soglie.js';
import { podDi } from './modello.js';
import { formatNumero } from './util.js';

const ASPETTI_GRAVI = ['enterico', 'biliare', 'purulento', 'chiloso'];
const COLORETTALI = ['colon', 'retto', 'tamis'];

export function calcolaAllerte(p, a, rilevazioni, percorso, ora = new Date()) {
  const s = soglie();
  const f = formatNumero;
  const out = [];
  const aggiungi = (livello, chiave, testo) => out.push({ livello, chiave, testo });
  const recente = (u, ore = 24) => !!u && ora - new Date(u.r.dataOra) <= ore * 3600e3;
  const podDel = (r) => podDi(p, new Date(r.dataOra));

  // Vitali (solo misure delle ultime 24 h)
  const v = a.vitali;
  if (a.tcMax24 && a.tcMax24.valore >= s.tc) aggiungi('allerta', 'tc', `TC ${f(a.tcMax24.valore, 1)} °C`);
  if (recente(v.fc) && v.fc.valore > s.fc) aggiungi('allerta', 'fc', `FC ${f(v.fc.valore)}`);
  if (recente(v.pas) && v.pas.valore <= s.pas) aggiungi('allerta', 'pas', `PAS ${f(v.pas.valore)}`);
  if (recente(v.fr) && v.fr.valore >= s.fr) aggiungi('allerta', 'fr', `FR ${f(v.fr.valore)}`);
  if (recente(v.spo2) && v.spo2.valore <= s.spo2) aggiungi('allerta', 'spo2', `SpO2 ${f(v.spo2.valore)}%`);

  // Diuresi (serve il peso)
  const d = a.diuresi.ml;
  if (d && p.peso && recente(d, 36)) {
    const k = d.valore / p.peso / 24;
    if (k < s.diuresiMlKgH) aggiungi('allerta', 'diuresi', `diuresi ${f(k, 2)} ml/kg/h`);
  }

  // Dolore
  if (recente(a.dolore) && a.dolore.valore >= s.nrs) aggiungi('allerta', 'nrs', `NRS ${a.dolore.valore}`);

  // Drenaggi in sede
  const bilSierica = a.esami.bilTot?.valore;
  for (const dr of a.drenaggi) {
    if (dr.rimosso) continue;
    const k = dr.campi;
    const nome = `D${dr.n}`;
    const chiave = `d${dr.n}`;
    const asp = k.aspetto;
    if (asp) {
      const prima = asp.precedente?.valore;
      const cambiato = prima != null && prima !== asp.valore;
      if (ASPETTI_GRAVI.includes(asp.valore)) aggiungi('allerta', chiave, `${nome} ${asp.valore}${cambiato ? ` (prima ${prima})` : ''}`);
      else if (asp.valore === 'ematico' && cambiato) aggiungi('allerta', chiave, `${nome} diventato ematico`);
    }
    const ml = k.ml;
    if (ml?.precedente && ml.precedente.valore > 0) {
      const pct = ((ml.valore - ml.precedente.valore) / ml.precedente.valore) * 100;
      if (pct >= s.drenaggioAumentoPct) aggiungi('allerta', chiave, `${nome} +${f(pct, 0)}% (${f(ml.precedente.valore)} → ${f(ml.valore)} ml)`);
    }
    if (k.amilasi && podDel(k.amilasi.r) >= s.liquidoDalPod && k.amilasi.valore > s.amilasiVolte * s.amilasiLimiteSup) {
      aggiungi('allerta', chiave, `${nome} amilasi ${f(k.amilasi.valore)} U/l`);
    }
    if (k.bilirubina && bilSierica && podDel(k.bilirubina.r) >= s.liquidoDalPod && k.bilirubina.valore >= s.bilirubinaVolte * bilSierica) {
      aggiungi('allerta', chiave, `${nome} bilirubina ${f(k.bilirubina.valore)} mg/dl`);
    }
    if (k.trigliceridi && k.trigliceridi.valore >= s.trigliceridi) {
      aggiungi('allerta', chiave, `${nome} trigliceridi ${f(k.trigliceridi.valore)} mg/dl`);
    }
  }

  // Esami: serie nel tempo
  const serie = (chiave) => rilevazioni
    .filter((r) => r.categoria === 'esami' && r.valori[chiave] != null)
    .sort((x, y) => (x.dataOra < y.dataOra ? -1 : 1))
    .map((r) => ({ v: r.valori[chiave], pod: podDel(r) }));

  const pcr = serie('pcr');
  if (COLORETTALI.includes(p.intervento?.tipo)) {
    const alPod = pcr.filter((x) => x.pod === s.pcrPod).map((x) => x.v);
    if (alPod.length && Math.max(...alPod) > s.pcrColorettale) {
      aggiungi('allerta', 'pcr', `PCR ${f(Math.max(...alPod))} in POD ${s.pcrPod}`);
    }
  }
  if (pcr.length >= 3) {
    const n = pcr.length;
    const eraScesa = pcr.slice(0, n - 1).some((x, i, l) => i > 0 && x.v < l[i - 1].v);
    if (eraScesa && pcr[n - 1].v > pcr[n - 2].v) aggiungi('allerta', 'pcr', 'PCR in risalita dopo essere scesa');
  }

  const hb = serie('hb').filter((x) => x.pod >= 0);
  if (hb.length) {
    const calo = hb[0].v - hb.at(-1).v; // riferimento = primo valore post-operatorio
    const ultimo = hb.at(-1).v;
    if (ultimo < s.hbMinima) aggiungi('allerta', 'hb', `Hb ${f(ultimo)} g/dl`);
    else if (calo >= s.hbCaloAllerta) aggiungi('allerta', 'hb', `Hb −${f(calo, 1)} g/dl dal post-op`);
    else if (calo >= s.hbCaloAttenzione) aggiungi('attenzione', 'hb', `Hb −${f(calo, 1)} g/dl dal post-op`);
  }

  // Fuori percorso
  if (percorso?.disponibile) {
    const inRitardo = percorso.passi.filter((x) => x.allerta);
    // dell'alimentazione basta l'ultimo passo mancato (es. "non ancora leggero (atteso G3)")
    const ultimaAlim = inRitardo.filter((x) => x.tipo === 'alimentazione').at(-1);
    inRitardo
      .filter((x) => x.tipo !== 'alimentazione' || x === ultimaAlim)
      .forEach((x) => out.push({ livello: 'attenzione', chiave: x.tipo, testo: `Fuori percorso: ${x.allerta}`, percorso: x.tipo }));
    if (percorso.oltreDegenza) {
      out.push({ livello: 'attenzione', chiave: 'degenza', testo: `Degenza oltre ${percorso.notti.notti} notti previste`, percorso: 'degenza' });
    }
  }

  return out.sort((x, y) => (x.livello === y.livello ? 0 : x.livello === 'allerta' ? -1 : 1));
}

export const livelloPeggiore = (allerte) => (allerte.some((x) => x.livello === 'allerta') ? 'allerta' : allerte.length ? 'attenzione' : null);

// Colore di una voce della riga riassunto: allerta / attenzione / peggio / meglio / neutro ('')
// "verso": +1 se l'aumento è un peggioramento (es. PCR), −1 se è un miglioramento (es. Hb)
export function coloreParte(parte, allerte) {
  const mie = allerte.filter((x) => x.chiave === parte.chiave);
  if (mie.some((x) => x.livello === 'allerta')) return 'allerta';
  if (mie.length) return 'attenzione';
  if (!parte.verso || (parte.freccia !== '↑' && parte.freccia !== '↓')) return '';
  return (parte.freccia === '↑') === (parte.verso > 0) ? 'peggio' : 'meglio';
}
