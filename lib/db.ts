import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || '';

let pool: Pool | null = null;
function getPool(): Pool {
  if (!connectionString) {
    throw new Error('No database connected. Add Postgres (Neon) to this Vercel project so DATABASE_URL is set.');
  }
  if (!pool) {
    const local = /localhost|127\.0\.0\.1|\/var\/run/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: local ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS households (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  city_state TEXT,
  mailing_address TEXT,
  ancestor TEXT,
  adults INT NOT NULL DEFAULT 0,
  teens INT NOT NULL DEFAULT 0,
  kids INT NOT NULL DEFAULT 0,
  infants INT NOT NULL DEFAULT 0,
  food_notes TEXT,
  access_notes TEXT,
  keep_private BOOLEAN NOT NULL DEFAULT FALSE,
  volunteer_planning TEXT[] NOT NULL DEFAULT '{}',
  volunteer_event TEXT[] NOT NULL DEFAULT '{}',
  volunteer_other TEXT,
  password_hash TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  helped_by TEXT,
  mail_updates BOOLEAN NOT NULL DEFAULT FALSE,
  members TEXT,
  connection TEXT,
  about TEXT,
  memory TEXT,
  excited TEXT,
  news TEXT,
  profile_public BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  dues_override_cents INT,
  covered_cents INT NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS files (id SERIAL PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS honorees (id SERIAL PRIMARY KEY, name TEXT NOT NULL, photo_url TEXT, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS memorials (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, years TEXT, branch TEXT, tribute TEXT, photo_url TEXT,
  household_id INT REFERENCES households(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY, title TEXT NOT NULL, body TEXT, author TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY, household_id INT REFERENCES households(id) ON DELETE SET NULL,
  category TEXT NOT NULL, title TEXT NOT NULL, link TEXT, details TEXT, photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS idea_likes (
  idea_id INT REFERENCES ideas(id) ON DELETE CASCADE, household_id INT REFERENCES households(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, household_id)
);
CREATE TABLE IF NOT EXISTS idea_comments (
  id SERIAL PRIMARY KEY, idea_id INT REFERENCES ideas(id) ON DELETE CASCADE,
  household_id INT REFERENCES households(id) ON DELETE SET NULL, body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY, question TEXT NOT NULL, category TEXT, closes_on DATE,
  status TEXT NOT NULL DEFAULT 'open', winner_option_id INT, decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY, poll_id INT REFERENCES polls(id) ON DELETE CASCADE, label TEXT NOT NULL,
  idea_id INT REFERENCES ideas(id) ON DELETE SET NULL, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS votes (
  poll_id INT REFERENCES polls(id) ON DELETE CASCADE, household_id INT REFERENCES households(id) ON DELETE CASCADE,
  option_id INT REFERENCES poll_options(id) ON DELETE CASCADE, PRIMARY KEY (poll_id, household_id)
);
CREATE TABLE IF NOT EXISTS goals (id SERIAL PRIMARY KEY, name TEXT NOT NULL, goal_cents INT NOT NULL DEFAULT 0, allocated_cents INT NOT NULL DEFAULT 0, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY, household_id INT REFERENCES households(id) ON DELETE SET NULL,
  amount_cents INT NOT NULL, method TEXT, paid_on DATE, toward TEXT NOT NULL DEFAULT 'dues', note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assistance_requests (
  id SERIAL PRIMARY KEY, household_id INT REFERENCES households(id) ON DELETE CASCADE,
  note TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS committees (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, about TEXT, sort INT NOT NULL DEFAULT 0,
  lead_household_id INT REFERENCES households(id) ON DELETE SET NULL, notes TEXT
);
CREATE TABLE IF NOT EXISTS committee_members (
  committee_id INT REFERENCES committees(id) ON DELETE CASCADE, household_id INT REFERENCES households(id) ON DELETE CASCADE,
  PRIMARY KEY (committee_id, household_id)
);
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY, household_id INT REFERENCES households(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'photo', url TEXT NOT NULL, album TEXT NOT NULL DEFAULT 'Family Profiles',
  caption TEXT, size_bytes INT NOT NULL DEFAULT 0, hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const DEFAULT_STORY = `Finding a name for this reunion wasn't easy. Across our family, nearly every household carries a different last name. But no matter whose name is on the mailbox, we all lead back to the same two women: Grandma Susie and Grandma Janie.

Grandma Susie was born a Banks, and so were all of her siblings. We may not know every name that came before her, but we know Banks was the family name, and that is where our roots run deepest. Grandma Janie carried the Smith name from Susie's marriage, but her line traces back to that same Banks family.

This reunion is named to honor them both. I know how proud they would be to see us coming together like this. Wherever life has taken us, we know where our roots are. And as we explore those roots together, we honor the ancestors who made all of us possible.`;

export const DEFAULT_SETTINGS: Record<string, any> = {
  welcome: {
    dateLine: 'Summer 2027 · All branches welcome',
    tagline: 'Honoring our roots. Gathering our family.',
    storyHeading: 'Why Banks?',
    story: DEFAULT_STORY,
    signature: 'On behalf of the planning committee',
  },
  dues: {
    adult: null, teen: null, kid: null, latePrice: null, depositPct: null,
    depositDue: '', balanceDue: '', lateStarts: '', elderAge: '', under3Free: true,
  },
  payment: { instructions: '' },
  access: { requireApproval: false },
  travel: {
    city: '', dates: '', airport: '', reunionDate: '', venueName: '', venueAddress: '', parking: '', mapLink: '',
    schedule: '', hotelName: '', hotelRate: '', hotelCode: '', hotelBookBy: '', hotelLink: '', notes: '',
    lockUntilPaid: false,
  },
};

const COMMITTEES = [
  ['Finance', 'Collects dues, tracks spending, and keeps the Money tab up to date.'],
  ['Venue and Lodging', 'Finds and books the venue and sets up the hotel block.'],
  ['Food and Catering', 'Plans meals, works with caterers, and handles allergies and diets.'],
  ['Communications', 'Sends updates and reminders, and helps elders who are not online.'],
  ['Activities and Games', 'Plans games, the kids corner, and the evening program.'],
  ['Shirts and Keepsakes', 'Runs the shirt design vote, collects sizes, and orders keepsakes.'],
  ['Family History and Tree', 'Gathers stories, photos, and names to build the Banks family tree.'],
];

const GOALS = ['Venue', 'Food and catering', 'Shirts', 'Decorations and supplies', 'Activities', 'Keepsakes and memorial table'];

async function seed(p: Pool) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await p.query('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, JSON.stringify(value)]);
  }
  const c = await p.query('SELECT count(*)::int AS n FROM committees');
  if (c.rows[0].n === 0) {
    for (let i = 0; i < COMMITTEES.length; i++) {
      await p.query('INSERT INTO committees(name, about, sort) VALUES ($1, $2, $3)', [COMMITTEES[i][0], COMMITTEES[i][1], i]);
    }
  }
  const h = await p.query('SELECT count(*)::int AS n FROM honorees');
  if (h.rows[0].n === 0) {
    await p.query("INSERT INTO honorees(name, sort) VALUES ('Susie Bell Banks (Henderson)', 0), ('Janie Lou Reed', 1)");
  }
  const g = await p.query('SELECT count(*)::int AS n FROM goals');
  if (g.rows[0].n === 0) {
    for (let i = 0; i < GOALS.length; i++) {
      await p.query('INSERT INTO goals(name, sort) VALUES ($1, $2)', [GOALS[i], i]);
    }
  }
}

let ready: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!ready) {
    const p = getPool();
    ready = p
      .query(SCHEMA)
      .then(() => seed(p))
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();
  const r = await getPool().query(text, params);
  return r.rows as T[];
}

export async function one<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export async function getSetting<T = any>(key: string): Promise<T> {
  const row = await one<{ value: any }>('SELECT value FROM settings WHERE key = $1', [key]);
  return { ...(DEFAULT_SETTINGS[key] || {}), ...(row?.value || {}) } as T;
}

export async function setSetting(key: string, value: any) {
  await q(
    'INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, JSON.stringify(value)]
  );
}
