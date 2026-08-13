\restrict dbmate

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _backup_20260806150000_player_match_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._backup_20260806150000_player_match_stats (
    id integer,
    is_duck boolean,
    overs_bowled numeric
);


--
-- Name: gameweeks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gameweeks (
    id integer NOT NULL,
    label text NOT NULL,
    phase text DEFAULT 'group_stage'::text NOT NULL,
    deadline_time timestamp without time zone NOT NULL,
    finished boolean DEFAULT false NOT NULL,
    data_checked boolean DEFAULT false NOT NULL,
    CONSTRAINT gameweeks_phase_check CHECK ((phase = ANY (ARRAY['group_stage'::text, 'playoffs'::text])))
);


--
-- Name: gameweeks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gameweeks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gameweeks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gameweeks_id_seq OWNED BY public.gameweeks.id;


--
-- Name: league_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.league_memberships (
    id integer NOT NULL,
    league_id integer NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: league_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.league_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: league_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.league_memberships_id_seq OWNED BY public.league_memberships.id;


--
-- Name: leagues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leagues (
    id integer NOT NULL,
    name text NOT NULL,
    join_code text,
    creator_id uuid,
    league_type text DEFAULT 'classic'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT leagues_league_type_check CHECK ((league_type = 'classic'::text))
);


--
-- Name: leagues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leagues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leagues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leagues_id_seq OWNED BY public.leagues.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    gameweek_id integer NOT NULL,
    team_a_id integer NOT NULL,
    team_b_id integer NOT NULL,
    match_date timestamp without time zone NOT NULL,
    venue text,
    match_status text DEFAULT 'scheduled'::text NOT NULL,
    toss_winner_id integer,
    player_of_match_id integer,
    winner_team_id integer,
    win_margin integer,
    win_margin_type text,
    published boolean DEFAULT false NOT NULL,
    published_at timestamp without time zone,
    CONSTRAINT matches_match_status_check CHECK ((match_status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'no_result'::text, 'abandoned'::text, 'dls_adjusted'::text]))),
    CONSTRAINT matches_win_margin_type_check CHECK ((win_margin_type = ANY (ARRAY['runs'::text, 'wickets'::text, 'tie'::text, 'no_result'::text])))
);


