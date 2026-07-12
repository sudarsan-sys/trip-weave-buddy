-- ============================================================
-- TripOS Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique indexes on username and email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx
  ON public.profiles (lower(email));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  destination  TEXT NOT NULL DEFAULT '',
  start_date   DATE,
  end_date     DATE,
  invite_code  TEXT NOT NULL UNIQUE,
  budget_total NUMERIC NOT NULL DEFAULT 0,
  created_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER on_trips_updated
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 3. TRIP_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id   UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

-- ============================================================
-- 4. INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  UNIQUE (trip_id, invited_user_id)
);

-- ============================================================
-- 5. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  category    TEXT CHECK (category IN ('Stay', 'Food', 'Travel', 'Activities', 'Other')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. EXPENSE_SPLITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE (expense_id, user_id)
);

-- ============================================================
-- 7. PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.packages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'link' CHECK (type IN ('pdf', 'link', 'booking')),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL DEFAULT '#',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. CHECKLIST_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id    UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. CHECKLIST_COMPLETIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_completions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);

-- ============================================================
-- 10. CHAT_MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id    UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id      UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size    BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. PLACES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.places (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  image_url   TEXT,
  description TEXT,
  tag         TEXT CHECK (tag IN ('Nature', 'Food', 'Viewpoints', 'Offbeat')),
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. ROUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id    UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'fastest' CHECK (type IN ('fastest', 'experience')),
  name       TEXT NOT NULL,
  duration   TEXT,
  distance   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. ROUTE_STOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.route_stops (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id   UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📍',
  sort_order INT NOT NULL DEFAULT 0
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Anyone can read profiles (needed for username search & display)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile row (on signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- HELPER: is user a member of trip?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid()
  ) INTO is_member;
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: is user an organizer of trip?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trip_organizer(p_trip_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_organizer BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND role = 'organizer'
  ) INTO is_organizer;
  RETURN is_organizer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- TRIPS POLICIES
-- ============================================================

-- Members can view their trips
CREATE POLICY "trips_select_member" ON public.trips
  FOR SELECT USING (public.is_trip_member(id) OR created_by = auth.uid());

-- Authenticated users can create trips
CREATE POLICY "trips_insert_auth" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Organizers can update trips
CREATE POLICY "trips_update_organizer" ON public.trips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = id AND user_id = auth.uid() AND role = 'organizer'
    )
  );

-- ============================================================
-- TRIP_MEMBERS POLICIES
-- ============================================================

CREATE POLICY "trip_members_select" ON public.trip_members
  FOR SELECT USING (public.is_trip_member(trip_id));

-- Allow insert when user is organizer of the trip OR inserting themselves
CREATE POLICY "trip_members_insert" ON public.trip_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = trip_members.trip_id AND user_id = auth.uid() AND role = 'organizer'
    )
  );

CREATE POLICY "trip_members_delete" ON public.trip_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_members.trip_id AND tm.user_id = auth.uid() AND tm.role = 'organizer'
    )
  );

-- ============================================================
-- INVITATIONS POLICIES
-- ============================================================

-- Invited user or trip members can see invitations
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT USING (
    invited_user_id = auth.uid() OR public.is_trip_member(trip_id)
  );

-- Trip members can create invitations
CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT WITH CHECK (public.is_trip_member(trip_id));

-- Invited user can update their invitation (accept/decline)
CREATE POLICY "invitations_update" ON public.invitations
  FOR UPDATE USING (invited_user_id = auth.uid());

-- ============================================================
-- TRIP-SCOPED TABLE POLICIES (expenses, packages, checklist, chat, docs, places, routes)
-- ============================================================

-- Macro: For each trip-scoped table, members can SELECT, INSERT
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'expenses', 'packages', 'checklist_items',
    'chat_messages', 'documents', 'places', 'routes'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_select_member" ON public.%1$I FOR SELECT USING (public.is_trip_member(trip_id))',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%1$s_insert_member" ON public.%1$I FOR INSERT WITH CHECK (public.is_trip_member(trip_id))',
      tbl
    );
  END LOOP;
END;
$$;

-- Strict Update & Delete Policies (Ownership based)
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE USING (paid_by = auth.uid() OR public.is_trip_organizer(trip_id));
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE USING (paid_by = auth.uid() OR public.is_trip_organizer(trip_id));

