-- ============================================================================
-- YUVENZA26 - seed data
-- Permission catalog, default roles, and the site's current content so the
-- database starts exactly where the static site left off.
-- Idempotent: content inserts use ON CONFLICT DO NOTHING (re-running never
-- clobbers admin edits); the permission catalog and default role grants are
-- upserted.
-- Run AFTER supabase/migrations/0001_initial_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permission catalog (mirror of lib/rbac/permissions.ts)
-- ---------------------------------------------------------------------------
insert into public.permissions (key, label, category) values
  ('content.view',    'View content',                  'Content'),
  ('content.create',  'Create content',                'Content'),
  ('content.edit',    'Edit content',                  'Content'),
  ('content.delete',  'Delete content',                'Content'),
  ('content.publish', 'Publish / unpublish content',   'Content'),
  ('media.view',      'View media library',            'Media'),
  ('media.upload',    'Upload / replace media',        'Media'),
  ('media.delete',    'Delete media',                  'Media'),
  ('payments.view',   'View orders & payments',        'Payments'),
  ('payments.manage', 'Manage payment configuration',  'Payments'),
  ('users.manage',    'Manage users',                  'Administration'),
  ('roles.manage',    'Manage roles & permissions',    'Administration'),
  ('settings.manage', 'Manage site settings',          'Administration')
on conflict (key) do update set label = excluded.label, category = excluded.category;

-- ---------------------------------------------------------------------------
-- Default roles
-- ---------------------------------------------------------------------------
insert into public.roles (name, description, is_system) values
  ('super_admin', 'Full access to every feature, setting, user, role and permission.', true),
  ('admin',       'Manages content, media, users and payments. Cannot change roles or payment credentials.', true),
  ('editor',      'Creates and edits content and media. Cannot publish, delete or administer.', true),
  ('viewer',      'Read-only access to the admin panel.', true)
on conflict (name) do nothing;

-- super_admin: every permission (also implicit via has_permission, but kept
-- explicit so the roles UI shows the full grant).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array[
  'content.view','content.create','content.edit','content.delete','content.publish',
  'media.view','media.upload','media.delete',
  'payments.view','users.manage','settings.manage'
]) as perm
where r.name = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array['content.view','content.create','content.edit','media.view','media.upload']) as perm
where r.name = 'editor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, perm from public.roles r,
unnest(array['content.view','media.view','payments.view']) as perm
where r.name = 'viewer'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Case studies (the /work initiatives)
-- ---------------------------------------------------------------------------
insert into public.case_studies
  (slug, title, category, year, client, description, story, sort_order, published)
