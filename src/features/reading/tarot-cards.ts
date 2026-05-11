import type { TarotCard } from '@/types';

// Immagini bundled locali — Metro risolve require() statici a compile time.
// Ogni require() deve essere letterale (no variabili dinamiche).
const CARD_IMAGES: Record<string, number> = {
  // Major Arcana
  ar00: require('@/assets/tarot-cards/ar00.jpg'),
  ar01: require('@/assets/tarot-cards/ar01.jpg'),
  ar02: require('@/assets/tarot-cards/ar02.jpg'),
  ar03: require('@/assets/tarot-cards/ar03.jpg'),
  ar04: require('@/assets/tarot-cards/ar04.jpg'),
  ar05: require('@/assets/tarot-cards/ar05.jpg'),
  ar06: require('@/assets/tarot-cards/ar06.jpg'),
  ar07: require('@/assets/tarot-cards/ar07.jpg'),
  ar08: require('@/assets/tarot-cards/ar08.jpg'),
  ar09: require('@/assets/tarot-cards/ar09.jpg'),
  ar10: require('@/assets/tarot-cards/ar10.jpg'),
  ar11: require('@/assets/tarot-cards/ar11.jpg'),
  ar12: require('@/assets/tarot-cards/ar12.jpg'),
  ar13: require('@/assets/tarot-cards/ar13.jpg'),
  ar14: require('@/assets/tarot-cards/ar14.jpg'),
  ar15: require('@/assets/tarot-cards/ar15.jpg'),
  ar16: require('@/assets/tarot-cards/ar16.jpg'),
  ar17: require('@/assets/tarot-cards/ar17.jpg'),
  ar18: require('@/assets/tarot-cards/ar18.jpg'),
  ar19: require('@/assets/tarot-cards/ar19.jpg'),
  ar20: require('@/assets/tarot-cards/ar20.jpg'),
  ar21: require('@/assets/tarot-cards/ar21.jpg'),
  // Cups
  cuac: require('@/assets/tarot-cards/cuac.jpg'),
  cu02: require('@/assets/tarot-cards/cu02.jpg'),
  cu03: require('@/assets/tarot-cards/cu03.jpg'),
  cu04: require('@/assets/tarot-cards/cu04.jpg'),
  cu05: require('@/assets/tarot-cards/cu05.jpg'),
  cu06: require('@/assets/tarot-cards/cu06.jpg'),
  cu07: require('@/assets/tarot-cards/cu07.jpg'),
  cu08: require('@/assets/tarot-cards/cu08.jpg'),
  cu09: require('@/assets/tarot-cards/cu09.jpg'),
  cu10: require('@/assets/tarot-cards/cu10.jpg'),
  cupa: require('@/assets/tarot-cards/cupa.jpg'),
  cukn: require('@/assets/tarot-cards/cukn.jpg'),
  cuqu: require('@/assets/tarot-cards/cuqu.jpg'),
  cuki: require('@/assets/tarot-cards/cuki.jpg'),
  // Pentacles
  peac: require('@/assets/tarot-cards/peac.jpg'),
  pe02: require('@/assets/tarot-cards/pe02.jpg'),
  pe03: require('@/assets/tarot-cards/pe03.jpg'),
  pe04: require('@/assets/tarot-cards/pe04.jpg'),
  pe05: require('@/assets/tarot-cards/pe05.jpg'),
  pe06: require('@/assets/tarot-cards/pe06.jpg'),
  pe07: require('@/assets/tarot-cards/pe07.jpg'),
  pe08: require('@/assets/tarot-cards/pe08.jpg'),
  pe09: require('@/assets/tarot-cards/pe09.jpg'),
  pe10: require('@/assets/tarot-cards/pe10.jpg'),
  pepa: require('@/assets/tarot-cards/pepa.jpg'),
  pekn: require('@/assets/tarot-cards/pekn.jpg'),
  pequ: require('@/assets/tarot-cards/pequ.jpg'),
  peki: require('@/assets/tarot-cards/peki.jpg'),
  // Swords
  swac: require('@/assets/tarot-cards/swac.jpg'),
  sw02: require('@/assets/tarot-cards/sw02.jpg'),
  sw03: require('@/assets/tarot-cards/sw03.jpg'),
  sw04: require('@/assets/tarot-cards/sw04.jpg'),
  sw05: require('@/assets/tarot-cards/sw05.jpg'),
  sw06: require('@/assets/tarot-cards/sw06.jpg'),
  sw07: require('@/assets/tarot-cards/sw07.jpg'),
  sw08: require('@/assets/tarot-cards/sw08.jpg'),
  sw09: require('@/assets/tarot-cards/sw09.jpg'),
  sw10: require('@/assets/tarot-cards/sw10.jpg'),
  swpa: require('@/assets/tarot-cards/swpa.jpg'),
  swkn: require('@/assets/tarot-cards/swkn.jpg'),
  swqu: require('@/assets/tarot-cards/swqu.jpg'),
  swki: require('@/assets/tarot-cards/swki.jpg'),
  // Wands
  waac: require('@/assets/tarot-cards/waac.jpg'),
  wa02: require('@/assets/tarot-cards/wa02.jpg'),
  wa03: require('@/assets/tarot-cards/wa03.jpg'),
  wa04: require('@/assets/tarot-cards/wa04.jpg'),
  wa05: require('@/assets/tarot-cards/wa05.jpg'),
  wa06: require('@/assets/tarot-cards/wa06.jpg'),
  wa07: require('@/assets/tarot-cards/wa07.jpg'),
  wa08: require('@/assets/tarot-cards/wa08.jpg'),
  wa09: require('@/assets/tarot-cards/wa09.jpg'),
  wa10: require('@/assets/tarot-cards/wa10.jpg'),
  wapa: require('@/assets/tarot-cards/wapa.jpg'),
  wakn: require('@/assets/tarot-cards/wakn.jpg'),
  waqu: require('@/assets/tarot-cards/waqu.jpg'),
  waki: require('@/assets/tarot-cards/waki.jpg'),
};

