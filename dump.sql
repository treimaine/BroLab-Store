--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: beats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beats (
    id integer NOT NULL,
    wordpress_id integer NOT NULL,
    title text NOT NULL,
    description text,
    genre text NOT NULL,
    bpm integer NOT NULL,
    key text,
    mood text,
    price integer NOT NULL,
    audio_url text,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    tags text[],
    featured boolean DEFAULT false,
    downloads integer DEFAULT 0,
    views integer DEFAULT 0,
    duration integer
);


--
-- Name: beats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.beats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: beats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.beats_id_seq OWNED BY public.beats.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    beat_id integer NOT NULL,
    license_type text NOT NULL,
    price integer NOT NULL,
    quantity integer DEFAULT 1,
    session_id text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    session_id text,
    email text NOT NULL,
    total integer NOT NULL,
    status text NOT NULL,
    stripe_payment_intent_id text,
    items jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    stripe_customer_id text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: beats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beats ALTER COLUMN id SET DEFAULT nextval('public.beats_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: beats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.beats (id, wordpress_id, title, description, genre, bpm, key, mood, price, audio_url, image_url, is_active, created_at, tags, featured, downloads, views, duration) FROM stdin;
1	1	Dark Trap Vibes	This dark trap beat combines heavy 808s with atmospheric pads and crisp hi-hats.	Trap	140	A minor	Dark	2500	https://example.com/audio/dark-trap-vibes.mp3	https://example.com/images/dark-trap-vibes.jpg	t	2025-07-17 16:55:58.171482	{trap,dark,atmospheric}	t	0	0	180
2	2	Melodic Pop	A melodic pop beat perfect for commercial releases and radio play.	Pop	128	C major	Uplifting	3000	https://example.com/audio/melodic-pop.mp3	https://example.com/images/melodic-pop.jpg	t	2025-07-17 16:55:58.171482	{pop,melodic,commercial}	f	0	0	200
3	3	Hip-Hop Classic	Classic hip-hop vibes with boom-bap drums and soulful samples.	Hip-Hop	95	F# minor	Nostalgic	3500	https://example.com/audio/hip-hop-classic.mp3	https://example.com/images/hip-hop-classic.jpg	t	2025-07-17 16:55:58.171482	{hip-hop,classic,boom-bap}	t	0	0	160
4	4	Chill Lo-Fi	Relaxing lo-fi beat with vinyl crackle and warm atmospheric tones.	Lo-Fi	85	G major	Chill	2000	https://example.com/audio/chill-lofi.mp3	https://example.com/images/chill-lofi.jpg	t	2025-07-17 16:55:58.171482	{lo-fi,chill,relaxing}	f	0	0	140
5	5	Hard Drill	Aggressive drill beat with heavy 808s and sharp hi-hats.	Drill	150	D minor	Aggressive	2800	https://example.com/audio/hard-drill.mp3	https://example.com/images/hard-drill.jpg	t	2025-07-17 16:55:58.171482	{drill,aggressive,hard}	f	0	0	190
6	6	Ambient Soundscape	Ethereal ambient beat perfect for meditation and background music.	Ambient	70	E minor	Peaceful	1800	https://example.com/audio/ambient-soundscape.mp3	https://example.com/images/ambient-soundscape.jpg	t	2025-07-17 16:55:58.171482	{ambient,peaceful,meditation}	t	0	0	220
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, beat_id, license_type, price, quantity, session_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, session_id, email, total, status, stripe_payment_intent_id, items, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password, stripe_customer_id, created_at) FROM stdin;
1	testuser	treigua38000@gmail.com	$2b$10$l5I.aA2htVIqPjmqhqJaDuDE348ziVgkirRl3ubGKozHWbWixuhfa	\N	2025-07-17 22:16:14.677057
\.


--
-- Name: beats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.beats_id_seq', 6, true);


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: beats beats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beats
    ADD CONSTRAINT beats_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- PostgreSQL database dump complete
--