values
  (
    'blind-school-visit', 'Blind School Visit', 'Community', '2024',
    'Victoria Memorial Blind School',
    $t$A morning spent with the students of Victoria Memorial Blind School. We arrived with supplies, essentials and, most of all, our time, sitting with the children, listening to their stories and sharing an afternoon of music, games and companionship.$t$,
    $t$We wanted this to be more than a donation drop. The team pooled funds raised at our own events, put together everyday essentials the school had asked for and simply showed up to spend the day. What the students remembered was not the supplies but the company, and that is exactly the point of everything Yuvenza does.$t$,
    0, true
  ),
  (
    'girl-child-home', 'Girl Child Home', 'Care', '2023', null,
    $t$A Christmas with the girls of a local child home shelter. We turned a season of giving into a day of belonging, decorations, gifts, a shared meal and a room full of laughter for children who deserve every bit of it.$t$,
    $t$Christmas can feel very far away when you do not have a home to celebrate it in. So the club adopted a girl child home for the season, funded gifts and a festive spread from our event proceeds, and spent the day making sure every child felt seen. Small acts of kindness, we keep learning, make the biggest difference.$t$,
    1, true
  ),
  (
    'poverty-awareness', 'Poverty Awareness', 'Campaign', '2024', null,
    $t$A campus wide campaign confronting poverty eradication head on. Through talks, drives and student led fundraising, we turned awareness into action and channelled every rupee raised straight back to the people who need it.$t$,
    $t$Awareness only matters when it moves. We built the campaign around simple, honest conversations, then paired them with a fundraising push across campus. The money we gathered went directly to relief, and the volunteers we recruited stayed on for the drives that followed.$t$,
    2, true
  ),
  (
    'braille-awareness', 'Braille Awareness', 'Inclusion', '2024', null,
    $t$An accessibility and Braille awareness initiative built to make the world a little more reachable for everyone. Workshops, hands on demos and student volunteers came together to put inclusion on the campus agenda.$t$,
    $t$Most students had never touched a line of Braille. We changed that with hands on sessions, guest speakers and a campaign that reframed accessibility as everyone's responsibility. By the end, inclusion was not a topic we talked about once, it was a habit the campus carried forward.$t$,
    3, true
  ),
  (
    'green-drive', 'Green Campus Drive', 'Environment', '2024', null,
    $t$An environmental responsibility drive that started on campus and carried into the city. From clean ups to planting to waste awareness, we rallied students behind a greener, more conscious Chennai.$t$,
    $t$We treated the environment like any other cause worth fighting for, with people and momentum. Students signed up in numbers, we organised clean ups and green sessions, and the energy spilled well beyond the college gates. What we create, we contribute, and here what we created was a cleaner shared space.$t$,
    4, true
  ),
  (
    'youth-mentoring', 'Youth Mentoring', 'Empowerment', '2023', null,
    $t$A mentoring programme guiding fellow students through leadership, growth and personal development. Peer to peer, honest and hands on, built to turn potential into purpose.$t$,
    $t$The best mentors are often just a few steps ahead. We paired students with peers and seniors, ran sessions on leadership and personal growth, and created a space where asking for guidance felt normal. Empowering young people to lead is how this club renews itself every single year.$t$,
    5, true
  ),
  (
    'flagship-fest', 'Flagship Fest', 'Event', '2024', null,
    $t$Our flagship fest, the loudest expression of igniting passion, creativity and unity. A campus wide celebration whose every ticket, stall and performance fuels the causes we back all year round.$t$,
    $t$The fest is where the whole club comes alive. Months of planning turn into a few unforgettable days of performances, stalls and community, and behind the celebration is a purpose, every bit of what the fest raises flows straight into our social initiatives. Create, and contribute.$t$,
    6, true
  ),
  (
    'community-fundraiser', 'Community Fundraiser', 'Fundraising', '2023', null,
    $t$The engine behind it all. A student run fundraiser that gathers the resources for every visit, drive and campaign we take on, proof that a campus united can back real causes.$t$,
    $t$Nothing we do happens without funds, and we refuse to let that be a barrier. Students organised, promoted and ran the whole thing, and the community showed up. Every rupee raised was accounted for and directed to a cause, because what we create, we contribute.$t$,
    7, true
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Events (fest line-up; dates follow the Aug 2026 fest window)
-- ---------------------------------------------------------------------------
insert into public.events
  (slug, title, category, date_label, price, description, slots, badge, sort_order, published)
values
  ('hackathon', 'Hackathon 24', 'Technology', 'Aug 11-12', 299,
   $t$A 24-hour build sprint where teams ship something that matters. Mentors on tap, midnight chai included.$t$,
   '120 slots', 'Popular', 0, true),
  ('battle-of-bands', 'Battle of Bands', 'Culture', 'Aug 12', 199,
   $t$The loudest night of the fest. Bring your band, own the stage and play for the crowd.$t$,
   '16 bands', null, 1, true),
  ('design-sprint', 'Design Sprint', 'Workshop', 'Aug 11', 149,
   $t$A hands-on studio session on brand, type and interface, run by working designers.$t$,
   '60 seats', 'New', 2, true),
  ('frame-by-frame', 'Frame by Frame', 'Photography', 'Aug 11-12', 99,
   $t$A campus-wide photography contest on the theme of kindness. Shoot, submit, get exhibited.$t$,
   'Open entry', null, 3, true),
  ('arena', 'The Arena', 'eSports', 'Aug 12', 149,
   $t$Squad up for the fest gaming tournament. Brackets, big screens and bragging rights.$t$,
   '32 teams', null, 4, true),
  ('canvas', 'Canvas', 'Art & Craft', 'Aug 11', 79,
   $t$A live art and craft contest. Paints, paper and a few hours to make something beautiful.$t$,
   '80 seats', null, 5, true),
  ('the-great-debate', 'The Great Debate', 'Literary', 'Aug 12', 0,
   $t$Free and open floor. Take a side, make your case and change a few minds.$t$,
   '48 speakers', 'Free', 6, true),
  ('run-for-kindness', 'Run for Kindness', 'Fundraiser', 'Aug 13', 249,
   $t$A 5K charity run to close the fest. Every rupee raised goes straight to our community drives.$t$,
   '300 runners', null, 7, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Editable site sections
-- In text values, *x* renders the letter with the serif accent style (f-span)
-- and a literal newline renders as a line break.
-- ---------------------------------------------------------------------------
insert into public.site_content (key, data) values
  ('hero', $json$
    {
      "kickerLeft": "The Youth Club · Chennai Institute of Technology",
      "kickerRight": "Est. 2023",
      "tagline": "Igniting passion, creativity & unity.",
      "lead": "Yuvenza is the student-driven youth club of Chennai Institute of Technology. What we create, we contribute. Every event and campaign we run channels real support back to the community around us.",
      "primaryCta": { "label": "Register for the fest", "href": "/registration" },
      "secondaryCta": { "label": "Our Work", "href": "/work" },
      "tertiaryCta": { "label": "Join the club", "href": "https://www.instagram.com/yuvenza_cit/" },
      "facts": [
        "Aug 11-13 · CIT Campus, Chennai",
        "8 events · open to all colleges",
        "Every fee funds our social causes"
      ]
    }
  $json$::jsonb),
  ('statement', $json$
    {
      "heading": "The Youth\nP*o*wered Club",
      "body": "Since 2023, we've rallied students at Chennai Institute of Technology behind social causes, driving real impact and awareness through kindness. From blind-school visits to poverty, Braille and environmental drives."
    }
  $json$::jsonb),
  ('manifesto', $json$
    {
      "body": "We believe in the power of youth to create meaningful change. Every event and initiative we run channels funds and energy straight back into social causes that make a real difference. Small acts of kindness make the biggest difference.",
      "tagline": "Create & Contribute"
    }
  $json$::jsonb),
  ('pillars', $json$
    {
      "heading": "What we stand f*_o*r",
      "items": [
        { "num": "01", "title": "Passion", "body": "Everything starts with students who care. We turn raw energy into events, campaigns and drives that mean something." },
        { "num": "02", "title": "Creativity", "body": "We design our own way of giving back, blending fresh ideas with hands-on work so every initiative feels alive." },
        { "num": "03", "title": "Unity", "body": "Change is a team sport. We rally the campus together and move as one behind the causes that matter." }
      ]
    }
  $json$::jsonb),
  ('workSection', $json$
    {
      "kickerLeft": "Selected Work",
      "kickerRight": "Scroll to explore →",
      "heading": "Our W*_o*rk",
      "lead": "The events, campaigns and community initiatives we've shaped so far."
    }
  $json$::jsonb),
  ('eventsSection', $json$
    {
      "kickerLeft": "What's On",
      "heading": "Ev*_e*nts",
      "lead": "Pick the entries you want, register in one go, and every fee flows straight into the causes we back."
    }
  $json$::jsonb),
  ('quotes', $json$
    {
      "heading": "In their w*_o*rds",
      "items": [
        { "text": "Yuvenza turned our energy into purpose. Every event we run gives straight back to a cause that matters.", "name": "The Core Team", "role": "Yuvenza · CIT" },
        { "text": "Igniting passion, creativity and unity, that's the spirit we carry into every campaign and drive.", "name": "Our Volunteers", "role": "Community Outreach" },
        { "text": "What we create, we contribute. It isn't just a line, it's how every member shows up.", "name": "The Council", "role": "Chennai Institute of Technology" }
      ]
    }
  $json$::jsonb),
  ('stats', $json$
    {
      "items": [
        { "num": "2023", "label": "Founded at CIT" },
        { "num": "2.1K+", "label": "Strong community" },
        { "num": "9", "label": "Causes backed" },
        { "num": "100%", "label": "Student led" }
      ]
    }
  $json$::jsonb),
  ('join', $json$
    {
      "kicker": "Let's create change together",
      "heading": "J*_o*in the movement"
    }
  $json$::jsonb),
  ('fest', $json$
    {
      "name": "The Flagship Fest",
      "dateLabel": "Aug 2026",
      "venue": "CIT Campus, Chennai",
      "countdownTarget": "2026-08-11T00:00:00+05:30",
      "countdownDateLabel": "August 11"
    }
  $json$::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Site settings (public - never store secrets here)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('general', $json$
    {
      "siteName": "Yuvenza · The Youth Club",
      "siteDescription": "Yuvenza is the youth club of Chennai Institute of Technology, igniting passion, creativity and unity, and channelling every event and campaign we create into real social impact for the community.",
      "instagramUrl": "https://www.instagram.com/yuvenza_cit/",
      "linkedinUrl": "https://www.linkedin.com/company/yuvenza-cit/",
      "locationLabel": "Chennai, India"
    }
  $json$::jsonb),
  ('payments', $json$
    { "enabled": true }
  $json$::jsonb),
  ('registration', $json$
    { "allowedEmailDomain": "citchennai.net", "requireLogin": true }
  $json$::jsonb)
on conflict (key) do nothing;
