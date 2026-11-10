// Interventi del protocollo del reparto (rev. 14/02/2026).
// "notti" = degenza prevista, per via chirurgica ("tutte" = qualunque via).
// Il percorso atteso giorno per giorno (catetere, drenaggi, alimentazione, esami)
// è in config/percorsi.js.
// Per ora esclusi: endoscopici, fegato, varie, port a cath → usare "Altro".

export const INTERVENTI = [
  { id: 'colecistectomia', nome: 'Colecistectomia', notti: { lps: '2', open: '3' } },
  { id: 'tapp', nome: 'Ernioplastica inguinale TAPP', notti: { tutte: '2' } },
  { id: 'ombelicale-lps', nome: 'Ernia ombelicale LPS', notti: { tutte: '2' } },
  { id: 'starr', nome: 'Prolassectomia / STARR', notti: { tutte: '3' } },
  { id: 'emorroidectomia', nome: 'Emorroidectomia', notti: { tutte: '2' } },
  { id: 'ascessi-fistole', nome: 'Ascessi / fistole perianali', notti: { tutte: '1' } },
  { id: 'colon', nome: 'Resezione colon', notti: { lps: '4', robotica: '4', open: '>4' } },
  { id: 'retto', nome: 'Resezione retto / TaTME', notti: { lps: '4', robotica: '4', open: '>4' } },
  { id: 'tamis', nome: 'TAMIS', notti: { tutte: '4' } },
  { id: 'inguinale-open', nome: 'Ernia inguinale open', notti: { tutte: '1' } },
  { id: 'ombelicale-open', nome: 'Ernia ombelicale open', notti: { tutte: '1' } },
  { id: 'laparocele', nome: 'Laparocele', notti: { lps: '2', robotica: '2', open: '>2' } },
  { id: 'sinus', nome: 'Sinus pilonidalis (open / EPSIT)', notti: { tutte: '0–1' } },
  { id: 'dcp', nome: 'Duodenocefalopancreasectomia', notti: { tutte: '>7' } },
  { id: 'pancreas-coda', nome: 'Pancreasectomia distale', notti: { tutte: '>5' } },
  { id: 'gastrica', nome: 'Resezione gastrica', notti: { tutte: '>4' } },
  { id: 'gastrectomia-totale', nome: 'Gastrectomia totale', notti: { tutte: '>4' } },
  { id: 'tiroidectomia', nome: 'Tiroidectomia', notti: { tutte: '2' } },
  { id: 'iatale', nome: 'Ernia iatale LPS', notti: { tutte: '3' } },
  { id: 'altro', nome: 'Altro (specifica nel dettaglio)' },
];
