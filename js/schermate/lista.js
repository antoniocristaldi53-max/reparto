// Schermata 1 — Lista reparto: una riga per letto con il riassunto da leggere ad alta voce.
// Pazienti con allerte in cima (prima rosso, poi arancione), poi gli altri; dentro ogni gruppo per letto.

import { tutti } from '../db.js';
import { analizza, riassunto, testoParte } from '../modello.js';
import { valutaPercorso } from '../percorso.js';
import { calcolaAllerte, livelloPeggiore, coloreParte } from '../allerte.js';
import { el, confrontaLetti } from '../util.js';
import { intestazione, avviso } from '../ui.js';
import { cancellaScaduti, inScadenza } from '../archivio.js';
import { protezione } from '../blocco.js';
import { INDIRIZZO_APP } from '../pwa.js';

const ORDINE_LIVELLO = { allerta: 0, attenzione: 1 };

export async function lista(c) {
  const cancellati = await cancellaScaduti(); // ciclo di vita: dimessi arrivati alla data di cancellazione
  if (cancellati) avviso(`${cancellati} ${cancellati === 1 ? 'paziente dimesso cancellato' : 'pazienti dimessi cancellati'} (data raggiunta)`);
  const [pazienti, rilevazioni] = await Promise.all([tutti('pazienti'), tutti('rilevazioni')]);
  const daCancellare = pazienti.filter((p) => inScadenza(p));
  const perPaziente = new Map();
  for (const r of rilevazioni) {
    if (!perPaziente.has(r.pazienteId)) perPaziente.set(r.pazienteId, []);
    perPaziente.get(r.pazienteId).push(r);
  }

  const ora = new Date();
  const voci = pazienti.filter((p) => p.stato === 'degenza').map((p) => {
    const ril = perPaziente.get(p.id) || [];
    const a = analizza(p, ril, ora);
    const allerte = calcolaAllerte(p, a, ril, valutaPercorso(p, ril, ora), ora);
    return { p, r: riassunto(p, a, ora), allerte, livello: livelloPeggiore(allerte) };
  }).sort((x, y) => (ORDINE_LIVELLO[x.livello] ?? 2) - (ORDINE_LIVELLO[y.livello] ?? 2) || confrontaLetti(x.p.letto, y.p.letto));

  const righe = voci.map(({ p, r, allerte, livello }) => {
    const parti = [];
    r.parti.forEach((x, i) => {
      if (i) parti.push(' · ');
      const colore = coloreParte(x, allerte);
      parti.push(el('span', { class: ['parte', colore, x.vecchio && !colore ? 'vecchio' : ''].filter(Boolean).join(' ') }, testoParte(x)));
    });
    // Riga ⚠ compatta: solo ciò che il riassunto non mostra già colorato, più i "fuori percorso" raggruppati
    const chiaviMostrate = new Set(r.parti.map((x) => x.chiave));
    const altre = allerte.filter((x) => !x.percorso && !chiaviMostrate.has(x.chiave));
    const fuori = allerte.filter((x) => x.percorso).map((x) => x.percorso);
    const voci = [
      ...altre.map((x) => el('span', { class: x.livello }, x.testo)),
      fuori.length ? el('span', { class: 'attenzione' }, `fuori percorso: ${fuori.join(', ')}`) : null,
    ].filter(Boolean);
    const lineaAllerte = voci.length ? el('div', { class: 'riga-allerte' }, voci.map((x, i) => [i ? ' · ' : '', x])) : null;
    return el('div', { class: `riga ${livello || ''}` },
      el('a', { class: 'riga-link', href: `#/paziente/${p.id}` },
        el('div', { class: 'riga-intest' }, r.intestazione),
        lineaAllerte,
        el('div', { class: 'riga-parti' }, parti.length ? parti : el('span', { class: 'vuoto' }, 'nessun dato inserito'))),
      el('a', { class: 'riga-aggiungi', href: `#/paziente/${p.id}/inserisci`, 'aria-label': 'Inserisci dati' }, '+'));
  });

  const conAllerte = voci.filter((v) => v.livello).length;
  c.append(
    intestazione({
      titolo: 'Reparto',
      sottotitolo: `${voci.length} ${voci.length === 1 ? 'paziente' : 'pazienti'}${conAllerte ? ` · ${conAllerte} con allerte` : ''}`,
      azioni: [
        el('a', { class: 'btn btn-piccolo', href: '#/archivio' }, 'Archivio'),
        el('a', { class: 'btn btn-piccolo', href: '#/impostazioni', 'aria-label': 'Impostazioni' }, '⚙︎'),
      ],
    }),
    el('div', { class: 'contenuto' },
      protezione() ? null : el('div', { class: 'banner-avviso' },
        '⚠︎ Stai usando un indirizzo di prova non sicuro: PIN e backup non sono attivi. Usa l’app su ',
        el('a', { href: INDIRIZZO_APP }, INDIRIZZO_APP.replace('https://', '')),
        ' (aggiungila alla schermata Home da lì).'),
      daCancellare.length ? el('a', { class: 'banner-avviso', href: '#/archivio' },
        `${daCancellare.length} ${daCancellare.length === 1 ? 'paziente in archivio verrà cancellato' : 'pazienti in archivio verranno cancellati'} entro 3 giorni. Tocca per vedere o rinviare.`) : null,
      righe.length ? righe : el('div', { class: 'lista-vuota' },
        el('p', {}, 'Nessun paziente in degenza.'),
        el('p', { class: 'vuoto' }, 'Tocca “+ Paziente”, oppure carica i pazienti di prova dalle Impostazioni (⚙︎).')),
      righe.length ? el('p', { class: 'avvertenza legenda-colori' },
        el('span', { class: 'allerta' }, 'rosso = allerta'), ' · ',
        el('span', { class: 'attenzione' }, 'arancione = attenzione / peggiora'), ' · ',
        el('span', { class: 'meglio' }, 'verde = migliora')) : null,
      el('p', { class: 'avvertenza' }, 'Promemoria personale: non sostituisce la cartella clinica.')),
    el('a', { class: 'btn btn-primario fab', href: '#/paziente/nuovo' }, '+ Paziente'),
  );
}