--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: player_match_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_match_points (
    id integer NOT NULL,
    player_id integer NOT NULL,
    match_id integer NOT NULL,
    config_version_id integer NOT NULL,
    batting_points numeric DEFAULT 0 NOT NULL,
    bowling_points numeric DEFAULT 0 NOT NULL,
    fielding_points numeric DEFAULT 0 NOT NULL,
    participation_points numeric DEFAULT 0 NOT NULL,
    total_points numeric NOT NULL,
    computed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: player_match_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_match_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_match_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_match_points_id_seq OWNED BY public.player_match_points.id;


--
-- Name: player_match_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_match_stats (
    id integer NOT NULL,
    player_id integer NOT NULL,
    match_id integer NOT NULL,
    runs integer DEFAULT 0 NOT NULL,
    balls_faced integer DEFAULT 0 NOT NULL,
    fours integer DEFAULT 0 NOT NULL,
    sixes integer DEFAULT 0 NOT NULL,
    is_batting_dismissal boolean DEFAULT false NOT NULL,
    runs_conceded integer DEFAULT 0 NOT NULL,
    wickets integer DEFAULT 0 NOT NULL,
    maidens integer DEFAULT 0 NOT NULL,
    catches_taken integer DEFAULT 0 NOT NULL,
    stumpings integer DEFAULT 0 NOT NULL,
    run_outs_direct integer DEFAULT 0 NOT NULL,
    run_outs_assist integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT false NOT NULL,
    published_at timestamp without time zone,
    legal_balls_bowled integer DEFAULT 0 NOT NULL,
    strike_rate numeric(6,2),
    economy_rate numeric(6,2)
);


--
-- Name: player_match_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_match_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_match_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_match_stats_id_seq OWNED BY public.player_match_stats.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id integer NOT NULL,
    name text NOT NULL,
    real_team_id integer,
    "position" text NOT NULL,
    is_overseas boolean DEFAULT false NOT NULL,
    category text,
    fantasy_category text,
    now_cost integer NOT NULL,
    season_start_price integer NOT NULL,
    cost_change_event integer DEFAULT 0 NOT NULL,
    price_change_percent numeric DEFAULT 0 NOT NULL,
    acquisition_status text,
    real_acquisition_price_npr_lakh numeric,
    status text DEFAULT 'available'::text NOT NULL,
    news text,
    available_from_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    removed boolean DEFAULT false NOT NULL,
    CONSTRAINT players_fantasy_category_check CHECK ((fantasy_category = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
    CONSTRAINT players_position_check CHECK (("position" = ANY (ARRAY['batsman'::text, 'bowler'::text, 'all_rounder'::text, 'wicket_keeper'::text]))),
    CONSTRAINT players_status_check CHECK ((status = ANY (ARRAY['available'::text, 'injured'::text, 'unavailable'::text, 'suspended'::text])))
);


--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: playing_xi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playing_xi (
    id integer NOT NULL,
    match_id integer NOT NULL,
    player_id integer NOT NULL,
    real_team_id integer,
    is_match_wicket_keeper boolean DEFAULT false NOT NULL
);


--
-- Name: playing_xi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playing_xi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playing_xi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playing_xi_id_seq OWNED BY public.playing_xi.id;


--
-- Name: real_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.real_teams (
    id integer NOT NULL,
    name text NOT NULL,
    short_name text,
    status text DEFAULT 'active'::text NOT NULL,
    eliminated_at timestamp without time zone,
    CONSTRAINT real_teams_status_check CHECK ((status = ANY (ARRAY['active'::text, 'eliminated'::text])))
);


--
-- Name: real_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.real_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: real_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.real_teams_id_seq OWNED BY public.real_teams.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: scoring_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_config (
    id integer NOT NULL,
    version_id integer NOT NULL,
    effective_from timestamp without time zone NOT NULL,
    stat_key text NOT NULL,
    "position" text,
    point_value numeric NOT NULL,
    CONSTRAINT chk_scoring_config_position CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['batsman'::text, 'bowler'::text, 'all_rounder'::text, 'wicket_keeper'::text]))))
);


--
-- Name: scoring_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scoring_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scoring_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scoring_config_id_seq OWNED BY public.scoring_config.id;


--
-- Name: squad_gameweek_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.squad_gameweek_points (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    gameweek_id integer NOT NULL,
    total_points numeric NOT NULL,
    computed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: squad_gameweek_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.squad_gameweek_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: squad_gameweek_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.squad_gameweek_points_id_seq OWNED BY public.squad_gameweek_points.id;


--
-- Name: squad_gameweek_selection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.squad_gameweek_selection (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    gameweek_id integer NOT NULL,
    player_id integer NOT NULL,
    is_starting boolean NOT NULL,
    bench_order integer,
    is_captain boolean DEFAULT false NOT NULL,
    is_vice_captain boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_sgs_starting_bench_consistency CHECK ((((is_starting = true) AND (bench_order IS NULL)) OR ((is_starting = false) AND (bench_order IS NOT NULL))))
);


--
-- Name: squad_gameweek_selection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.squad_gameweek_selection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: squad_gameweek_selection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.squad_gameweek_selection_id_seq OWNED BY public.squad_gameweek_selection.id;


--
-- Name: squad_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.squad_players (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    player_id integer NOT NULL,
    purchase_price integer NOT NULL,
    forced_transfer_pending boolean DEFAULT false NOT NULL,
    forced_transfer_deadline timestamp without time zone,
    acquired_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: squad_players_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.squad_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: squad_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.squad_players_id_seq OWNED BY public.squad_players.id;


--
-- Name: stat_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stat_corrections (
    id integer NOT NULL,
    player_match_stats_id integer NOT NULL,
    field_changed text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_at timestamp without time zone DEFAULT now() NOT NULL,
    reason text
);


--
-- Name: stat_corrections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stat_corrections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stat_corrections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stat_corrections_id_seq OWNED BY public.stat_corrections.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    short_code character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transfers (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    gameweek_id integer,
    player_out_id integer,
    player_in_id integer,
    transfer_type text NOT NULL,
    points_cost integer DEFAULT 0 NOT NULL,
    triggered_by_team_id integer,
    resolved_at timestamp without time zone DEFAULT now() NOT NULL,
    auto_resolved boolean DEFAULT false NOT NULL,
    CONSTRAINT transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['free'::text, 'paid'::text, 'forced'::text])))
);


