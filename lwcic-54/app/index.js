import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
const STRIPE_PK = 'pk_live_51SNKrVD1ej3IzU6u3oiV7Nm07JcwpCBm2RjiRSZX7f5MvJSZx51csDqI5RTRDfPDsxzFLz70Uh4JcUwea21cyqRL00hXwBsJ63';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, FlatList, Switch,
  AppState, Linking, Pressable, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';

const supabase = createClient(
  'https://ldjynhvueuyjjjlkkyff.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkanluaHZ1ZXV5ampqbGtreWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzM5OTEsImV4cCI6MjA4ODUwOTk5MX0.YK_eC9915lyytC7xYSyAkO-2V5GStEpbb3fRMHd6OpI'
);

const C = {
  navy: '#0d2d5e',
  teal: '#0097a7',
  tealL: '#00bcd4',
  gold: '#f5a623',
  green: '#2e7d32',
  bg: '#f0f4f9',
  white: '#ffffff',
  gray: '#888',
  lightGray: '#e0e0e0',
  dark: '#222',
};


// ─── Block 1b.4: Member create-or-link ────────────────────────────────────────
// Given the just-authenticated user + the name/phone they typed at sign-in,
// either link an existing members row (matched by phone_normalized) or
// create a new one with source='app_self_signup'.
//
// LovesFlock-portable: this function is the canonical recipe every church app
// will use. Returns { member, error }. Caller decides UI response to error.
//
// Key design decisions (May 14 lock):
//   - Phone is the unique identifier. Match by phone_normalized.
//   - On returning sign-in, IGNORE the name fields the user typed (existing
//     pastor-curated name is preserved).
//   - On match, ONLY update auth_user_id. Leave source alone so manual /
//     crm_added rows keep their provenance.
//   - On no-match, INSERT with source='app_self_signup'.
async function resolveMember({ authUser, firstName, lastName, phone }) {
  try {
    if (!authUser?.id) {
      return { member: null, error: new Error('Missing authUser') };
    }
    // Block 1b.9b: reviewer/staff path — no phone provided.
    // Look up an existing member by auth_user_id (must be pre-populated).
    // Strict: error if not found — never INSERT in this path.
    if (!phone) {
      const { data: byAuth, error: byAuthErr } = await supabase
        .from('members')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (byAuthErr) return { member: null, error: byAuthErr };
      if (byAuth) return { member: byAuth, error: null };
      return { member: null, error: new Error('No member row for this account. Contact pastor.') };
    }
    // Normalize: last 10 digits of E.164 phone (matches DB generated column)
    const phoneNorm = (phone || '').replace(/\D/g, '').slice(-10);
    if (phoneNorm.length !== 10) {
      return { member: null, error: new Error('Invalid phone for matching') };
    }

    // 1) Try to match an existing member by phone_normalized
    const { data: existing, error: selErr } = await supabase
      .from('members')
      .select('*')
      .eq('phone_normalized', phoneNorm)
      .maybeSingle();

    if (selErr) return { member: null, error: selErr };

    if (existing) {
      // Returning member: only stamp auth_user_id (preserve name + source)
      if (existing.auth_user_id === authUser.id) {
        return { member: existing, error: null };
      }
      const { data: updated, error: updErr } = await supabase
        .from('members')
        .update({ auth_user_id: authUser.id })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (updErr) return { member: existing, error: updErr };
      return { member: updated, error: null };
    }

    // 2) No match → INSERT a fresh row, source='app_self_signup'
    // Phone is stored in the display format the user typed (formatted at signin).
    const displayPhone = phone && phone.startsWith('+1')
      ? `(${phone.slice(2,5)}) ${phone.slice(5,8)}-${phone.slice(8)}`
      : phone;

    const { data: inserted, error: insErr } = await supabase
      .from('members')
      .insert({
        first_name: (firstName || '').trim() || 'Friend',
        last_name: (lastName || '').trim() || '',
        phone: displayPhone,
        auth_user_id: authUser.id,
        source: 'app_self_signup',
      })
      .select('*')
      .single();

    if (insErr) return { member: null, error: insErr };
    return { member: inserted, error: null };
  } catch (e) {
    return { member: null, error: e };
  }
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
// Block 1b.3 — Phone OTP sign-in (three-state state machine)
// State flow: enter-info -> enter-code -> (onLogin)
function LoginScreen({ onLogin }) {
  const [stage, setStage] = useState('enter-info'); // 'enter-info' | 'enter-code' | 'reviewer-login'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState(''); // '(412) 932-4646'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  // Block 1b.9b: hidden reviewer email/password path
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerPassword, setReviewerPassword] = useState('');

  // Format raw digits as (XXX) XXX-XXXX while typing
  const formatPhone = (raw) => {
    const d = (raw || '').replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  };

  // Normalize to E.164 (+1XXXXXXXXXX) for Supabase
  const e164Phone = () => {
    const d = phoneDisplay.replace(/\D/g, '');
    return d.length === 10 ? '+1' + d : null;
  };

  const handlePhoneChange = (raw) => setPhoneDisplay(formatPhone(raw));

  const handleSendCode = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'Please enter your first and last name.');
      return;
    }
    const phone = e164Phone();
    if (!phone) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit US phone number.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true },
      });
      if (error) {
        Alert.alert('Could not send code', error.message || 'Please try again.');
        return;
      }
      setStage('enter-code');
    } catch (e) {
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const phone = e164Phone();
    const token = (code || '').replace(/\D/g, '');
    if (token.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code we texted you.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) {
        Alert.alert('Could not verify', error.message || 'Code may be expired. Tap Resend.');
        return;
      }
      // Hand off to App: authUser + the name/phone the user just typed.
      // Block 1b.4 will use this to match-or-create the members row.
      onLogin({
        authUser: data?.user || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
      });
    } catch (e) {
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Block 1b.9b: hidden reviewer email/password sign-in (long-press logo to reveal)
  const handleReviewerSignIn = async () => {
    if (!reviewerEmail.trim() || !reviewerPassword) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: reviewerEmail.trim(),
        password: reviewerPassword,
      });
      if (error) {
        Alert.alert('Sign in failed', error.message || 'Please check credentials.');
        return;
      }
      onLogin({
        authUser: data?.user || null,
        firstName: '',
        lastName: '',
        phone: null,
      });
    } catch (e) {
      Alert.alert('Network error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCode('');
    setStage('enter-info');
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.navy }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/images/lwcic-cross-logo.png')} style={s.logoImage} resizeMode="contain" />
        <Pressable
          onLongPress={() => setStage('reviewer-login')}
          delayLongPress={5000}
        >
          <Text style={s.logoText}>Living Water</Text>
        </Pressable>
        <Text style={s.logoSub}>Church In Christ</Text>

        <View style={s.loginCard}>
          {stage === 'enter-info' && (
            <>
              <Text style={s.loginTitle}>Welcome</Text>
              <Text style={s.subInput}>We'll text you a 6-digit code to sign in.</Text>
              <TextInput
                style={s.input}
                placeholder="First Name"
                placeholderTextColor={C.gray}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <TextInput
                style={s.input}
                placeholder="Last Name"
                placeholderTextColor={C.gray}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <TextInput
                style={s.input}
                placeholder="(412) 555-0123"
                placeholderTextColor={C.gray}
                value={phoneDisplay}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={14}
              />
              <TouchableOpacity style={s.btn} onPress={handleSendCode} disabled={loading}>
                {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Send Code</Text>}
              </TouchableOpacity>

              {/* TEMP: demo fallback retained until Block 1b.6 lands. Remove then. */}
              <TouchableOpacity onPress={() => onLogin(null)}>
                <Text style={s.demoText}>Continue as Guest (Demo)</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'reviewer-login' && (
            <>
              <Text style={s.loginTitle}>Staff Sign-In</Text>
              <Text style={s.subInput}>For app reviewers and staff.</Text>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={C.gray}
                value={reviewerEmail}
                onChangeText={setReviewerEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={C.gray}
                value={reviewerPassword}
                onChangeText={setReviewerPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={s.btn}
                onPress={handleReviewerSignIn}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.btnText}>Sign In</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStage('enter-info')}
                style={{ marginTop: 16 }}
              >
                <Text style={{ color: C.teal, textAlign: 'center', fontSize: 14 }}>
                  Back to phone sign-in
                </Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'enter-code' && (
            <>
              <Text style={s.loginTitle}>Enter Code</Text>
              <Text style={s.subInput}>We texted a 6-digit code to {phoneDisplay}.</Text>
              <TextInput
                style={s.codeInput}
                placeholder="123456"
                placeholderTextColor={C.gray}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity style={s.btn} onPress={handleVerifyCode} disabled={loading}>
                {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Verify Code</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResend} style={s.linkBtn}>
                <Text style={s.demoText}>Resend code / change phone</Text>
              </TouchableOpacity>
            </>
        )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate }) {
  const [announcements, setAnnouncements] = useState([]);
  // Phase G: rotating verse of the day from pool (with hardcoded fallback)
  const [todayScripture, setTodayScripture] = useState({
    text: "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
    ref: "Psalms 23:1-4"
  });
  useEffect(() => {
    fetchTodayScripture('verse_of_the_day_pool').then(v => {
      if (v) setTodayScripture(v);
    });
  }, []);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [a, e] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date').limit(5),
      ]);
      if (a.data?.length) setAnnouncements(a.data);
      else setAnnouncements([
        { id: '1', title: 'Sunday Service', body: 'Join us this Sunday at 10:30 AM for worship and the Word.' },
        { id: '2', title: 'Bible Study', body: 'Wednesday Bible Study at 7 PM. All are welcome!' },
        { id: '3', title: 'Youth Night', body: 'Friday Youth Night — bring a friend!' },
      ]);
      if (e.data?.length) setEvents(e.data);
      else setEvents([
        { id: '1', title: 'Sunday Worship', date: 'Sunday 10:30 AM', location: 'Main Sanctuary' },
        { id: '2', title: 'Bible Study', date: 'Wednesday 7:00 PM', location: 'Fellowship Hall' },
        { id: '3', title: 'Prayer Meeting', date: 'Friday 6:00 PM', location: 'Chapel' },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Living Water CIC</Text>
        <Text style={s.headerSub}>McKees Rocks, PA</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
        {loading ? <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} /> : <>
          <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.gold }}>
            <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 8 }}>
              "{todayScripture.text}"
            </Text>
            <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>— {todayScripture.ref} KJV</Text>
          </View>
          <Text style={s.sectionTitle}>Announcements</Text>
          {announcements.map(a => (
            <View key={a.id} style={s.card}>
              <Text style={s.cardTitle}>{a.title}</Text>
              <Text style={s.cardBody}>{a.body || a.content}</Text>
            </View>
          ))}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Upcoming Events</Text>
          {events.map(e => (
            <View key={e.id} style={[s.card, s.row]}>
              <View style={s.dateBadge}>
                <Text style={s.dateBadgeText}>{(() => { const d = new Date((e.event_date || e.date || '') + 'T12:00:00'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getDate(); })()}</Text>
              </View>
              <View style={s.flex}>
                <Text style={s.cardTitle}>{e.title}</Text>
                <Text style={s.cardBody}>{e.location}</Text>
              </View>
            </View>
          ))}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Watch Screen ─────────────────────────────────────────────────────────────
function WatchScreen({ onNavigate }) {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('sermons').select('id, title, speaker, sermon_date, series, video_url').order('sermon_date', { ascending: false }).limit(10);
      if (data?.length) setSermons(data);
      else setSermons([
        { id: '1', title: 'Walking in Faith', speaker: 'Pastor Baldwin', sermon_date: '2026-03-09', series: 'Faith Series' },
        { id: '2', title: 'The Power of Prayer', speaker: 'Pastor Baldwin', sermon_date: '2026-03-02', series: 'Prayer Series' },
        { id: '3', title: 'Grace & Truth', speaker: 'Pastor Baldwin', sermon_date: '2026-02-23', series: 'Grace Series' },
        { id: '4', title: 'Living Water', speaker: 'Pastor Baldwin', sermon_date: '2026-02-16', series: 'John Series' },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Sermons</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={sermons}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => { if (item.video_url) { require('react-native').Linking.openURL(item.video_url); } else { require('react-native').Alert.alert('No Video', 'No video available yet.'); } }}>
              <View style={s.row}>
                <View style={[s.playBtn, { backgroundColor: playing === item.id ? C.teal : C.navy }]}>
                  <Text style={{ color: C.white, fontSize: 18 }}>{playing === item.id ? '⏸' : '▶'}</Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardBody}>{item.speaker} • {item.sermon_date || item.date}</Text>
                  {item.series && <Text style={[s.cardBody, { color: C.teal }]}>{item.series}</Text>}
                </View>
              </View>
              {playing === item.id && (
                <View style={s.playerBar}>
                  <View style={s.playerTrack}>
                    <View style={[s.playerProgress, { width: '35%' }]} />
                  </View>
                  <Text style={s.playerTime}>12:42 / 38:15</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Block 1b.4c: Tithing scripture rotation ──────────────────────────────────
// Rotates through 5 KJV verses on tithing/giving. Deterministic by day-of-year
// so a member sees a consistent verse within a session but variety over time.
// Luke 6:38 is reserved for the post-gift Thank You screen; not in this rotation.
// Phase G rotation helper: stable per calendar day, same verse for everyone
function dayOfYearRotation(poolSize) {
  if (!poolSize) return 0;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return dayOfYear % poolSize;
}

// Phase G: fetch today's verse from a scripture pool with kjv_bible JOIN
async function fetchTodayScripture(poolTableName) {
  try {
    const { count } = await supabase
      .from(poolTableName)
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    if (!count) return null;

    const idx = dayOfYearRotation(count);

    const { data: poolRow } = await supabase
      .from(poolTableName)
      .select('id, book, chapter, verse_start, verse_end')
      .eq('rotation_key', idx)
      .eq('active', true)
      .maybeSingle();
    if (!poolRow) return null;

    const verseEnd = poolRow.verse_end || poolRow.verse_start;
    const { data: verses } = await supabase
      .from('kjv_bible')
      .select('verse, text')
      .eq('book', poolRow.book)
      .eq('chapter', poolRow.chapter)
      .gte('verse', poolRow.verse_start)
      .lte('verse', verseEnd)
      .order('verse');
    if (!verses || verses.length === 0) return null;

    const text = verses.map(v => v.text).join(' ');
    const ref = poolRow.verse_end && poolRow.verse_end !== poolRow.verse_start
      ? `${poolRow.book} ${poolRow.chapter}:${poolRow.verse_start}-${poolRow.verse_end}`
      : `${poolRow.book} ${poolRow.chapter}:${poolRow.verse_start}`;
    return { text, ref, poolId: poolRow.id };
  } catch (e) {
    console.log('[scripture pool] fetch failed:', e.message);
    return null;
  }
}

const TITHING_VERSES = [
  {
    ref: 'Malachi 3:10',
    text: 'Bring ye all the tithes into the storehouse, that there may be meat in mine house, and prove me now herewith, saith the LORD of hosts, if I will not open you the windows of heaven, and pour you out a blessing.',
  },
  {
    ref: '2 Corinthians 9:7',
    text: 'Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.',
  },
  {
    ref: 'Proverbs 3:9',
    text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.',
  },
  {
    ref: '1 Chronicles 29:14',
    text: 'All things come of thee, and of thine own have we given thee.',
  },
  {
    ref: 'Matthew 6:21',
    text: 'For where your treasure is, there will your heart be also.',
  },
];

function giveScripture() {
  const now = new Date();
  // Day-of-year-ish: month*31 + day, modulo verse count
  const idx = ((now.getMonth() * 31) + now.getDate()) % TITHING_VERSES.length;
  return TITHING_VERSES[idx];
}

// ─── Give Screen ──────────────────────────────────────────────────────────────
function GiveScreen({ member, setMember, onNavigate }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState('Tithe');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  // Block 1b.4b: email capture state — pre-populated from member if available
  const [emailDraft, setEmailDraft] = useState(member?.email || '');
  const [emailSaving, setEmailSaving] = useState(false);
  // Phase G: rotating give scripture from pool (with hardcoded fallback)
  const [giveScriptureState, setGiveScriptureState] = useState(giveScripture());
  useEffect(() => {
    fetchTodayScripture('giving_scripture_pool').then(v => {
      if (v) setGiveScriptureState(v);
    });
  }, []);

  // Block 1b.4b: handler for the email step's Continue button
  const handleEmailContinue = async () => {
    const cleaned = (emailDraft || '').trim().toLowerCase();
    // Lightweight email validation: x@y.z minimum
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    if (!valid) {
      Alert.alert('Email Required', 'Please enter a valid email address so we can send your receipt.');
      return;
    }
    if (!member?.id) {
      Alert.alert('Sign-In Required', 'Please sign in again to continue.');
      return;
    }
    setEmailSaving(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .update({ email: cleaned })
        .eq('id', member.id)
        .select('*')
        .single();
      if (error) throw error;
      if (typeof setMember === 'function') setMember(data);
      setEmailSaving(false);
      setStep(2);
    } catch (e) {
      setEmailSaving(false);
      Alert.alert('Could Not Save', e.message || 'Please try again.');
    }
  };

  const funds = ['Tithe', 'Offering'];

  const handleGive = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid giving amount.');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('https://ldjynhvueuyjjjlkkyff.supabase.co/functions/v1/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), currency: 'usd', metadata: { fund } }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.clientSecret) throw new Error(data.error || 'Payment setup failed.');

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Living Water Church In Christ',
        paymentIntentClientSecret: data.clientSecret,
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: false },
        style: 'automatic',
        returnURL: 'lwcic://stripe-redirect',
      });
      if (initError) throw new Error(initError.message);

      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code === 'Canceled') { setLoading(false); return; }
        throw new Error(payError.message);
      }

      await supabase.from('giving').insert({
        member_id: member?.id,
        amount: parseFloat(amount),
        fund,
        note,
        date: new Date().toISOString().split('T')[0],
        method: 'app',
      });
      setLoading(false);
      setStep(3);
    } catch (e) {
      setLoading(false);
      Alert.alert('Payment Error', e.message || 'Unable to process. Please try again.');
    }
  };

  if (step === 3) return (
    <SafeAreaView style={[s.flex, s.center, { backgroundColor: C.bg }]}>
      <Text style={{ fontSize: 60 }}>🙏</Text>
      <Text style={[s.headerTitle, { color: C.green, marginTop: 16 }]}>Thank You!</Text>
      <Text style={[s.cardBody, { textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
        Your gift of ${parseFloat(amount || 0).toFixed(2)} to {fund} has been received. God bless you!
      </Text>
      <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, margin: 24 }}>
        <Text style={{ color: C.gold, fontWeight: '800', fontSize: 13, marginBottom: 6, textAlign: 'center' }}>Luke 6:38</Text>
        <Text style={{ color: C.white, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 }}>
          "Give, and it shall be given unto you; good measure, pressed down, and shaken together, and running over."
        </Text>
      </View>
      <TouchableOpacity style={[s.btn, { marginTop: 8, paddingHorizontal: 40 }]} onPress={() => { setStep(1); setAmount(''); setNote(''); }}>
        <Text style={s.btnText}>Give Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Give</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex} keyboardVerticalOffset={80}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {step === 1 && <>
            <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.gold }}>
              <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 8 }}>
                "{giveScriptureState.text}"
              </Text>
              <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>— {giveScriptureState.ref} KJV</Text>
            </View>
            <Text style={s.sectionTitle}>Select Fund</Text>
            <View style={s.fundRow}>
              {funds.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.fundCard, fund === f && s.fundCardSelected]}
                  onPress={() => setFund(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.fundCardText, fund === f && s.fundCardTextSelected]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Amount</Text>
            <View style={s.amountRow}>
              <Text style={s.dollarSign}>$</Text>
              <TextInput
                style={s.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={C.gray}
              />
            </View>
            <TextInput
              style={[s.input, { marginTop: 16 }]}
              placeholder="Note (optional)"
              placeholderTextColor={C.gray}
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity
              style={[s.btn, { marginTop: 24, opacity: amount ? 1 : 0.5 }]}
              onPress={() => {
                // Block 1b.4b: if member has no email yet, capture before review
                if (!member?.email) setStep('email');
                else setStep(2);
              }}
              disabled={!amount}
            >
              <Text style={s.btnText}>Review Gift</Text>
            </TouchableOpacity>
          </>}
          {step === 'email' && <>
            <Text style={s.sectionTitle}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={C.gray}
              value={emailDraft}
              onChangeText={setEmailDraft}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={s.emailHelp}>
              Your receipt will be sent to this email for your records.
            </Text>
            <TouchableOpacity
              style={[s.btn, { marginTop: 24, opacity: emailSaving ? 0.6 : 1 }]}
              onPress={handleEmailContinue}
              disabled={emailSaving}
            >
              <Text style={s.btnText}>{emailSaving ? 'Saving…' : 'Continue'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => setStep(1)}
              disabled={emailSaving}
            >
              <Text style={{ color: C.gray, fontSize: 14 }}>Back</Text>
            </TouchableOpacity>
          </>}
          {step === 2 && <>
            <Text style={s.sectionTitle}>Review Your Gift</Text>
            <View style={s.card}>
              <Row label="Fund" value={fund} />
              <Row label="Amount" value={"$" + parseFloat(amount).toFixed(2)} />
              {note ? <Row label="Note" value={note} /> : null}
            </View>
            <TouchableOpacity style={[s.btn, { marginTop: 24 }]} onPress={handleGive} disabled={loading}>
              {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Confirm & Give</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: C.lightGray, marginTop: 12 }]} onPress={() => setStep(1)}>
              <Text style={[s.btnText, { color: C.dark }]}>Back</Text>
            </TouchableOpacity>
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EventsScreen({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('events').select('*').order('event_date').limit(20);
      if (data?.length) setEvents(data);
      else setEvents([
        { id: '1', title: 'Sunday Worship Service', date: '2026-03-15', time: '10:30 AM', location: 'Main Sanctuary', description: 'Join us for praise, worship and the Word.' },
        { id: '2', title: 'Wednesday Bible Study', date: '2026-03-18', time: '7:00 PM', location: 'Fellowship Hall', description: 'Deep dive into Scripture together.' },
        { id: '3', title: 'Youth Night', date: '2026-03-20', time: '6:00 PM', location: 'Youth Center', description: 'Fun, faith and fellowship for youth.' },
        { id: '4', title: 'Prayer & Fasting', date: '2026-03-25', time: '6:00 AM', location: 'Chapel', description: 'Corporate prayer and fasting.' },
        { id: '5', title: 'Community Outreach', date: '2026-03-28', time: '10:00 AM', location: 'McKees Rocks', description: 'Serving our community with love.' },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const regular = hour % 12 || 12;
    return `${regular}:${m} ${ampm}`;
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Events</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={events}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const rawDate = item.event_date || item.date || ''; const d = rawDate ? new Date(rawDate.includes('T') ? rawDate : rawDate + 'T12:00:00') : new Date();
            return (
              <View style={[s.card, s.row]}>
                <View style={s.dateBadge}>
                  <Text style={s.dateBadgeMonth}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}</Text>
                  <Text style={s.dateBadgeDay}>{d.getDate()}</Text>
                </View>
                <View style={s.flex}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  {(item.start_time || item.time) && <Text style={[s.cardBody, { color: C.teal }]}>{formatTime(item.start_time) || item.time}</Text>}
                  {item.location && <Text style={s.cardBody}>📍 {item.location}</Text>}
                  {item.description && <Text style={[s.cardBody, { marginTop: 4 }]}>{item.description}</Text>}
                  {item.recurring && <Text style={[s.cardBody, { color: C.gold, fontWeight: '700' }]}>🔁 Weekly</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lightGray }]}>
      <Text style={[s.cardBody, { fontWeight: '600' }]}>{label}</Text>
      <Text style={s.cardBody}>{value}</Text>
    </View>
  );
}