// Nomi italiani per tutte le 78 carte
const ITALIAN_NAMES: Record<string, string> = {
  // Major Arcana
  ar00: 'Il Matto',
  ar01: 'Il Mago',
  ar02: "L'Alta Sacerdotessa",
  ar03: "L'Imperatrice",
  ar04: "L'Imperatore",
  ar05: 'Il Papa',
  ar06: 'Gli Amanti',
  ar07: 'Il Carro',
  ar08: 'La Forza',
  ar09: "L'Eremita",
  ar10: 'La Ruota della Fortuna',
  ar11: 'La Giustizia',
  ar12: "L'Appeso",
  ar13: 'La Morte',
  ar14: 'La Temperanza',
  ar15: 'Il Diavolo',
  ar16: 'La Torre',
  ar17: 'La Stella',
  ar18: 'La Luna',
  ar19: 'Il Sole',
  ar20: 'Il Giudizio',
  ar21: 'Il Mondo',
  // Cups (Coppe)
  cuac: 'Asso di Coppe',
  cu02: 'Due di Coppe',
  cu03: 'Tre di Coppe',
  cu04: 'Quattro di Coppe',
  cu05: 'Cinque di Coppe',
  cu06: 'Sei di Coppe',
  cu07: 'Sette di Coppe',
  cu08: 'Otto di Coppe',
  cu09: 'Nove di Coppe',
  cu10: 'Dieci di Coppe',
  cupa: 'Fante di Coppe',
  cukn: 'Cavaliere di Coppe',
  cuqu: 'Regina di Coppe',
  cuki: 'Re di Coppe',
  // Pentacles (Pentacoli)
  peac: 'Asso di Pentacoli',
  pe02: 'Due di Pentacoli',
  pe03: 'Tre di Pentacoli',
  pe04: 'Quattro di Pentacoli',
  pe05: 'Cinque di Pentacoli',
  pe06: 'Sei di Pentacoli',
  pe07: 'Sette di Pentacoli',
  pe08: 'Otto di Pentacoli',
  pe09: 'Nove di Pentacoli',
  pe10: 'Dieci di Pentacoli',
  pepa: 'Fante di Pentacoli',
  pekn: 'Cavaliere di Pentacoli',
  pequ: 'Regina di Pentacoli',
  peki: 'Re di Pentacoli',
  // Swords (Spade)
  swac: 'Asso di Spade',
  sw02: 'Due di Spade',
  sw03: 'Tre di Spade',
  sw04: 'Quattro di Spade',
  sw05: 'Cinque di Spade',
  sw06: 'Sei di Spade',
  sw07: 'Sette di Spade',
  sw08: 'Otto di Spade',
  sw09: 'Nove di Spade',
  sw10: 'Dieci di Spade',
  swpa: 'Fante di Spade',
  swkn: 'Cavaliere di Spade',
  swqu: 'Regina di Spade',
  swki: 'Re di Spade',
  // Wands (Bastoni)
  waac: 'Asso di Bastoni',
  wa02: 'Due di Bastoni',
  wa03: 'Tre di Bastoni',
  wa04: 'Quattro di Bastoni',
  wa05: 'Cinque di Bastoni',
  wa06: 'Sei di Bastoni',
  wa07: 'Sette di Bastoni',
  wa08: 'Otto di Bastoni',
  wa09: 'Nove di Bastoni',
  wa10: 'Dieci di Bastoni',
  wapa: 'Fante di Bastoni',
  wakn: 'Cavaliere di Bastoni',
  waqu: 'Regina di Bastoni',
  waki: 'Re di Bastoni',
};