CREATE POLICY "packages_update_own" ON public.packages FOR UPDATE USING (uploaded_by = auth.uid() OR public.is_trip_organizer(trip_id));
CREATE POLICY "packages_delete_own" ON public.packages FOR DELETE USING (uploaded_by = auth.uid() OR public.is_trip_organizer(trip_id));

CREATE POLICY "chat_messages_update_own" ON public.chat_messages FOR UPDATE USING (user_id = auth.uid() OR public.is_trip_organizer(trip_id));
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE USING (user_id = auth.uid() OR public.is_trip_organizer(trip_id));

CREATE POLICY "documents_update_own" ON public.documents FOR UPDATE USING (uploaded_by = auth.uid() OR public.is_trip_organizer(trip_id));
CREATE POLICY "documents_delete_own" ON public.documents FOR DELETE USING (uploaded_by = auth.uid() OR public.is_trip_organizer(trip_id));

-- Collaborative tables (Any member can edit/delete)
CREATE POLICY "checklist_items_update_member" ON public.checklist_items FOR UPDATE USING (public.is_trip_member(trip_id));
CREATE POLICY "checklist_items_delete_member" ON public.checklist_items FOR DELETE USING (public.is_trip_member(trip_id));

CREATE POLICY "places_update_member" ON public.places FOR UPDATE USING (public.is_trip_member(trip_id));
CREATE POLICY "places_delete_member" ON public.places FOR DELETE USING (public.is_trip_member(trip_id));

CREATE POLICY "routes_update_member" ON public.routes FOR UPDATE USING (public.is_trip_member(trip_id));
CREATE POLICY "routes_delete_member" ON public.routes FOR DELETE USING (public.is_trip_member(trip_id));

-- expense_splits: access via expense's trip
CREATE POLICY "expense_splits_select" ON public.expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
      AND public.is_trip_member(e.trip_id)
    )
  );

CREATE POLICY "expense_splits_insert" ON public.expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
      AND public.is_trip_member(e.trip_id)
    )
  );

CREATE POLICY "expense_splits_delete" ON public.expense_splits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
      AND public.is_trip_member(e.trip_id)
    )
  );

-- checklist_completions: access via checklist item's trip
CREATE POLICY "checklist_completions_select" ON public.checklist_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.checklist_items ci
      WHERE ci.id = checklist_completions.item_id
      AND public.is_trip_member(ci.trip_id)
    )
  );

CREATE POLICY "checklist_completions_insert" ON public.checklist_completions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.checklist_items ci
      WHERE ci.id = checklist_completions.item_id
      AND public.is_trip_member(ci.trip_id)
    )
  );

CREATE POLICY "checklist_completions_delete" ON public.checklist_completions
  FOR DELETE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.checklist_items ci
      WHERE ci.id = checklist_completions.item_id
      AND public.is_trip_member(ci.trip_id)
    )
  );

-- route_stops: access via route's trip
CREATE POLICY "route_stops_select" ON public.route_stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_stops.route_id
      AND public.is_trip_member(r.trip_id)
    )
  );

CREATE POLICY "route_stops_insert" ON public.route_stops
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_stops.route_id
      AND public.is_trip_member(r.trip_id)
    )
  );

CREATE POLICY "route_stops_delete" ON public.route_stops
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_stops.route_id
      AND public.is_trip_member(r.trip_id)
    )
  );

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', REPLACE(NEW.id::TEXT, '-', '')),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE: Create bucket for trip documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-documents',
  'trip-documents',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only trip members can access their trip's documents
CREATE POLICY "trip_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-documents'
    AND public.is_trip_member((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "trip_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-documents'
    AND auth.uid() IS NOT NULL
    AND public.is_trip_member((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "trip_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-documents'
    AND public.is_trip_member((storage.foldername(name))[1]::UUID)
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited ON public.invitations(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_packages_trip ON public.packages(trip_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_trip ON public.checklist_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_item ON public.checklist_completions(item_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip ON public.chat_messages(trip_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_trip ON public.documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_places_trip ON public.places(trip_id);
CREATE INDEX IF NOT EXISTS idx_routes_trip ON public.routes(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trips_invite_code ON public.trips(invite_code);
