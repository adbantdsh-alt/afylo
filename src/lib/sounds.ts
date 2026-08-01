/**
 * Bibliothèque de sons Afryko (démo — des milliers de sons).
 * Remplacée plus tard par un catalogue serveur / licences musicales.
 */
import { photo } from '@/lib/mock';

export type Sound = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
  uses: string; // nb de publications
  audio: string; // URL audio réelle (lecture)
  original?: boolean;
};

// Pistes audio libres de droit (SoundHelix) — pour la lecture réelle.
const AUDIO = Array.from({ length: 16 }, (_, i) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3`);

const TITLES = [
  'Wild Thoughts', 'Calm Down', 'Last Last', 'Unavailable', 'Rush', 'Love Nwantiti', 'Peru', 'Essence', 'Amapiano Vibes',
  'Terminator', 'Kwaku the Traveller', 'Sad Girlz Luv Money', 'Bandana', 'Soweto', 'Water', 'Lonely at the Top', 'City Boys',
  'Ojuelegba', 'Ye', 'Fall', 'Joro', 'Come Closer', 'On the Low', 'Jerusalema', 'Umlando', 'Mnike', 'Tshwala Bam',
  'Sénégal Vibes', 'Dakar Nights', 'Teranga', 'Sabar Remix', 'Mbalax Fusion', 'Afro Drill', 'Coupé Décalé', 'Ndombolo',
];
const ARTISTS = [
  'DJ Khaled', 'Rema', 'Burna Boy', 'Davido', 'Ayra Starr', 'CKay', 'Fireboy DML', 'Wizkid', 'Kabza De Small', 'Asake',
  'Tyla', 'Omah Lay', 'Tems', 'Black Sherif', 'Amaarae', 'Fireboy', 'Master KG', 'Focalistic', 'Sarkodie', 'Youssou N\'Dour',
  'Wally Seck', 'Dip Doundou Guiss', 'Son original',
];

// Génère un grand catalogue (démo) — donne l'impression de "milliers de sons".
function build(): Sound[] {
  const list: Sound[] = [];
  let n = 0;
  for (const t of TITLES) {
    for (let k = 0; k < 6; k++) {
      const artist = ARTISTS[(n + k) % ARTISTS.length];
      const usesK = ((n * 7 + k * 13) % 900) + 12;
      list.push({
        id: `s${n}-${k}`,
        title: k === 0 ? t : `${t} (${['Remix', 'Sped Up', 'Slowed', 'Live', 'Acoustic', 'Amapiano'][k]})`,
        artist,
        cover: photo(`sound-${t}-${k}`.replace(/\W/g, ''), 300, 300),
        duration: `0:${15 + ((n + k) % 45)}`,
        uses: usesK > 500 ? `${(usesK / 100).toFixed(1)} M` : `${usesK} k`,
        audio: AUDIO[(n + k) % AUDIO.length],
        original: artist === 'Son original',
      });
    }
    n++;
  }
  return list;
}

export const sounds: Sound[] = build();

export const featuredSounds = sounds.slice(0, 20);

export const findSound = (id?: string) => sounds.find((s) => s.id === id);

export const searchSounds = (q: string) =>
  q ? sounds.filter((s) => (s.title + ' ' + s.artist).toLowerCase().includes(q.toLowerCase())).slice(0, 60) : featuredSounds;