// Keywords italiane per le 78 carte
const KEYWORDS_IT: Record<string, { up: string[]; rev: string[] }> = {
  ar00: { up: ['inizio', 'spontaneità', 'avventura'], rev: ['imprudenza', 'ingenuità', 'caos'] },
  ar01: { up: ['volontà', 'potere', 'abilità'], rev: ['manipolazione', 'inganno', 'talenti sprecati'] },
  ar02: { up: ['intuizione', 'mistero', 'sapienza'], rev: ['segreti nascosti', 'disconnessione', 'superficialità'] },
  ar03: { up: ['fertilità', 'abbondanza', 'natura'], rev: ['dipendenza', 'soffocamento', 'mancanza'] },
  ar04: { up: ['autorità', 'struttura', 'stabilità'], rev: ['rigidità', 'dominazione', 'perdita di controllo'] },
  ar05: { up: ['tradizione', 'spiritualità', 'guida'], rev: ['ribellione', 'dogma', 'conformismo'] },
  ar06: { up: ['amore', 'scelta', 'unione'], rev: ['conflitto', 'disarmonia', 'scelte difficili'] },
  ar07: { up: ['determinazione', 'controllo', 'vittoria'], rev: ['aggressività', 'mancanza di direzione', 'sconfitta'] },
  ar08: { up: ['coraggio', 'pazienza', 'forza interiore'], rev: ['debolezza', 'dubbio', 'mancanza di fiducia'] },
  ar09: { up: ['introspezione', 'solitudine', 'illuminazione'], rev: ['isolamento', 'ritiro eccessivo', 'perdita di sé'] },
  ar10: { up: ['destino', 'cicli', 'svolta'], rev: ['sfortuna', 'resistenza al cambiamento', 'cicli negativi'] },
  ar11: { up: ['equilibrio', 'verità', 'causa-effetto'], rev: ['ingiustizia', 'disonestà', 'squilibrio'] },
  ar12: { up: ['sacrificio', 'nuova prospettiva', 'attesa'], rev: ['indecisione', 'resistenza', 'ritardo'] },
  ar13: { up: ['trasformazione', 'fine', 'rinascita'], rev: ['resistenza al cambiamento', 'stagnazione', 'paura'] },
  ar14: { up: ['equilibrio', 'moderazione', 'guarigione'], rev: ['eccesso', 'squilibrio', 'impazienza'] },
  ar15: { up: ['dipendenza', 'materialismo', 'ombre'], rev: ['liberazione', 'consapevolezza', 'spezzare catene'] },
  ar16: { up: ['cambiamento improvviso', 'rivelazione', 'rottura'], rev: ['catastrofe evitata', 'paura del cambiamento', 'crisi interiore'] },
  ar17: { up: ['speranza', 'ispirazione', 'fede'], rev: ['disperazione', 'sfiducia', 'perdita di fede'] },
  ar18: { up: ['illusione', 'intuizione', 'inconscio'], rev: ['confusione', 'paure nascoste', 'inganno'] },
  ar19: { up: ['gioia', 'successo', 'vitalità'], rev: ['negatività', 'tristezza', 'ostacoli'] },
  ar20: { up: ['risveglio', 'redenzione', 'riflessione'], rev: ['auto-critica', 'dubbio', 'paura del giudizio'] },
  ar21: { up: ['completamento', 'realizzazione', 'totalità'], rev: ['incompletezza', 'mancanza di chiusura', 'stagnazione'] },
  // Cups
  cuac: { up: ['nuovi sentimenti', 'amore', 'intuizione'], rev: ['emozioni represse', 'offerta rifiutata', 'vuoto emotivo'] },
  cu02: { up: ['partnership', 'amore reciproco', 'unione'], rev: ['separazione', 'squilibrio', 'rottura'] },
  cu03: { up: ['celebrazione', 'amicizia', 'gioia'], rev: ['eccesso', 'isolamento', 'festa mancata'] },
  cu04: { up: ['meditazione', 'contemplazione', 'rivalutazione'], rev: ['azione', 'accettare offerte', 'uscire dal guscio'] },
  cu05: { up: ['perdita', 'rimpianto', 'dolore'], rev: ['accettazione', 'guarigione', 'andare avanti'] },
  cu06: { up: ['nostalgia', 'innocenza', 'ricordi'], rev: ['passato che trattiene', 'ingenuità', 'vivere nel presente'] },
  cu07: { up: ['illusioni', 'scelte', 'fantasia'], rev: ['chiarezza', 'decisione', 'realtà'] },
  cu08: { up: ['abbandono', 'distacco', 'cercare di più'], rev: ['stagnazione', 'paura di lasciare', 'rimanere per abitudine'] },
  cu09: { up: ['appagamento', 'soddisfazione', 'desideri esauditi'], rev: ['insoddisfazione', 'materialismo', 'desideri irrealizzati'] },
  cu10: { up: ['felicità familiare', 'armonia', 'abbondanza emotiva'], rev: ['conflitti familiari', 'disarmonia', 'valori distorti'] },
  cupa: { up: ['messaggi emotivi', 'creatività', 'intuizione'], rev: ['manipolazione emotiva', 'immaturità', 'messaggi bloccati'] },
  cukn: { up: ['romanticismo', 'charme', 'proposte'], rev: ['moodiness', 'inganno romantico', 'proposte false'] },
  cuqu: { up: ['empatia', 'intuizione', 'cura'], rev: ['codipendenza', 'manipolazione emotiva', 'freddezza'] },
  cuki: { up: ['saggezza emotiva', 'diplomazia', 'equilibrio'], rev: ['manipolazione', 'freddezza emotiva', 'sbalzi d\'umore'] },
  // Pentacles
  peac: { up: ['opportunità materiale', 'prosperità', 'inizio concreto'], rev: ['opportunità persa', 'pianificazione carente', 'avarizia'] },
  pe02: { up: ['equilibrio', 'adattabilità', 'gestione'], rev: ['squilibrio', 'disorganizzazione', 'eccesso di impegni'] },
  pe03: { up: ['lavoro di squadra', 'competenza', 'costruzione'], rev: ['conflitti lavorativi', 'mediocrità', 'mancanza di collaborazione'] },
  pe04: { up: ['sicurezza', 'risparmio', 'controllo'], rev: ['avarizia', 'materialismo', 'paura della perdita'] },
  pe05: { up: ['difficoltà finanziarie', 'preoccupazioni', 'bisogno'], rev: ['ripresa', 'aiuto in arrivo', 'superare difficoltà'] },
  pe06: { up: ['generosità', 'equilibrio dare-ricevere', 'beneficenza'], rev: ['debiti', 'dipendenza', 'generosità condizionata'] },
  pe07: { up: ['pazienza', 'investimento a lungo termine', 'perseveranza'], rev: ['impazienza', 'mancanza di ricompensa', 'stagnazione'] },
  pe08: { up: ['artigianato', 'dedizione', 'apprendimento'], rev: ['lavoro mal fatto', 'mancanza di attenzione', 'perfezionismo eccessivo'] },
  pe09: { up: ['abbondanza', 'autosufficienza', 'lusso'], rev: ['dipendenza finanziaria', 'superficialità', 'ostentazione'] },
  pe10: { up: ['ricchezza familiare', 'eredità', 'stabilità a lungo termine'], rev: ['conflitti familiari su denaro', 'rischio finanziario', 'eredità contestata'] },
  pepa: { up: ['ambizione', 'diligenza', 'opportunità pratica'], rev: ['pigrizia', 'mancanza di focus', 'opportunità sprecata'] },
  pekn: { up: ['metodico', 'affidabile', 'perseverante'], rev: ['rigidità', 'ostinazione', 'lentezza eccessiva'] },
  pequ: { up: ['prosperità', 'abbondanza', 'praticità'], rev: ['gelosia materiale', 'insicurezza', 'dipendenza finanziaria'] },
  peki: { up: ['imprenditore', 'affidabilità', 'sicurezza materiale'], rev: ['avidità', 'corruzione', 'gestione sbagliata'] },
  // Swords
  swac: { up: ['chiarezza mentale', 'forza', 'decisione'], rev: ['confusione', 'caos', 'forza mal usata'] },
  sw02: { up: ['stallo', 'decisione difficile', 'equilibrio precario'], rev: ['indecisione', 'informazioni nascoste', 'tensione'] },
  sw03: { up: ['dolore', 'separazione', 'tristezza'], rev: ['guarigione', 'recupero', 'perdonare'] },
  sw04: { up: ['riposo', 'recupero', 'contemplazione'], rev: ['inquietudine', 'impazienza', 'burnout'] },
  sw05: { up: ['conflitto', 'sconfitta', 'vittoria vuota'], rev: ['riconciliazione', 'superare conflitti', 'cambiare tattica'] },
  sw06: { up: ['transizione', 'movimento in avanti', 'lasciare il passato'], rev: ['resistenza al cambiamento', 'bagagli emotivi', 'ritorno al passato'] },
  sw07: { up: ['inganno', 'strategia', 'fare da soli'], rev: ['confessione', 'imprudenza', 'ritorno alla lealtà'] },
  sw08: { up: ['limitazioni', 'restrizione', 'imprigionamento mentale'], rev: ['liberazione', 'nuova prospettiva', 'uscire dalla trappola'] },
  sw09: { up: ['ansia', 'paure notturne', 'preoccupazione'], rev: ['speranza in arrivo', 'fine dell\'angoscia', 'affrontare le paure'] },
  sw10: { up: ['fine dolorosa', 'tradimento', 'crisi'], rev: ['recupero dopo crisi', 'resistenza', 'rinascita'] },
  swpa: { up: ['curiosità intellettuale', 'vigilanza', 'comunicazione'], rev: ['malizia', 'voci', 'comunicazione distorta'] },
  swkn: { up: ['ambizione', 'azione rapida', 'determinazione'], rev: ['impulsività', 'aggressività', 'azioni affrettate'] },
  swqu: { up: ['indipendenza', 'mente acuta', 'giustizia'], rev: ['freddezza', 'crudeltà', 'manipolazione mentale'] },
  swki: { up: ['autorità intellettuale', 'chiarezza', 'leadership'], rev: ['tirannia', 'manipolazione', 'abuso di potere'] },
  // Wands
  waac: { up: ['ispirazione', 'potenziale creativo', 'nuovo progetto'], rev: ['blocco creativo', 'ritardi', 'energia dispersa'] },
  wa02: { up: ['pianificazione', 'visione futura', 'potere personale'], rev: ['paura dell\'ignoto', 'mancanza di pianificazione', 'indecisione'] },
  wa03: { up: ['espansione', 'leadership', 'prospettiva a lungo termine'], rev: ['ritardi nei piani', 'mancanza di progresso', 'ostacoli'] },
  wa04: { up: ['celebrazione', 'armonia', 'stabilità'], rev: ['tensioni domestiche', 'mancanza di armonia', 'celebrazione posticipata'] },
  wa05: { up: ['conflitto', 'competizione', 'sfida'], rev: ['evitare conflitti', 'accordo', 'fine delle tensioni'] },
  wa06: { up: ['vittoria', 'riconoscimento', 'successo pubblico'], rev: ['sconfitta', 'mancanza di riconoscimento', 'ego ferito'] },
  wa07: { up: ['difesa', 'perseveranza', 'posizione'], rev: ['cedere', 'esaurimento', 'dubbio di sé'] },
  wa08: { up: ['velocità', 'movimento rapido', 'comunicazione'], rev: ['ritardi', 'frustrazione', 'confusione'] },
  wa09: { up: ['resilienza', 'coraggio', 'persistenza'], rev: ['paranoia', 'rigidità', 'paura del cambiamento'] },
  wa10: { up: ['peso', 'responsabilità', 'oppressione'], rev: ['alleggerire il carico', 'delegare', 'libertà dal peso'] },
  wapa: { up: ['entusiasmo', 'esplorazione', 'messaggio creativo'], rev: ['superficialità', 'idee senza azione', 'notizie ritardate'] },
  wakn: { up: ['energia', 'passione', 'avventura'], rev: ['impulsività', 'incostanza', 'comportamento spericolato'] },
  waqu: { up: ['carisma', 'fiducia', 'determinazione'], rev: ['egoismo', 'gelosia', 'mancanza di fiducia'] },
  waki: { up: ['visione', 'leadership', 'onore'], rev: ['impulsività', 'tirannia', 'arroganza'] },
};