--
-- Name: transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transfers_id_seq OWNED BY public.transfers.id;


--
-- Name: user_chips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_chips (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    chip_type text NOT NULL,
    used_gameweek_id integer,
    used_at timestamp without time zone,
    CONSTRAINT user_chips_chip_type_check CHECK ((chip_type = ANY (ARRAY['wildcard'::text, 'triple_captain'::text, 'bench_boost'::text])))
);


--
-- Name: user_chips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_chips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_chips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_chips_id_seq OWNED BY public.user_chips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_name text NOT NULL,
    phone_or_email text NOT NULL,
    auth_provider_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'scorer_admin'::text, 'roster_admin'::text, 'super_admin'::text])))
);


--
-- Name: gameweeks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gameweeks ALTER COLUMN id SET DEFAULT nextval('public.gameweeks_id_seq'::regclass);


--
-- Name: league_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_memberships ALTER COLUMN id SET DEFAULT nextval('public.league_memberships_id_seq'::regclass);


--
-- Name: leagues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues ALTER COLUMN id SET DEFAULT nextval('public.leagues_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: player_match_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_points ALTER COLUMN id SET DEFAULT nextval('public.player_match_points_id_seq'::regclass);


--
-- Name: player_match_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_stats ALTER COLUMN id SET DEFAULT nextval('public.player_match_stats_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: playing_xi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi ALTER COLUMN id SET DEFAULT nextval('public.playing_xi_id_seq'::regclass);


--
-- Name: real_teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.real_teams ALTER COLUMN id SET DEFAULT nextval('public.real_teams_id_seq'::regclass);


--
-- Name: scoring_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_config ALTER COLUMN id SET DEFAULT nextval('public.scoring_config_id_seq'::regclass);


--
-- Name: squad_gameweek_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_points ALTER COLUMN id SET DEFAULT nextval('public.squad_gameweek_points_id_seq'::regclass);


--
-- Name: squad_gameweek_selection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection ALTER COLUMN id SET DEFAULT nextval('public.squad_gameweek_selection_id_seq'::regclass);


--
-- Name: squad_players id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_players ALTER COLUMN id SET DEFAULT nextval('public.squad_players_id_seq'::regclass);


--
-- Name: stat_corrections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_corrections ALTER COLUMN id SET DEFAULT nextval('public.stat_corrections_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers ALTER COLUMN id SET DEFAULT nextval('public.transfers_id_seq'::regclass);


--
-- Name: user_chips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chips ALTER COLUMN id SET DEFAULT nextval('public.user_chips_id_seq'::regclass);


--
-- Name: gameweeks gameweeks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gameweeks
    ADD CONSTRAINT gameweeks_pkey PRIMARY KEY (id);


--
-- Name: league_memberships league_memberships_league_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_memberships
    ADD CONSTRAINT league_memberships_league_id_user_id_key UNIQUE (league_id, user_id);


--
-- Name: league_memberships league_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_memberships
    ADD CONSTRAINT league_memberships_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_join_code_key UNIQUE (join_code);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: player_match_points player_match_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_points
    ADD CONSTRAINT player_match_points_pkey PRIMARY KEY (id);


--
-- Name: player_match_points player_match_points_player_id_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_points
    ADD CONSTRAINT player_match_points_player_id_match_id_key UNIQUE (player_id, match_id);


--
-- Name: player_match_stats player_match_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_stats
    ADD CONSTRAINT player_match_stats_pkey PRIMARY KEY (id);


--
-- Name: player_match_stats player_match_stats_player_id_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_stats
    ADD CONSTRAINT player_match_stats_player_id_match_id_key UNIQUE (player_id, match_id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: playing_xi playing_xi_match_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi
    ADD CONSTRAINT playing_xi_match_id_player_id_key UNIQUE (match_id, player_id);


--
-- Name: playing_xi playing_xi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi
    ADD CONSTRAINT playing_xi_pkey PRIMARY KEY (id);


--
-- Name: real_teams real_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.real_teams
    ADD CONSTRAINT real_teams_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scoring_config scoring_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_config
    ADD CONSTRAINT scoring_config_pkey PRIMARY KEY (id);


--
-- Name: scoring_config scoring_config_version_id_stat_key_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_config
    ADD CONSTRAINT scoring_config_version_id_stat_key_position_key UNIQUE (version_id, stat_key, "position");


--
-- Name: squad_gameweek_points squad_gameweek_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_points
    ADD CONSTRAINT squad_gameweek_points_pkey PRIMARY KEY (id);


--
-- Name: squad_gameweek_points squad_gameweek_points_user_id_gameweek_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_points
    ADD CONSTRAINT squad_gameweek_points_user_id_gameweek_id_key UNIQUE (user_id, gameweek_id);


--
-- Name: squad_gameweek_selection squad_gameweek_selection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection
    ADD CONSTRAINT squad_gameweek_selection_pkey PRIMARY KEY (id);


--
-- Name: squad_gameweek_selection squad_gameweek_selection_user_id_gameweek_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection
    ADD CONSTRAINT squad_gameweek_selection_user_id_gameweek_id_player_id_key UNIQUE (user_id, gameweek_id, player_id);


--
-- Name: squad_players squad_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_players
    ADD CONSTRAINT squad_players_pkey PRIMARY KEY (id);


--
-- Name: squad_players squad_players_user_id_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_players
    ADD CONSTRAINT squad_players_user_id_player_id_key UNIQUE (user_id, player_id);


--
-- Name: stat_corrections stat_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_corrections
    ADD CONSTRAINT stat_corrections_pkey PRIMARY KEY (id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_short_code_key UNIQUE (short_code);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: user_chips user_chips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chips
    ADD CONSTRAINT user_chips_pkey PRIMARY KEY (id);


--
-- Name: user_chips user_chips_user_id_chip_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chips
    ADD CONSTRAINT user_chips_user_id_chip_type_key UNIQUE (user_id, chip_type);


--
-- Name: users users_phone_or_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_or_email_key UNIQUE (phone_or_email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_matches_gameweek_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_gameweek_id ON public.matches USING btree (gameweek_id);


--
-- Name: idx_players_real_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_real_team_id ON public.players USING btree (real_team_id);


--
-- Name: idx_sgs_gameweek_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sgs_gameweek_player ON public.squad_gameweek_selection USING btree (gameweek_id, player_id);


--
-- Name: idx_sgs_one_captain_per_user_gameweek; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sgs_one_captain_per_user_gameweek ON public.squad_gameweek_selection USING btree (user_id, gameweek_id) WHERE (is_captain = true);


--
-- Name: idx_sgs_one_vice_captain_per_user_gameweek; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sgs_one_vice_captain_per_user_gameweek ON public.squad_gameweek_selection USING btree (user_id, gameweek_id) WHERE (is_vice_captain = true);


--
-- Name: users_auth_provider_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_auth_provider_id_unique ON public.users USING btree (auth_provider_id) WHERE (auth_provider_id IS NOT NULL);


--
-- Name: league_memberships league_memberships_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_memberships
    ADD CONSTRAINT league_memberships_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id);


--
-- Name: league_memberships league_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_memberships
    ADD CONSTRAINT league_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: leagues leagues_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: matches matches_gameweek_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_gameweek_id_fkey FOREIGN KEY (gameweek_id) REFERENCES public.gameweeks(id);


--
-- Name: matches matches_player_of_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_player_of_match_id_fkey FOREIGN KEY (player_of_match_id) REFERENCES public.players(id);


--
-- Name: matches matches_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.real_teams(id);


--
-- Name: matches matches_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.real_teams(id);


--
-- Name: matches matches_toss_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_toss_winner_id_fkey FOREIGN KEY (toss_winner_id) REFERENCES public.real_teams(id);


--
-- Name: matches matches_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.real_teams(id);


--
-- Name: player_match_points player_match_points_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_points
    ADD CONSTRAINT player_match_points_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: player_match_points player_match_points_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_points
    ADD CONSTRAINT player_match_points_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: player_match_stats player_match_stats_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_stats
    ADD CONSTRAINT player_match_stats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: player_match_stats player_match_stats_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_match_stats
    ADD CONSTRAINT player_match_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: players players_real_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_real_team_id_fkey FOREIGN KEY (real_team_id) REFERENCES public.real_teams(id);


--
-- Name: playing_xi playing_xi_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi
    ADD CONSTRAINT playing_xi_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id);


--
-- Name: playing_xi playing_xi_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi
    ADD CONSTRAINT playing_xi_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: playing_xi playing_xi_real_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_xi
    ADD CONSTRAINT playing_xi_real_team_id_fkey FOREIGN KEY (real_team_id) REFERENCES public.real_teams(id);


--
-- Name: squad_gameweek_points squad_gameweek_points_gameweek_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_points
    ADD CONSTRAINT squad_gameweek_points_gameweek_id_fkey FOREIGN KEY (gameweek_id) REFERENCES public.gameweeks(id);


--
-- Name: squad_gameweek_points squad_gameweek_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_points
    ADD CONSTRAINT squad_gameweek_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: squad_gameweek_selection squad_gameweek_selection_gameweek_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection
    ADD CONSTRAINT squad_gameweek_selection_gameweek_id_fkey FOREIGN KEY (gameweek_id) REFERENCES public.gameweeks(id);


--
-- Name: squad_gameweek_selection squad_gameweek_selection_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection
    ADD CONSTRAINT squad_gameweek_selection_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: squad_gameweek_selection squad_gameweek_selection_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_gameweek_selection
    ADD CONSTRAINT squad_gameweek_selection_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: squad_players squad_players_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_players
    ADD CONSTRAINT squad_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: squad_players squad_players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.squad_players
    ADD CONSTRAINT squad_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stat_corrections stat_corrections_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_corrections
    ADD CONSTRAINT stat_corrections_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: stat_corrections stat_corrections_player_match_stats_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_corrections
    ADD CONSTRAINT stat_corrections_player_match_stats_id_fkey FOREIGN KEY (player_match_stats_id) REFERENCES public.player_match_stats(id);


--
-- Name: transfers transfers_gameweek_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_gameweek_id_fkey FOREIGN KEY (gameweek_id) REFERENCES public.gameweeks(id);


--
-- Name: transfers transfers_player_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_player_in_id_fkey FOREIGN KEY (player_in_id) REFERENCES public.players(id);


--
-- Name: transfers transfers_player_out_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_player_out_id_fkey FOREIGN KEY (player_out_id) REFERENCES public.players(id);


--
-- Name: transfers transfers_triggered_by_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_triggered_by_team_id_fkey FOREIGN KEY (triggered_by_team_id) REFERENCES public.real_teams(id);


--
-- Name: transfers transfers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_chips user_chips_used_gameweek_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chips
    ADD CONSTRAINT user_chips_used_gameweek_id_fkey FOREIGN KEY (used_gameweek_id) REFERENCES public.gameweeks(id);


--
-- Name: user_chips user_chips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chips
    ADD CONSTRAINT user_chips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260729202142'),
    ('20260802120000'),
    ('20260804152122'),
    ('20260806072336'),
    ('20260806073615'),
    ('20260806143408'),
    ('20260807161917');