function NavRow({ label, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}>
        <Text style={[s.cardBody, { fontWeight: '600' }]}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {value ? <Text style={[s.cardBody, { color: C.gray, marginRight: 8 }]}>{value}</Text> : null}
          <Text style={{ fontSize: 20, color: C.gray }}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ----- Profile Screen -----------------------------------------------
function ProfileScreen({ onLogout, user, member, memberLoading, onNavigate }) {
  // Block 1b.4: read profile from the resolved member row (prop), not from
  // a separate email-based lookup. Falls back gracefully while resolving.
  const profile = member;

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={[s.header, { paddingBottom: 24 }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(profile?.first_name || user?.firstName || 'G')[0].toUpperCase()}</Text>
        </View>
        {memberLoading && !profile ? (
          <Text style={s.headerTitle}>Loading…</Text>
        ) : (
        <Text style={s.headerTitle}>{profile ? profile.first_name + ' ' + profile.last_name : (user?.firstName || 'Welcome')}</Text>
        )}
        <Text style={s.headerSub}>{profile?.role || 'Member'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.card}>
          <Row label="Email" value={profile?.email || user?.email} />
          <Row label="Phone" value={profile?.phone || '—'} />
          <Row label="Status" value={profile?.status || 'Member'} />
          <Row label="Member Since" value={profile?.join_date ? new Date(profile.join_date + 'T12:00').getFullYear().toString() : '—'} />
        </View>
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Settings</Text>
        <View style={s.card}>
          <NavRow label="Notification Preferences" onPress={() => onNavigate && onNavigate('notifications')} />
        </View>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#c62828', marginTop: 24 }]} onPress={onLogout}>
          <Text style={s.btnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


// ---- Notifications Screen (Block 1b.5d - informational, iOS-managed) ----
function NotificationsScreen({ onNavigate, member }) {
  const [osGranted, setOsGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (mounted) setOsGranted(status === 'granted');
      } catch (e) {
        console.log('[1b.5d] permission check error:', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
        <View style={{ padding: 20, paddingTop: 50 }}>
          <ActivityIndicator color={C.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#000' }}>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={{ paddingRight: 12 }}>
          <Text style={{ color: '#fff', fontSize: 24 }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginRight: 36 }}>
          Notifications
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.card}>
          <Text style={[s.cardBody, { fontWeight: '600', fontSize: 16, marginBottom: 8 }]}>Prayer Alerts</Text>
          <Text style={[s.cardBody, { color: C.gray, marginBottom: 12 }]}>
            When Pastor Lisa sounds the alarm to pray, you'll receive a notification on your phone.
          </Text>
          <Text style={[s.cardBody, { color: C.gray, marginBottom: 16 }]}>
            {osGranted
              ? 'To turn off notifications, open iPhone Settings, then Notifications, then LWCIC.'
              : 'Notifications are currently off. Open iPhone Settings, then Notifications, then LWCIC to turn them on.'}
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#e5e5ea' }]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={[s.btnText, { color: '#000' }]}>Open iPhone Settings</Text>
          </TouchableOpacity>
          <Text style={[s.cardBody, { color: C.gray, fontSize: 13, marginTop: 16, fontStyle: 'italic', textAlign: 'center' }]}>
            "Pray without ceasing." -- 1 Thessalonians 5:17 (KJV)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'watch', label: 'Watch', icon: '▶️' },
  { key: 'give', label: 'Give', icon: '❤️' },
  { key: 'bible', label: 'Bible', icon: '📖' },
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'prayer', label: 'Prayer', icon: '🙏' },
];

const ROMANS_ROAD = [
  { step:1, title:"All Have Sinned", reference:"Romans 3:23", text:"For all have sinned, and come short of the glory of God.", reflection:"We all fall short of God's perfect standard. Sin separates us from God.", emoji:"😔", color:"#c62828" },
  { step:2, title:"The Wages of Sin", reference:"Romans 6:23", text:"For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", reflection:"Sin has a price — death. But God offers a free gift: eternal life through Jesus.", emoji:"⚖️", color:"#6a1b9a" },
  { step:3, title:"God's Love For Us", reference:"Romans 5:8", text:"But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", reflection:"God loved us at our worst and sent Jesus to die for us.", emoji:"❤️", color:"#c62828" },
  { step:4, title:"Confess & Believe", reference:"Romans 10:9", text:"That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.", reflection:"Salvation requires confessing Jesus as Lord and believing in the resurrection.", emoji:"🙌", color:"#1565c0" },
  { step:5, title:"Call Upon His Name", reference:"Romans 10:13", text:"For whosoever shall call upon the name of the Lord shall be saved.", reflection:"This promise is for everyone. Anyone who calls on Jesus will be saved.", emoji:"📢", color:"#2e7d32" },
  { step:6, title:"Faith Comes By Hearing", reference:"Romans 10:17", text:"So then faith cometh by hearing, and hearing by the word of God.", reflection:"Your faith grows as you spend time in God's Word.", emoji:"👂", color:"#e65100" },
  { step:7, title:"No Condemnation", reference:"Romans 8:1", text:"There is therefore now no condemnation to them which are in Christ Jesus.", reflection:"Once you accept Christ, you are free from condemnation forever.", emoji:"🕊️", color:"#00695c" },
  { step:8, title:"Nothing Can Separate Us", reference:"Romans 8:38-39", text:"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", reflection:"Nothing in all creation can separate you from God's love.", emoji:"🛡️", color:"#1a237e" },
  { step:9, title:"The Salvation Prayer", reference:"Romans 10:9-10", text:"Lord Jesus, I confess that I am a sinner. I believe that You died for my sins and rose from the dead. I invite You into my heart as my Lord and Savior. Amen.", reflection:"If you prayed this prayer and meant it — welcome to the family of God!", emoji:"🙏", color:"#880E4F", isSalvationPrayer:true },
];



const LORDS_PRAYER = [
  { step:1,  phrase:"Our Father", element:"Relationship",
    prayer:"Lord, I thank You for salvation.",
    prompt:"Father God, I thank You for ______.  Jesus, I thank You for ______.",
    scripture:"Through Jesus I have received the Spirit of adoption, and by Him I cry, ‘Abba, Father.’",
    ref:"Romans 8:15" },
  { step:2,  phrase:"which art in Heaven", element:"Recognition",
    prayer:"I thank You, Father God and Lord Jesus — You never sleep nor slumber, and from Heaven You are always working on my behalf.",
    prompt:"I lift these troubles up to You now — ______ — work them out for my good.",
    scripture:"Behold, He that keepeth Israel shall neither slumber nor sleep.",
    ref:"Psalm 121:4" },
  { step:3,  phrase:"Hallowed be thy name", element:"Adoration",
    prayer:"Lord, before I ask You for anything, I stop and adore You — holy, holy, holy is Your name.",
    prompt:"Today I worship You by the name I most need to know You as: my ______ (Provider, Healer, Peace, Shepherd).",
    scripture:"O Lord my Lord, how excellent is Your name in all the earth.",
    ref:"Psalm 8:1" },
  { step:4,  phrase:"Thy Kingdom Come", element:"Anticipation",
    prayer:"Come, Holy Spirit, come — fill me with Your Spirit, Lord, and let Your Kingdom come in me.",
    prompt:"Father, the place I am longing to see Your Kingdom break in — my home, my church, this city — is ______.",
    scripture:"The Kingdom of God is righteousness, and peace, and joy in the Holy Ghost.",
    ref:"Romans 14:17" },
  { step:5,  phrase:"Thy will be done", element:"Consecration",
    prayer:"Lord, not my will but Yours be done — I lay myself on Your altar today.",
    prompt:"Father, the area where I most need to surrender my own will to Yours is ______.",
    scripture:"I present myself a living sacrifice, holy and acceptable unto God.",
    ref:"Romans 12:1" },
  { step:6,  phrase:"in earth", element:"Universality",
    prayer:"Lord, let Your will be done not only in me, but across the whole earth.",
    prompt:"Father, the nation, the leader, or the people I am carrying before You today is ______.",
    scripture:"The earth shall be filled with the knowledge of the glory of the Lord.",
    ref:"Habakkuk 2:14" },
  { step:7,  phrase:"as it is in Heaven", element:"Conformity",
    prayer:"Lord, let my life on earth mirror the perfect obedience of Heaven.",
    prompt:"Father, the place where my walk does not yet match Your will — change me here: ______.",
    scripture:"I am being conformed to the image of His Son.",
    ref:"Romans 8:29" },
  { step:8,  phrase:"Give us", element:"Supplication",
    prayer:"Lord, You invite me to ask — so now I make my requests known to You.",
    prompt:"Father, You said ask, seek, knock; so today I am asking You for ______.",
    scripture:"In every thing by prayer and supplication I let my requests be made known unto God.",
    ref:"Philippians 4:6" },
  { step:9,  phrase:"this day", element:"Definiteness",
    prayer:"Lord, I am not borrowing tomorrow's worry — I bring You today's need.",
    prompt:"Father, the one thing I most need from You for this day is ______.",
    scripture:"His mercies are new every morning; great is His faithfulness.",
    ref:"Lamentations 3:22-23" },
  { step:10, phrase:"our daily bread", element:"Necessity",
    prayer:"Lord, I depend on You for every necessity of my life — body and soul.",
    prompt:"Father, the need I am trusting You to provide is ______.",
    scripture:"My God shall supply all my need according to His riches in glory by Christ Jesus.",
    ref:"Philippians 4:19" },
  { step:11, phrase:"And forgive us", element:"Penitence",
    prayer:"Lord, I come with a humble and repentant heart; cleanse me.",
    prompt:"Father, the sin I confess and turn from right now is ______.",
    scripture:"If I confess my sins, He is faithful and just to forgive me, and to cleanse me from all unrighteousness.",
    ref:"1 John 1:9" },
  { step:12, phrase:"our debts", element:"Obligation",
    prayer:"Lord, I acknowledge the debt of sin I could never pay — and I thank You that Jesus paid it in full.",
    prompt:"Father, the weight or the guilt I am laying at Your cross today is ______.",
    scripture:"He blotted out the handwriting that was against me, nailing it to His cross.",
    ref:"Colossians 2:14" },
  { step:13, phrase:"as we forgive", element:"Forgiveness",
    prayer:"Lord, as You have forgiven me, I choose to forgive.",
    prompt:"Father, the person I release and forgive today is ______.",
    scripture:"If I forgive others their trespasses, my heavenly Father will also forgive me.",
    ref:"Matthew 6:14" },
  { step:14, phrase:"our debtors", element:"Love and Mercy",
    prayer:"Lord, I extend the same mercy I have freely received from You.",
    prompt:"Father, the one who has hurt me that I now bless and pray for is ______.",
    scripture:"Be merciful, as your Father also is merciful.",
    ref:"Luke 6:36" },
  { step:15, phrase:"And lead us not", element:"Guidance",
    prayer:"Lord, I surrender my steps to You — lead me.",
    prompt:"Father, the decision or the path where I most need Your guidance is ______.",
    scripture:"He leadeth me in the paths of righteousness for His name's sake.",
    ref:"Psalm 23:3" },
  { step:16, phrase:"into temptation", element:"Protection",
    prayer:"Lord, guard me from the snares of the enemy and keep my heart.",
    prompt:"Father, the temptation I need Your strength to overcome is ______.",
    scripture:"God will with the temptation also make a way to escape.",
    ref:"1 Corinthians 10:13" },
  { step:17, phrase:"but deliver us", element:"Salvation",
    prayer:"Lord, You are my Deliverer; I trust You to rescue me.",
    prompt:"Father, the trouble I need You to deliver me out of is ______.",
    scripture:"Whom the Son sets free is free indeed.",
    ref:"John 8:36" },
  { step:18, phrase:"from evil", element:"Righteousness",
    prayer:"Lord, I choose righteousness and turn from every form of evil.",
    prompt:"Father, the influence or the habit I am asking You to free me from is ______.",
    scripture:"In Christ I am made the righteousness of God.",
    ref:"2 Corinthians 5:21" },
  { step:19, phrase:"For thine is the kingdom", element:"Faith",
    prayer:"Lord, I declare in faith — the Kingdom is Yours, and I trust You with it all.",
    prompt:"Father, the situation I am choosing to trust You with by faith is ______.",
    scripture:"Thine is the kingdom, O Lord, and Thou art exalted as head above all.",
    ref:"1 Chronicles 29:11" },
  { step:20, phrase:"and the power", element:"Humility",
    prayer:"Lord, I humble myself — all power belongs to You, not to me.",
    prompt:"Father, the weakness where I need Your power made perfect is ______.",
    scripture:"His strength is made perfect in weakness.",
    ref:"2 Corinthians 12:9" },
  { step:21, phrase:"and the glory", element:"Reverence",
    prayer:"Lord, I give You all the glory, and I take none for myself.",
    prompt:"Father, the answered prayer or the blessing I now give You glory for is ______.",
    scripture:"Not unto me, O Lord, but unto Thy name give glory.",
    ref:"Psalm 115:1" },
  { step:22, phrase:"for ever", element:"Timelessness",
    prayer:"Lord, I rest in You — the God who has no beginning and no end.",
    prompt:"Father, the worry about the future I am placing into Your everlasting hands is ______.",
    scripture:"From everlasting to everlasting, Thou art God.",
    ref:"Psalm 90:2" },
  { step:23, phrase:"Amen", element:"Affirmation",
    prayer:"Lord, I seal this prayer in faith — so be it.",
    prompt:"Father, the one thing I am believing You have heard and will answer is ______.",
    scripture:"All the promises of God in Him are Yea, and in Him Amen.",
    ref:"2 Corinthians 1:20" },
];

function BibleScreen({ user, member, onNavigate }) {
  const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
  const [openSection, setOpenSection] = React.useState(null);
  const [romansStep, setRomansStep] = React.useState(0);
  const [romansComplete, setRomansComplete] = React.useState(false);
  const [salvationSaved, setSalvationSaved] = React.useState(false);
  const [devotional, setDevotional] = React.useState(null);
  const [todayReading, setTodayReading] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [readingTab, setReadingTab] = React.useState('ot');
  const [started, setStarted] = React.useState(false);
  const [currentDay, setCurrentDay] = React.useState(1);
  const [progressId, setProgressId] = React.useState(null);
  const [marking, setMarking] = React.useState(false);

  const SURL = 'https://ldjynhvueuyjjjlkkyff.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkanluaHZ1ZXV5ampqbGtreWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzM5OTEsImV4cCI6MjA4ODUwOTk5MX0.YK_eC9915lyytC7xYSyAkO-2V5GStEpbb3fRMHd6OpI';
  const SH = { apikey: SKEY, Authorization: 'Bearer ' + SKEY };

  React.useEffect(() => { checkProgress(); }, []);

  const checkProgress = async () => {
    setLoading(true);
    try {
      const userId = user?.authUser?.id;
      const res = await fetch(SURL + '/rest/v1/reading_progress?user_id=eq.' + encodeURIComponent(userId) + '&limit=1', { headers: SH });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const day = data[0].current_day || 1;
        setCurrentDay(day);
        setProgressId(data[0].id);
        setStarted(true);
        await loadReading(day);
      } else {
        setStarted(false);
      }
    } catch(e) { setStarted(false); }
    setLoading(false);
  };

  const loadReading = async (day) => {
    // Phase 2: fetches from daily_reading_plan (schedule) + kjv_bible (verse text)
    // Produces same todayReading shape the legacy render expects.
    try {
      // 1. Fetch the day's plan row
      const planRes = await fetch(SURL + '/rest/v1/daily_reading_plan?day_number=eq.' + day + '&select=passages&limit=1', { headers: SH });
      const planData = await planRes.json();
      if (!Array.isArray(planData) || planData.length === 0) {
        setTodayReading(null);
        return;
      }
      const passages = planData[0].passages || [];

      // 2. Fetch verses for each passage in parallel
      const fetchPassage = async (p) => {
        const bookEnc = encodeURIComponent(p.book);
        // Build chapter/verse filter
        let filter;
        if (p.start_v == null && p.end_v == null) {
          // Whole-chapter range: chapter in [start_ch..end_ch]
          if (p.start_ch === p.end_ch) {
            filter = '&chapter=eq.' + p.start_ch;
          } else {
            filter = '&chapter=gte.' + p.start_ch + '&chapter=lte.' + p.end_ch;
          }
        } else if (p.start_ch === p.end_ch) {
          // Same-chapter verse range
          filter = '&chapter=eq.' + p.start_ch + '&verse=gte.' + p.start_v + '&verse=lte.' + p.end_v;
        } else {
          // Cross-chapter verse range -- need OR clause via PostgREST
          // (chapter=start_ch AND verse>=start_v) OR (chapter between) OR (chapter=end_ch AND verse<=end_v)
          // PostgREST: or=(and(chapter.eq.X,verse.gte.Y),and(chapter.gt.X,chapter.lt.Z),and(chapter.eq.Z,verse.lte.W))
          const orParts = [];
          orParts.push('and(chapter.eq.' + p.start_ch + ',verse.gte.' + p.start_v + ')');
          if (p.end_ch - p.start_ch > 1) {
            orParts.push('and(chapter.gt.' + p.start_ch + ',chapter.lt.' + p.end_ch + ')');
          }
          orParts.push('and(chapter.eq.' + p.end_ch + ',verse.lte.' + p.end_v + ')');
          filter = '&or=(' + orParts.join(',') + ')';
        }
        const url = SURL + '/rest/v1/kjv_bible?book=eq.' + bookEnc + filter + '&select=chapter,verse,text&order=chapter.asc,verse.asc';
        const r = await fetch(url, { headers: SH });
        const verses = await r.json();
        // Build text with verse numbers inline
        let textBlocks = '';
        if (Array.isArray(verses) && verses.length > 0) {
          // Multi-chapter passage? Insert "Chapter N" markers when chapter
          // changes (skip labeling the FIRST chapter -- reference shows it).
          const multiChapter = p.start_ch !== p.end_ch;
          let lastChapter = null;
          const parts = [];
          for (const v of verses) {
            if (multiChapter && lastChapter !== null && v.chapter !== lastChapter) {
              parts.push('\n\nChapter ' + v.chapter + '\n');
            }
            parts.push(v.verse + ' ' + (v.text || ''));
            lastChapter = v.chapter;
          }
          textBlocks = parts.join(' ');
        }
        return { label: p.label, book: p.book, text: textBlocks };
      };

      const results = await Promise.all(passages.map(fetchPassage));

      // 3. Sort results into OT/NT/Ps/Pr buckets by book name
      const NT_BOOKS = ['Matthew','Mark','Luke','John','Acts','Romans',
        '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
        'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
        'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
        '1 John','2 John','3 John','Jude','Revelation'];

      const reading = {
        ot_reference: '', ot_text: '',
        nt_reference: '', nt_text: '',
        psalm_reference: '', psalm_text: '',
        proverbs_reference: '', proverbs_text: ''
      };

      for (const r of results) {
        if (r.book === 'Psalms') {
          reading.psalm_reference = r.label;
          reading.psalm_text = r.text;
        } else if (r.book === 'Proverbs') {
          reading.proverbs_reference = r.label;
          reading.proverbs_text = r.text;
        } else if (NT_BOOKS.indexOf(r.book) !== -1) {
          reading.nt_reference = r.label;
          reading.nt_text = r.text;
        } else {
          // OT book -- concatenate if multiple (e.g. Day 25: Genesis + Exodus)
          if (reading.ot_reference) {
            reading.ot_reference += ' + ' + r.label;
            reading.ot_text += ' ' + r.text;
          } else {
            reading.ot_reference = r.label;
            reading.ot_text = r.text;
          }
        }
      }

      setTodayReading(reading);
    } catch(e) {
      setTodayReading(null);
    }
  };

  const startPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(SURL + '/rest/v1/reading_progress', {
        method: 'POST',
        headers: { ...SH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: user?.authUser?.id, current_day: 1, started_at: new Date().toISOString().split('T')[0], last_read_at: new Date().toISOString().split('T')[0] })
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setProgressId(data[0].id);
    } catch(e) {}
    setCurrentDay(1);
    setStarted(true);
    await loadReading(1);
    setLoading(false);
  };

  const markComplete = async () => {
    if (marking) return;
    setMarking(true);
    const next = currentDay >= 365 ? 1 : currentDay + 1;
    try {
      const userId = user?.authUser?.id;
      await fetch(SURL + '/rest/v1/reading_progress?user_id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH',
        headers: { ...SH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_day: next, last_read_at: new Date().toISOString().split('T')[0] })
      });
    } catch(e) {}
    setCurrentDay(next);
    setTodayReading(null);
    setReadingTab('ot');
    await loadReading(next);
    setMarking(false);
  };

  const loadDevotional = async () => {
    try {
      const v = await fetchTodayScripture('verse_of_the_day_pool');
      const pid = v && v.poolId;
      if (!pid) { setDevotional(null); return; }
      const res = await fetch(SURL + '/rest/v1/votd_devotionals?votd_pool_id=eq.' + pid + '&active=eq.true&limit=1', { headers: SH });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setDevotional(data[0]);
      else setDevotional(null);
    } catch(e) { setDevotional(null); }
  };

  const ROMANS_ROAD = [
    { step:1, title:"All Have Sinned", reference:"Romans 3:23", text:"For all have sinned, and come short of the glory of God.", reflection:"We all fall short of God's perfect standard.", emoji:"😔", color:"#c62828" },
    { step:2, title:"The Wages of Sin", reference:"Romans 6:23", text:"For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", reflection:"Sin has a price — death. But God offers a free gift: eternal life.", emoji:"⚖️", color:"#6a1b9a" },
    { step:3, title:"God's Love For Us", reference:"Romans 5:8", text:"But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", reflection:"God loved us at our worst and sent Jesus to die for us.", emoji:"❤️", color:"#c62828" },
    { step:4, title:"Confess & Believe", reference:"Romans 10:9", text:"That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.", reflection:"Salvation requires confessing Jesus as Lord.", emoji:"🙌", color:"#1565c0" },
    { step:5, title:"Call Upon His Name", reference:"Romans 10:13", text:"For whosoever shall call upon the name of the Lord shall be saved.", reflection:"Anyone who calls on Jesus will be saved.", emoji:"📢", color:"#2e7d32" },
    { step:6, title:"Faith Comes By Hearing", reference:"Romans 10:17", text:"So then faith cometh by hearing, and hearing by the word of God.", reflection:"Your faith grows as you spend time in God's Word.", emoji:"👂", color:"#e65100" },
    { step:7, title:"No Condemnation", reference:"Romans 8:1", text:"There is therefore now no condemnation to them which are in Christ Jesus.", reflection:"Once you accept Christ, you are free from condemnation forever.", emoji:"🕊️", color:"#00695c" },
    { step:8, title:"Nothing Can Separate Us", reference:"Romans 8:38-39", text:"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", reflection:"Nothing can separate you from God's love.", emoji:"🛡️", color:"#1a237e" },
    { step:9, title:"The Salvation Prayer", reference:"Romans 10:9-10", text:"Lord Jesus, I confess that I am a sinner. I believe that You died for my sins and rose from the dead. I invite You into my heart as my Lord and Savior. Amen.", reflection:"If you prayed this prayer and meant it — welcome to the family of God!", emoji:"🙏", color:"#880E4F", isSalvationPrayer:true },
  ];
  const cur = ROMANS_ROAD[romansStep];

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Bible</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>

        {/* BIBLE READING PLAN */}
        <TouchableOpacity style={[s.card, { marginBottom: 8 }]} onPress={() => setOpenSection(openSection === 'reading' ? null : 'reading')}>
          <View style={s.row}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>📖</Text>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Bible Reading Plan</Text>
              <Text style={s.cardBody}>365-Day KJV · OT · NT · Psalms · Proverbs</Text>
            </View>
            <Text style={{ color: C.teal, fontWeight: '700' }}>{openSection === 'reading' ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {openSection === 'reading' && (
          <View style={[s.card, { marginBottom: 12 }]}>
            {loading ? <ActivityIndicator color={C.teal} style={{ marginVertical: 20 }} /> :
            !started ? (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 8 }}>365-Day Bible Reading Plan</Text>
                <Text style={{ fontSize: 13, color: C.gray, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>Read through the Old Testament, New Testament, Psalms, and Proverbs in one year. Your progress is saved automatically.</Text>
                <TouchableOpacity onPress={startPlan} style={{ backgroundColor: C.teal, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: C.white, fontSize: 15, fontWeight: '800' }}>Start Reading Plan 📖</Text>
                </TouchableOpacity>
              </View>
            ) : todayReading ? (
              <View>
                <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: C.teal, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Day {currentDay} of 365</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>Daily Scripture Reading</Text>
                  <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <View style={{ height: 4, width: ((currentDay/365)*100)+'%', backgroundColor: C.teal, borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{Math.round((currentDay/365)*100)}% complete</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {[['ot','OT'],['nt','NT'],['psalm','Psalm'],['proverb','Prov']].map(([key,label]) => (
                    <TouchableOpacity key={key} onPress={() => setReadingTab(key)} style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: readingTab===key ? C.teal : C.lightGray, backgroundColor: readingTab===key ? C.teal+'20' : C.white, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: readingTab===key ? C.teal : C.gray }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {readingTab==='ot' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Old Testament</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.ot_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22 }}>"{todayReading.ot_text}"</Text></View>}
                {readingTab==='nt' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>New Testament</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.nt_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22 }}>"{todayReading.nt_text}"</Text></View>}
                {readingTab==='psalm' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Psalm</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.psalm_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22 }}>"{todayReading.psalm_text}"</Text></View>}
                {readingTab==='proverb' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Proverbs</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.proverbs_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22 }}>"{todayReading.proverbs_text}"</Text></View>}
                <TouchableOpacity onPress={markComplete} disabled={marking} style={{ backgroundColor: marking ? C.gray : C.navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: C.white, fontSize: 14, fontWeight: '800' }}>{marking ? 'Saving...' : currentDay >= 365 ? '🎉 Complete! Start Over' : '✅ Mark Complete — Day ' + (currentDay+1) + ' Next'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 13, color: C.gray, textAlign: 'center' }}>Could not load reading. Please check your connection.</Text>
              </View>
            )}
          </View>
        )}

        {/* WALK THROUGH ROMANS */}
        <TouchableOpacity style={[s.card, { marginBottom: 8 }]} onPress={() => setOpenSection(openSection === 'romans' ? null : 'romans')}>
          <View style={s.row}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>✝️</Text>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Walk Through Romans</Text>
              <Text style={s.cardBody}>The Roman Road to Salvation</Text>
            </View>
            <Text style={{ color: C.teal, fontWeight: '700' }}>{openSection === 'romans' ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {openSection === 'romans' && !romansComplete && (
          <View style={[s.card, { marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.navy }}>Step {romansStep+1} of {ROMANS_ROAD.length}</Text>
              <Text style={{ fontSize: 12, color: C.teal, fontWeight: '700' }}>{Math.round(((romansStep+1)/ROMANS_ROAD.length)*100)}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.lightGray, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ height: 6, width: (((romansStep+1)/ROMANS_ROAD.length)*100)+'%', backgroundColor: C.teal, borderRadius: 3 }} />
            </View>
            <View style={{ backgroundColor: cur.color, borderRadius: 16, padding: 18, marginBottom: 12 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{cur.emoji}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{cur.reference}</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 10 }}>{cur.title}</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 22 }}>"{cur.text}"</Text>
            </View>
            <View style={{ backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: '#555', lineHeight: 22 }}>{cur.reflection}</Text>
            </View>
            {cur.isSalvationPrayer && !salvationSaved && (
              <TouchableOpacity onPress={async () => { try { await fetch('https://ldjynhvueuyjjjlkkyff.supabase.co/rest/v1/salvations_decisions', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SKEY, Authorization: 'Bearer ' + SKEY }, body: JSON.stringify({ member_id: '1', decision_date: new Date().toISOString().split('T')[0], notes: 'Accepted Christ through Walk Through Romans' }) }); } catch(e) {} setSalvationSaved(true); }} style={{ backgroundColor: '#880E4F', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>🙏 I Prayed This Prayer Today</Text>
              </TouchableOpacity>
            )}
            {cur.isSalvationPrayer && salvationSaved && (
              <View style={{ backgroundColor: '#e8f5e9', borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginBottom: 4 }}>🎉</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#2e7d32' }}>Welcome to God's Family!</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {romansStep > 0 && (
                <TouchableOpacity onPress={() => setRomansStep(s => s-1)} style={{ flex: 1, borderWidth: 1.5, borderColor: C.lightGray, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#555' }}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { if(romansStep < ROMANS_ROAD.length-1) setRomansStep(s => s+1); else setRomansComplete(true); }} style={{ flex: 2, backgroundColor: C.teal, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>{romansStep < ROMANS_ROAD.length-1 ? 'Next Step' : 'Complete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {openSection === 'romans' && romansComplete && (
          <View style={[s.card, { marginBottom: 12, alignItems: 'center', padding: 24 }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✝️</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.navy, marginBottom: 8, textAlign: 'center' }}>Romans Road Complete!</Text>
            <TouchableOpacity onPress={() => { setRomansStep(0); setRomansComplete(false); setSalvationSaved(false); }} style={{ borderWidth: 1.5, borderColor: C.lightGray, borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>Start Over</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WEEKLY DEVOTIONAL */}
        <TouchableOpacity style={[s.card, { marginBottom: 8 }]} onPress={() => { const next = openSection === 'devotional' ? null : 'devotional'; setOpenSection(next); if(next === 'devotional') loadDevotional(); }}>
          <View style={s.row}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🌅</Text>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Daily Devotional</Text>
              <Text style={s.cardBody}>Today's verse, opened</Text>
            </View>
            <Text style={{ color: C.teal, fontWeight: '700' }}>{openSection === 'devotional' ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {openSection === 'devotional' && (
          <View style={{ marginBottom: 12, borderWidth: 5, borderColor: C.navy, backgroundColor: C.white }}>
            {devotional ? (
              <View>
                <Text style={{ fontFamily: SERIF, fontWeight: '700', fontSize: 14, lineHeight: 21, textAlign: 'center', color: '#1a1a1a', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>This daily devotional is written to help the Living Water family begin each day grounded in Scripture, prayer, and trust in Jesus Christ.</Text>
                <View style={{ backgroundColor: C.navy, paddingVertical: 18, alignItems: 'center', marginHorizontal: 14, marginBottom: 16 }}>
                  <View style={{ backgroundColor: C.white, borderRadius: 40, padding: 9, marginBottom: 8 }}>
                    <Image source={require('../assets/images/lwcic-cross-logo.png')} style={{ width: 46, height: 46 }} resizeMode="contain" />
                  </View>
                  <Text style={{ fontFamily: SERIF, color: C.white, fontSize: 20, fontWeight: '700' }}>Daily Devotional</Text>
                  <Text style={{ fontFamily: SERIF, color: '#cdd8e6', fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Living Water Church In Christ</Text>
                </View>
                <Text style={{ fontFamily: SERIF, fontSize: 25, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', color: '#1a1a1a', lineHeight: 30, paddingHorizontal: 18, marginBottom: 16 }}>{devotional.title}</Text>
                {devotional.scripture_text ? (
                  <View style={{ backgroundColor: '#dcdcdc', borderWidth: 3, borderColor: C.navy, padding: 14, marginHorizontal: 18, marginBottom: 16 }}>
                    <Text style={{ fontFamily: SERIF, fontSize: 15, fontStyle: 'italic', lineHeight: 23, textAlign: 'center', color: '#1a1a1a' }}>{devotional.scripture_text}</Text>
                    <Text style={{ fontFamily: SERIF, fontSize: 13, fontWeight: '700', textAlign: 'center', color: C.navy, marginTop: 8 }}>{devotional.scripture_ref}</Text>
                  </View>
                ) : null}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ backgroundColor: '#9aa7b5', paddingVertical: 8, paddingHorizontal: 22, borderRadius: 22 }}>
                    <Text style={{ fontFamily: SERIF, fontSize: 13, fontWeight: '700', color: '#41505f' }}>Listen · coming soon</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 25, color: '#1a1a1a', paddingHorizontal: 18, marginBottom: 16 }}>{devotional.body}</Text>
                {devotional.reflection_questions ? (
                  <View style={{ backgroundColor: '#f1f0ea', padding: 14, marginHorizontal: 18, marginBottom: 16 }}>
                    <Text style={{ fontFamily: SERIF, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.navy, marginBottom: 8 }}>Bread for Thought</Text>
                    {String(devotional.reflection_questions).split('\n').filter(q => q.trim()).map((q, i) => (
                      <Text key={i} style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', lineHeight: 21, color: '#1a1a1a', marginBottom: 6 }}>{q.trim()}</Text>
                    ))}
                  </View>
                ) : null}
                {devotional.closing_prayer ? (
                  <View style={{ backgroundColor: C.navy, padding: 16, marginHorizontal: 14, marginBottom: 16 }}>
                    <Text style={{ fontFamily: SERIF, fontSize: 16, fontWeight: '700', textAlign: 'center', color: C.white, marginBottom: 8 }}>A Prayer</Text>
                    <Text style={{ fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', lineHeight: 22, textAlign: 'center', color: '#eef2f7' }}>{devotional.closing_prayer}</Text>
                  </View>
                ) : null}
                <Text style={{ fontFamily: SERIF, fontSize: 11, textAlign: 'center', color: '#7a7a7a', paddingBottom: 18 }}>Living Water Church In Christ · McKees Rocks</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Image source={require('../assets/images/lwcic-cross-logo.png')} style={{ width: 48, height: 48, marginBottom: 10 }} resizeMode="contain" />
                <Text style={{ fontFamily: SERIF, fontSize: 16, fontWeight: '700', color: C.navy, textAlign: 'center' }}>Today's devotional is being prepared</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 13, color: C.gray, marginTop: 6, textAlign: 'center' }}>Be blessed by the Verse of the Day above.</Text>
              </View>
            )}
          </View>
        )}

        {/* PRAYER REQUESTS */}
      </ScrollView>
    </SafeAreaView>
  );
}

function BottomNav({ active, onNav }) {
  const insets = useSafeAreaInsets();
  const navPadBottom = Platform.OS === 'ios' ? 20 : Math.max(insets.bottom, 8);
  return (
    <View style={[s.nav, { paddingBottom: navPadBottom }]}>
      {NAV.map(n => (
        <TouchableOpacity key={n.key} style={s.navItem} onPress={() => onNav(n.key)}>
          <Text style={s.navIcon}>{n.icon}</Text>
          <Text style={[s.navLabel, active === n.key && s.navLabelActive]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ───── Prayer Screen ──────────────────────────────────────────────────
// Block 1c.1 — Prayer tab scaffold
// Sections (top to bottom):
//   1. Prayer Scripture card (Philippians 4:6 — Phase G placeholder)
//   2. Submit a Prayer Request (moved from Bible in 1c.4)
//   3. The Lord's Prayer (Matthew 6:9-13 KJV)
//   4. Sound the Alarm archive (placeholder until Phase D)
//   5. My Prayer Requests (moved from Profile in 1c.6)
function PrayerScreen({ user, member, onNavigate, expandAlarmNonce }) {
  // Block 1c.4 — Submit Prayer Request state (moved from Bible)
  const [pRequest, setPRequest] = React.useState('');
  const [pAnon, setPAnon] = React.useState(false);
  const [submitFormOpen, setSubmitFormOpen] = React.useState(false);
  // Block 1c.5 — The Lord's Prayer collapse state
  const [lordsPrayerOpen, setLordsPrayerOpen] = React.useState(false);
  const [lordsPrayerStep, setLordsPrayerStep] = React.useState(0);
  const [lordsPrayerComplete, setLordsPrayerComplete] = React.useState(false);
  const [lordsPrayerStarted, setLordsPrayerStarted] = React.useState(false);
  const lp = LORDS_PRAYER[lordsPrayerStep];
  // Block 1c.6 — My Prayer Requests history (moved from Profile)
  const [prayers, setPrayers] = React.useState([]);
  const [prayersLoading, setPrayersLoading] = React.useState(true);
  // Phase G: rotating prayer scripture from pool (with hardcoded fallback)
  const [prayerScripture, setPrayerScripture] = React.useState({
    text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
    ref: "Philippians 4:6"
  });
  React.useEffect(() => {
    fetchTodayScripture('prayer_scripture_pool').then(v => {
      if (v) setPrayerScripture(v);
    });
  }, []);

  // Block 1e.4 — Congregational Prayer collapsible state + fetch
  const [congPrayerOpen, setCongPrayerOpen] = React.useState(false);
  const [congPrayer, setCongPrayer] = React.useState(null);

  // Block 1g — Sound the Alarm: most recent active alert + per-user state
  const [alarmOpen, setAlarmOpen] = React.useState(false);
  const [alarm, setAlarm] = React.useState(null);
  const [alarmCount, setAlarmCount] = React.useState(0);
  const [alarmIPrayed, setAlarmIPrayed] = React.useState(false);
  const [alarmTapping, setAlarmTapping] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('congregational_prayers')
        .select('week_of, intro, body, closing')
        .eq('active', true)
        .order('week_of', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setCongPrayer(data);
    })();
  }, []);

  // Block 1e.4 — Date formatter: "2026-05-24" -> "Sunday, May 24, 2026"
  const formatSundayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `Sunday, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  React.useEffect(() => {
    const loadPrayers = async () => {
      if (member?.id) {
        const { data } = await supabase
          .from('prayer_requests')
          .select('*')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setPrayers(data || []);
      } else if (member?.email) {
        // Fallback for legacy rows: match by email if member_id link absent
        const { data } = await supabase
          .from('prayer_requests')
          .select('*')
          .eq('email', member.email)
          .order('created_at', { ascending: false })
          .limit(10);
        setPrayers(data || []);
      }
      setPrayersLoading(false);
    };
    loadPrayers();
  }, [member?.id]);

  // Block 1h — Deep-link: when App bumps expandAlarmNonce, auto-expand Sound the Alarm.
  // Nonce-keyed (not boolean) so a later alarm tap re-opens even after the user collapsed it.
  React.useEffect(() => {
    if (expandAlarmNonce && expandAlarmNonce > 0) setAlarmOpen(true);
  }, [expandAlarmNonce]);

  // Block 1g — Sound the Alarm fetch: most recent active alert + count + has-prayed
  React.useEffect(() => {
    (async () => {
      // 1. Most recent active alert
      const { data: alerts, error: aErr } = await supabase
        .from('prayer_alerts')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (aErr) { console.log('alarm fetch error:', aErr); return; }
      if (!alerts || alerts.length === 0) { setAlarm(null); return; }
      const a = alerts[0];
      setAlarm(a);
      setAlarmIPrayed(false); // reset for the newly loaded alert; step 3 re-sets true only if THIS member prayed for THIS alert

      // 2. Count total prayers for this alert
      const { count, error: cErr } = await supabase
        .from('prayer_alert_responses')
        .select('*', { count: 'exact', head: true })
        .eq('alert_id', a.id);
      if (!cErr) setAlarmCount(count || 0);

      // 3. Has THIS member already prayed?
      if (member?.id) {
        const { data: mine } = await supabase
          .from('prayer_alert_responses')
          .select('id')
          .eq('alert_id', a.id)
          .eq('member_id', member.id)
          .limit(1);
        if (mine && mine.length > 0) setAlarmIPrayed(true);
      }
    })();
  }, [member?.id, expandAlarmNonce]);

  // Block 1g — handler for 🙏 Praying tap
  const handlePrayingTap = async () => {
    if (!alarm || !member?.id || alarmIPrayed || alarmTapping) return;
    setAlarmTapping(true);
    const { error } = await supabase
      .from('prayer_alert_responses')
      .insert({ alert_id: alarm.id, member_id: member.id });
    if (!error) {
      setAlarmIPrayed(true);
      setAlarmCount(c => c + 1);
    } else if (error.code === '23505') {
      // UNIQUE violation — they already prayed (race or stale state). Treat as success.
      setAlarmIPrayed(true);
    } else {
      console.log('🙏 Praying insert error:', error);
    }
    setAlarmTapping(false);
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Prayer</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('profile')} style={s.headerSilhouette}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>

        {/* 1. Prayer Scripture — gold-bar treatment (Phase G placeholder) */}
        <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.gold }}>
          <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 8 }}>
            "{prayerScripture.text}"
          </Text>
          <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>— {prayerScripture.ref} KJV</Text>
        </View>

        {/* 2. Submit a Prayer Request — moved from Bible in Block 1c.4 */}
        <TouchableOpacity
          onPress={() => setSubmitFormOpen(!submitFormOpen)}
          style={[s.card, { marginBottom: submitFormOpen ? 8 : 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>🙏</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.navy }}>Submit a Prayer Request</Text>
          </View>
          <Text style={{ color: C.teal, fontWeight: '700', fontSize: 16 }}>{submitFormOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
            {submitFormOpen && (
              <View style={[s.card, { marginBottom: 12 }]}>
          <TextInput
            style={[s.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Share your prayer request..."
            placeholderTextColor={C.gray}
            multiline
            value={pRequest}
            onChangeText={setPRequest}
          />
          <TouchableOpacity style={s.btn} onPress={async () => {
            if (!pRequest.trim()) return;
            try {
              await supabase.from('prayer_requests').insert({
                member_id: member?.id,
                request: pRequest,
                status: 'pending',
                anonymous: pAnon,
              });
              setPRequest('');
              setPAnon(false);
              if (pAnon) {
                Alert.alert('🙏 Submitted anonymously', 'Pastor Lisa and Minister C.W. will be praying for you.');
              } else {
                Alert.alert('🙏 Submitted', 'Pastor Lisa and Minister C.W. will be praying for you!');
              }
            } catch(e) {
              Alert.alert('Error', 'Could not submit. Please try again.');
            }
          }}>
            <Text style={s.btnText}>Submit Prayer Request</Text>
          </TouchableOpacity>
          <View style={s.anonRow}>
            <Text style={s.anonLabel}>Submit anonymously</Text>
            <Switch
              value={pAnon}
              onValueChange={setPAnon}
              trackColor={{ false: '#ddd', true: C.teal }}
            />
          </View>
        </View>
        )}

      {/* 3. The Lord's Prayer — walkthrough v2 (intro + 23 steps) */}
      <TouchableOpacity
        style={[s.card, { marginBottom: lordsPrayerOpen ? 8 : 12 }]}
        onPress={() => setLordsPrayerOpen(!lordsPrayerOpen)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.cardTitle}>The Lord's Prayer</Text>
          <Text style={{ color: C.teal, fontWeight: '700', fontSize: 16 }}>{lordsPrayerOpen ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {lordsPrayerOpen && !lordsPrayerStarted && (
        <View style={{ backgroundColor: '#FAEEDA', borderWidth: 1, borderColor: '#E8D29A', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#3A2206', marginBottom: 10, textAlign: 'center' }}>A Pattern for Prayer</Text>
          <Text style={{ fontSize: 14, lineHeight: 22, fontStyle: 'italic', color: '#6A4A1C', textAlign: 'center', marginBottom: 16 }}>“After this manner therefore pray ye.” — Matthew 6:9. Jesus gave this prayer not to recite, but as a pattern to pray by. Walk through it phrase by phrase, and let each line open your own prayer.</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: '#E8D29A', paddingTop: 14, marginBottom: 18 }}>
            <Text style={{ fontSize: 15, lineHeight: 26, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#3F2A0E', textAlign: 'center' }}>Our Father which art in heaven,{'\n'}Hallowed be thy name.{'\n'}Thy kingdom come.{'\n'}Thy will be done in earth,{'\n'}as it is in heaven.{'\n'}Give us this day our daily bread.{'\n'}And forgive us our debts,{'\n'}as we forgive our debtors.{'\n'}And lead us not into temptation,{'\n'}but deliver us from evil:{'\n'}For thine is the kingdom,{'\n'}and the power, and the glory,{'\n'}for ever. Amen.</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A5A12', textAlign: 'center', marginTop: 10 }}>— Matthew 6:9-13 KJV</Text>
          </View>
          <TouchableOpacity onPress={() => { setLordsPrayerStep(0); setLordsPrayerComplete(false); setLordsPrayerStarted(true); }} style={{ backgroundColor: '#8A5A12', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#FBF1DA', fontSize: 14, fontWeight: '700' }}>Begin praying</Text>
          </TouchableOpacity>
        </View>
      )}

      {lordsPrayerOpen && lordsPrayerStarted && !lordsPrayerComplete && (
        <View style={{ backgroundColor: '#FAEEDA', borderWidth: 1, borderColor: '#E8D29A', borderRadius: 16, padding: 18, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ backgroundColor: '#F3DCA6', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 11 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#5A3406' }}>{lp.element}</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#9A6A1E' }}>{lordsPrayerStep + 1} / {LORDS_PRAYER.length}</Text>
          </View>
          <View style={{ height: 5, backgroundColor: '#ECDFC0', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ height: 5, width: (((lordsPrayerStep + 1) / LORDS_PRAYER.length) * 100) + '%', backgroundColor: '#8A5A12', borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#3A2206', marginBottom: 16 }}>“{lp.phrase}”</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A5A12', marginBottom: 4 }}>Pray this</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: '#3F2A0E', marginBottom: 16 }}>{lp.prayer}</Text>
          <View style={{ backgroundColor: '#FBF4E2', borderWidth: 1, borderColor: '#E3CB92', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A5A12', marginBottom: 4 }}>Make it personal</Text>
            <Text style={{ fontSize: 15, lineHeight: 24, color: '#3F2A0E' }}>{lp.prompt}</Text>
          </View>
          <View style={{ borderLeftWidth: 3, borderLeftColor: '#8A5A12', paddingLeft: 13, marginBottom: 18 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#6A4A1C', marginBottom: 5 }}>{lp.scripture}</Text>
            <Text style={{ fontSize: 13, color: '#8A5A12' }}>{lp.ref}</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => { if (lordsPrayerStep === 0) setLordsPrayerStarted(false); else setLordsPrayerStep(s => s - 1); }} style={{ flex: 1, borderWidth: 1.5, borderColor: '#DCC489', borderRadius: 12, padding: 14, alignItems: 'center', marginRight: 8 }}>
              <Text style={{ color: '#6A4310', fontSize: 14, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (lordsPrayerStep < LORDS_PRAYER.length - 1) setLordsPrayerStep(s => s + 1); else setLordsPrayerComplete(true); }} style={{ flex: 2, backgroundColor: '#8A5A12', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#FBF1DA', fontSize: 14, fontWeight: '700' }}>{lordsPrayerStep < LORDS_PRAYER.length - 1 ? 'Next' : 'Amen'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {lordsPrayerOpen && lordsPrayerComplete && (
        <View style={{ backgroundColor: '#FAEEDA', borderWidth: 1, borderColor: '#E8D29A', borderRadius: 16, padding: 22, marginBottom: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: '#633806', marginBottom: 8, textAlign: 'center' }}>Amen.</Text>
          <Text style={{ fontSize: 14, lineHeight: 22, fontStyle: 'italic', color: '#6A4A1C', textAlign: 'center', marginBottom: 16 }}>You have prayed through the pattern Jesus taught. Carry it with you today.</Text>
          <TouchableOpacity onPress={() => { setLordsPrayerStep(0); setLordsPrayerComplete(false); setLordsPrayerStarted(true); }} style={{ borderWidth: 1.5, borderColor: '#DCC489', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' }}>
            <Text style={{ color: '#6A4310', fontSize: 14, fontWeight: '700' }}>Pray it again</Text>
          </TouchableOpacity>
        </View>
      )}

          {/* 4. Congregational Prayer — Block 1e.4, collapsible (tap to expand) */}
          {congPrayer && (
            <>
              <TouchableOpacity
                style={[s.card, { marginBottom: congPrayerOpen ? 8 : 12 }]}
                onPress={() => setCongPrayerOpen(!congPrayerOpen)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>Congregational Prayers</Text>
                    <Text style={{ color: C.gold, fontSize: 13, fontWeight: '600', marginTop: 2 }}>for {formatSundayDate(congPrayer.week_of)}</Text>
                  </View>
                  <Text style={{ color: C.teal, fontWeight: '700', fontSize: 16 }}>{congPrayerOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {congPrayerOpen && (
                <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.gold }}>
                  {congPrayer.intro && (
                    <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 12 }}>{congPrayer.intro}</Text>
                  )}
                  {congPrayer.body.split('\n').map((line, i) => (
                    <Text key={i} style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 8 }}>• {line}</Text>
                  ))}
                  {congPrayer.closing && (
                    <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginTop: 12, fontStyle: 'italic' }}>{congPrayer.closing}</Text>
                  )}
                </View>
              )}
            </>
          )}

        {/* 5. Sound the Alarm — Block 1g, most recent active alert + 🙏 Praying counter */}
        {alarm && (
          <TouchableOpacity
            style={[s.card, { marginBottom: alarmOpen ? 8 : 12 }]}
            onPress={() => setAlarmOpen(!alarmOpen)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>🚨 Sound the Alarm</Text>
                {alarm.for_person ? (
                  <Text style={{ color: C.gold, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                    Pray for {alarm.for_person}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: C.teal, fontWeight: '700', fontSize: 16 }}>
                {alarmOpen ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {alarmOpen && alarm && (
          <View style={{ backgroundColor: C.navy, borderLeftWidth: 4, borderLeftColor: C.gold, padding: 14, marginBottom: 12, borderRadius: 8 }}>
            {alarm.title ? (
              <Text style={{ color: C.gold, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>
                {alarm.title}
              </Text>
            ) : null}
            <Text style={{ color: C.white, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
              {alarm.body}
            </Text>
            <TouchableOpacity
              onPress={handlePrayingTap}
              disabled={alarmIPrayed || alarmTapping}
              activeOpacity={0.8}
              style={{
                backgroundColor: alarmIPrayed ? C.green : C.gold,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
                opacity: alarmTapping ? 0.6 : 1,
              }}
            >
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>
                {alarmIPrayed ? `🙏 ${alarmCount} Praying` : '🙏 Praying'}
              </Text>
            </TouchableOpacity>
            {alarm.sent_by ? (
              <Text style={{ color: C.gold, fontSize: 12, fontStyle: 'italic', marginTop: 10, textAlign: 'center' }}>
                Sent by {alarm.sent_by}
              </Text>
            ) : null}
          </View>
        )}

        {/* 6. My Prayer Requests — moved from Profile in Block 1c.6 */}
        <Text style={[s.sectionTitle, { marginTop: 8, marginBottom: 8 }]}>My Prayer Requests</Text>
        {prayersLoading ? <ActivityIndicator color={C.teal} /> : prayers.length === 0 ? (
          <View style={[s.card, { marginBottom: 12 }]}>
            <Text style={[s.cardBody, { textAlign: 'center' }]}>No prayer requests yet.</Text>
          </View>
        ) : prayers.map(p => (
          <View key={p.id} style={[s.card, { marginBottom: 8 }]}>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <Text style={s.cardTitle}>{new Date(p.created_at).toLocaleDateString()}</Text>
              <View style={[s.badge, { backgroundColor: p.status === 'responded' ? C.green : C.gold }]}>
                <Text style={s.badgeText}>{p.status}</Text>
              </View>
            </View>
            <Text style={s.cardBody}>{p.request}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────────────────
// Block 1b.5a — One-time pastoral welcome after first OTP verify.
// Gated by members.welcomed_at. Tapping Continue stamps the timestamp,
// so returning members never see this screen again.
function WelcomeScreen({ firstName, onContinue, busy }) {
  const name = (firstName || '').trim() || 'Friend';
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.navy }]}>
      <ScrollView contentContainerStyle={s.welcomeScroll}>
        <View style={s.welcomeCard}>
          <Text style={s.welcomeHeading}>
            Welcome to Living Water Church, {name}! 🙏
          </Text>

          <Text style={s.welcomeBody}>
            We're so glad you're here. This app is your connection to
            our church family — sermons, prayer requests, giving, and
            the Word of God, built right in.
          </Text>

          <Text style={s.welcomeBody}>
            Come and eat — the Word is good. This app is designed to
            meet you right where you are, and we look forward to seeing
            you grow closer to Jesus.
          </Text>

          <View style={s.welcomeVerseBox}>
            <Text style={s.welcomeVerse}>
              "And Jesus said unto them, I am the bread of life: he
              that cometh to me shall never hunger; and he that
              believeth on me shall never thirst."
            </Text>
            <Text style={s.welcomeVerseRef}>— John 6:35 (KJV)</Text>
          </View>

          <Text style={s.welcomeSignoff}>Praying for you,</Text>
          <Text style={s.welcomeSignature}>
            — Pastor Lisa & Minister C.W. Baldwin
          </Text>

          <TouchableOpacity
            style={[s.welcomeBtn, busy && { opacity: 0.6 }]}
            onPress={onContinue}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.welcomeBtnText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Push Permission Pre-Prompt Screen ──────────────────────────────────────
// Block 1b.5b — One-time opt-in for prayer alarm notifications.
// Gated by members.push_permission_asked_at. Either button stamps the
// timestamp; "yes" will trigger native iOS permission (in 1b.5c), "not
// right now" routes to Home where Profile can re-enable later (in 1b.5d).
function PushPromptScreen({ onRespond, busy }) {
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.navy }]}>
      <ScrollView contentContainerStyle={s.pushScroll}>
        <View style={s.pushCard}>
          <Text style={s.pushHeading}>🔔 Get Prayer Alerts</Text>

          <Text style={s.pushBody}>
            We only send notifications for one reason: when Pastor Lisa
            sounds the alarm to pray. Stay connected to the body.
          </Text>

          <View style={s.pushVerseBox}>
            <Text style={s.pushVerse}>
              "For where two or three are gathered together in my name,
              there am I in the midst of them."
            </Text>
            <Text style={s.pushVerseRef}>— Matthew 18:20 (KJV)</Text>
          </View>

          <TouchableOpacity
            style={[s.pushBtnYes, busy && { opacity: 0.6 }]}
            onPress={() => onRespond(true)}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.pushBtnYesText}>Yes, notify me</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.pushBtnNo}
            onPress={() => onRespond(false)}
            disabled={busy}
          >
            <Text style={s.pushBtnNoText}>Not right now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState('home');
  const [user, setUser] = useState(null);
  // Block 1b.4: member row resolved after OTP verify
  const [member, setMember] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  // Block 1b.5a / 1b.5b — Busy flags for the two pre-Home gate screens.
  // CRITICAL: these useState calls MUST live above any conditional return
  // in App() — React's Rules of Hooks. Do not move them below the gates.
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // Block 1h — nonce that signals PrayerScreen to auto-expand Sound the Alarm after a deep-link tap.
  // A counter (not a boolean) so a later alarm tap re-opens the card even if it was collapsed.
  const [alarmExpandNonce, setAlarmExpandNonce] = useState(0);

  // Block 1h — Deep-link routing: tapping a prayer-alarm notification routes to the Prayer tab
  // and expands Sound the Alarm. Handles warm taps (listener fires while the app is running) and
  // cold-start taps (app launched by the tap). Lives above the conditional returns per Rules of Hooks.
  // Real APNs delivery is verified on a physical device; on Simulator use `xcrun simctl push`.
  useEffect(() => {
    let mounted = true;
    const routeFromResponse = (response) => {
      const req = response?.notification?.request;
      const cdata = req?.content?.data;
      // Expo push populates content.data; raw APNs (simctl / direct) carries custom keys in trigger.payload
      const data = (cdata && Object.keys(cdata).length > 0) ? cdata : (req?.trigger?.payload || {});
      if (data.type === 'alarm') {
        setScreen('prayer');
        setAlarmExpandNonce((n) => n + 1);
      }
    };
    Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (mounted && response) routeFromResponse(response); })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(routeFromResponse);
    return () => { mounted = false; sub.remove(); };
  }, []);

  // Block 1b.4: called after LoginScreen verifies OTP successfully
  const handleLoginSuccess = async (loginData) => {
    setUser(loginData);
    setLoggedIn(true);
    setMemberLoading(true);
    const { member: m, error } = await resolveMember(loginData);
    setMemberLoading(false);
    if (error) {
      console.log('[1b.4] resolveMember error:', error?.message || error);
      Alert.alert(
        "We're having trouble loading your profile",
        "Please check your connection and try again.",
        [
          {
            text: 'Retry',
            onPress: async () => {
              setMemberLoading(true);
              const r2 = await resolveMember(loginData);
              setMemberLoading(false);
              if (r2.member) setMember(r2.member);
              else console.log('[1b.4] retry also failed:', r2.error?.message || r2.error);
            },
          },
          { text: 'Continue', style: 'cancel' },
        ]
      );
      return;
    }
    setMember(m);
  };

  const handleLogout = () => {
    supabase.auth.signOut().catch(() => {});
    setLoggedIn(false);
    setUser(null);
    setMember(null);
    setMemberLoading(false);
    setScreen('home');
  };

  // Block 1b.5a — Welcome gate: one-time pastoral message for new members
  const handleWelcomeContinue = async () => {
    if (!member?.id) return;
    setWelcomeBusy(true);
    const nowIso = new Date().toISOString();
    const { error: wErr } = await supabase
      .from('members')
      .update({ welcomed_at: nowIso })
      .eq('id', member.id);
    if (wErr) {
      console.log('[1b.5a] welcomed_at update error:', wErr?.message || wErr);
      // Soft-fail: stamp locally so user moves on; we'll retry on next launch.
    }
    setMember({ ...member, welcomed_at: nowIso });
    setWelcomeBusy(false);
  };

  if (!loggedIn) return <LoginScreen onLogin={handleLoginSuccess} />;

  // Block 1b.5a — Show Welcome until welcomed_at is set on the member row.
  // Wait for member to resolve before deciding (avoids flash of welcome).
  if (member && !member.welcomed_at) {
    return (
      <WelcomeScreen
        firstName={member.first_name || user?.firstName}
        onContinue={handleWelcomeContinue}
        busy={welcomeBusy}
      />
    );
  }

  // Block 1b.5b — Push permission pre-prompt: ask once after Welcome.
  // Handler only; hook lives at top of App() above all conditional returns.
  const handlePushPromptResponse = async (yes) => {
    if (!member) return;
    setPushBusy(true);
    const nowIso = new Date().toISOString();

    // Always stamp push_permission_asked_at (both yes and no answer counts)
    const { error: pErr } = await supabase
      .from('members')
      .update({ push_permission_asked_at: nowIso })
      .eq('id', member.id);
    if (pErr) {
      console.log('[1b.5b] push_permission_asked_at update error:', pErr?.message || pErr);
      // Soft-fail: stamp locally so user moves on; we'll retry on next launch.
    }
    setMember({ ...member, push_permission_asked_at: nowIso });

    // Block 1b.5c — If user said yes, request OS permission and capture push token.
    if (yes === true) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          // Tone 3 — warmly pastoral fallback when iOS denies
          Alert.alert(
            "Notifications are off.",
            "Your iPhone has notifications turned off for LWCIC. To receive prayer alerts, open iPhone Settings → Notifications → LWCIC and turn them on.",
            [{ text: 'OK' }]
          );
          console.log('[1b.5c] push permission denied at OS level');
        } else {
          // Permission granted — capture the Expo push token
          const tokenResult = await Notifications.getExpoPushTokenAsync();
          const expoToken = tokenResult?.data;
          if (expoToken) {
            console.log('[1b.5c] captured Expo push token:', expoToken.substring(0, 30) + '...');
            const { error: tokErr } = await supabase
              .from('push_tokens')
              .insert({
                member_id: member.id,
                token: expoToken,
                platform: Platform.OS,
                device_id: null,
              });
            if (tokErr) {
              // Unique violation on token (duplicate from reinstall) is harmless — ignore code 23505
              if (tokErr.code !== '23505') {
                console.log('[1b.5c] push_tokens insert error:', tokErr?.message || tokErr);
              } else {
                console.log('[1b.5c] token already registered (duplicate insert), ok');
              }
            } else {
              console.log('[1b.5c] push_tokens insert ok');
            }
          } else {
            console.log('[1b.5c] getExpoPushTokenAsync returned no data');
          }
        }
    } catch (e) {
      // Simulator typically throws here — log gracefully, don't block user.
      console.log('[1b.5c] push token capture failed (expected on Simulator):', e?.message || e);
    }
    } else {
      // Block 1b.5c — "Not right now" pastoral message
      Alert.alert(
        "That's okay.",
        "To open this door, you can turn on prayer alerts anytime — just open your iPhone Settings → Notifications → LWCIC.\n\n\"Casting all your care upon him; for he careth for you.\"\n— 1 Peter 5:7 (KJV)",
        [{ text: 'OK' }]
      );
      console.log('[1b.5c] not-right-now pastoral message shown');
    }

    setPushBusy(false);
    };

  // Block 1b.5b — Show push pre-prompt after Welcome, before Home.
  if (member && member.welcomed_at && !member.push_permission_asked_at) {
    return (
      <PushPromptScreen
        onRespond={handlePushPromptResponse}
        busy={pushBusy}
      />
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen onNavigate={setScreen} />;
      case 'watch': return <WatchScreen onNavigate={setScreen} />;
      case 'give': return <GiveScreen member={member} setMember={setMember} onNavigate={setScreen} />;
      case 'bible': return <BibleScreen user={user} member={member} onNavigate={setScreen} />;
      case 'prayer': return <PrayerScreen user={user} member={member} onNavigate={setScreen} expandAlarmNonce={alarmExpandNonce} />;
      case 'events': return <EventsScreen onNavigate={setScreen} />;
      case 'notifications': return <NotificationsScreen onNavigate={setScreen} member={member} />;
      case 'profile': return <ProfileScreen onLogout={handleLogout} user={user} member={member} memberLoading={memberLoading} onNavigate={setScreen} />;
      default: return <HomeScreen onNavigate={setScreen} />;
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.org.livingwatercic.app">
      <View style={s.flex}>
        <View style={s.flex}>{renderScreen()}</View>
        <BottomNav active={screen} onNav={setScreen} />
      </View>
    </StripeProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Login
  logoImage: { width: 160, height: 160, marginBottom: 16, alignSelf: 'center' },
  logoText: { fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: 1 },
  logoSub: { fontSize: 16, color: C.tealL, marginBottom: 40 },
  loginCard: { backgroundColor: C.white, borderRadius: 16, padding: 24, width: '85%' },
  loginTitle: { fontSize: 22, fontWeight: '700', color: C.navy, marginBottom: 20, textAlign: 'center' },
  demoText: { color: C.gray, textAlign: 'center', marginTop: 16, fontSize: 13 },
  subInput: { color: C.gray, fontSize: 13, textAlign: 'center', marginTop: -8, marginBottom: 14, lineHeight: 18 },
  codeInput: { borderWidth: 1, borderColor: C.lightGray, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 24, color: C.dark, textAlign: 'center', letterSpacing: 8, fontWeight: '700' },
  linkBtn: { marginTop: 8, paddingVertical: 6, alignItems: 'center' },

  // Header
  header: { backgroundColor: C.navy, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' },
  headerSilhouette: { position: 'absolute', right: 16, top: 16, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 13, color: C.tealL, marginTop: 2 },

  // Cards
  card: { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.navy },
  cardBody: { fontSize: 14, color: C.gray, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  // Inputs
  input: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, fontSize: 15, color: C.dark, marginBottom: 12 },
  btn: { backgroundColor: C.teal, borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText: { color: C.white, fontWeight: '700', fontSize: 16 },

  // Give
    // Block 1b.4c: Give screen — side-by-side fund cards + scripture box
  fundRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  fundCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fundCardSelected: {
    borderColor: '#0097a7',
    backgroundColor: '#e0f7fa',
  },
  fundCardText: { fontSize: 16, fontWeight: '700', color: '#222' },
  fundCardTextSelected: { color: '#0097a7' },
  scriptureBox: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 12,
    paddingVertical: 14,
    paddingRight: 14,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  scriptureBar: {
    width: 3,
    backgroundColor: '#f5a623',
    marginRight: 14,
    marginLeft: 12,
    borderRadius: 2,
  },
  scriptureText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#444',
    lineHeight: 19,
  },
  emailHelp: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  scriptureRef: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
    fontWeight: '600',
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 16, marginBottom: 12 },
  dollarSign: { fontSize: 28, fontWeight: '700', color: C.navy, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: C.navy, paddingVertical: 12 },
  quickBtn: { backgroundColor: C.navy, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 },
  quickBtnText: { color: C.white, fontWeight: '700', fontSize: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.teal },
  radioSelected: { backgroundColor: C.teal },
  freqBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: C.lightGray, backgroundColor: C.white, marginBottom: 8 },
  freqBtnActive: { borderColor: C.teal, backgroundColor: C.teal },
  freqBtnText: { color: C.gray, fontWeight: '600', fontSize: 14 },
  freqBtnTextActive: { color: C.white },

  // Prayer
  tabs: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.lightGray },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.teal },
  tabText: { fontSize: 15, color: C.gray, fontWeight: '600' },
  tabTextActive: { color: C.teal },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.teal },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: C.white, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  // Events / Date
  dateBadge: { backgroundColor: C.navy, borderRadius: 10, width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dateBadgeText: { color: C.white, fontWeight: '700', fontSize: 13 },
  dateBadgeMonth: { color: C.tealL, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dateBadgeDay: { color: C.white, fontSize: 20, fontWeight: '900' },

  // Watch
  playBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  playerBar: { marginTop: 12 },
  playerTrack: { height: 4, backgroundColor: C.lightGray, borderRadius: 2 },
  playerProgress: { height: 4, backgroundColor: C.teal, borderRadius: 2 },
  playerTime: { fontSize: 12, color: C.gray, marginTop: 4, textAlign: 'right' },

  // Profile
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.white },

  // Nav
  nav: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.lightGray, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: C.gray, marginTop: 2 },
  navLabelActive: { color: C.teal, fontWeight: '700' },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  anonLabel: {
    fontSize: 15,
    color: '#444',
  },

  // Welcome screen (Block 1b.5a)
  welcomeScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  welcomeCard: { backgroundColor: C.white, borderRadius: 16, padding: 24 },
  welcomeHeading: { fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 16, lineHeight: 30 },
  welcomeBody: { fontSize: 16, color: C.dark, lineHeight: 24, marginBottom: 14 },
  welcomeVerseBox: { backgroundColor: '#f7faff', borderLeftWidth: 4, borderLeftColor: C.gold, padding: 14, borderRadius: 6, marginVertical: 10 },
  welcomeVerse: { fontSize: 15, fontStyle: 'italic', color: C.dark, lineHeight: 22 },
  welcomeVerseRef: { fontSize: 13, color: C.navy, fontWeight: '700', marginTop: 8, textAlign: 'right' },
  welcomeSignoff: { fontSize: 15, color: C.dark, marginTop: 14 },
  welcomeSignature: { fontSize: 15, color: C.navy, fontWeight: '700', marginBottom: 22 },
  welcomeBtn: { backgroundColor: C.teal, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  welcomeBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  // Push pre-prompt (Block 1b.5b)
  pushScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  pushCard: { backgroundColor: C.white, borderRadius: 16, padding: 24 },
  pushHeading: { fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 16, textAlign: 'center' },
  pushBody: { fontSize: 16, color: C.dark, lineHeight: 24, marginBottom: 18, textAlign: 'center' },
  pushVerseBox: { backgroundColor: '#f7faff', borderLeftWidth: 4, borderLeftColor: C.gold, padding: 14, borderRadius: 6, marginBottom: 24 },
  pushVerse: { fontSize: 15, fontStyle: 'italic', color: C.dark, lineHeight: 22 },
  pushVerseRef: { fontSize: 13, color: C.navy, fontWeight: '700', marginTop: 8, textAlign: 'right' },
  pushBtnYes: { backgroundColor: C.teal, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  pushBtnYesText: { color: C.white, fontSize: 16, fontWeight: '700' },
  pushBtnNo: { paddingVertical: 10, alignItems: 'center' },
  pushBtnNoText: { color: C.gray, fontSize: 14, fontWeight: '500' },
});