// Suit in italiano
const SUIT_IT: Record<string, string> = {
  cups: 'Coppe',
  pentacles: 'Pentacoli',
  swords: 'Spade',
  wands: 'Bastoni',
};

// Carica le carte dal JSON e produce array TarotCard (senza reversed)
import cardData from '@/data/tarot-cards.json';

type RawCard = {
  type: string;
  name_short: string;
  name: string;
  value: string;
  value_int: number;
  meaning_up: string;
  meaning_rev: string;
  desc: string;
  suit?: string;
};

function buildCard(raw: RawCard): Omit<TarotCard, 'reversed'> {
  const key = raw.name_short;
  const kw = KEYWORDS_IT[key] ?? { up: [], rev: [] };
  return {
    id: key,
    name: raw.name,
    name_it: ITALIAN_NAMES[key] ?? raw.name,
    arcana: raw.type === 'major' ? 'major' : 'minor',
    suit: raw.suit ? SUIT_IT[raw.suit] ?? raw.suit : undefined,
    number: raw.value_int,
    image: CARD_IMAGES[key],
    keywords: kw.up,
    reversed_keywords: kw.rev,
    meaning_up: raw.meaning_up,
    meaning_rev: raw.meaning_rev,
    desc: raw.desc,
  };
}

export const ALL_CARDS: Omit<TarotCard, 'reversed'>[] = (cardData.cards as RawCard[]).map(buildCard);

export const MAJOR_ARCANA = ALL_CARDS.filter((c) => c.arcana === 'major');
export const MINOR_ARCANA = ALL_CARDS.filter((c) => c.arcana === 'minor');

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawRandom(pool: Omit<TarotCard, 'reversed'>[], count: number): TarotCard[] {
  return shuffle(pool).slice(0, count).map((card) => ({
    ...card,
    reversed: Math.random() < 0.3,
  }));
}

export function drawCardsForDream(cardIds: string[]): TarotCard[] {
  return cardIds.map((id) => {
    const card = ALL_CARDS.find((c) => c.id === id);
    if (!card) return null;
    return { ...card, reversed: Math.random() < 0.3 };
  }).filter(Boolean) as TarotCard[];
}

export function drawCardsForDeck(deckType: 'tre_carte' | 'celtic_cross' | 'sincronia'): TarotCard[] {
  // Celtic Cross usa solo Arcani Maggiori per lettura profonda
  const pool = deckType === 'celtic_cross' ? ALL_CARDS : ALL_CARDS;
  const counts: Record<string, number> = {
    tre_carte: 3,
    celtic_cross: 10,
    sincronia: 1,
  };
  return drawRandom(pool, counts[deckType] ?? 3);
}

export const CELTIC_CROSS_POSITIONS = [
  'La situazione presente',
  "L'ostacolo o sfida",
  'Il passato recente',
  'Il futuro prossimo',
  'La base inconscia',
  'Il potenziale superiore',
  "L'influenza esterna",
  'Le speranze e paure',
  'Il consiglio',
  'Il risultato finale',
];

export const TRE_CARTE_POSITIONS = ['Passato', 'Presente', 'Futuro'];

export const SINCRONIA_POSITIONS = ['Risposta'];
