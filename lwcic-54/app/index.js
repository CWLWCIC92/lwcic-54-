import React, { useState, useEffect } from 'react';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, FlatList
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ldjynhvueuyjjjlkkyff.supabase.co',
  'sb_publishable_7nKlUMfqli0LKc0884ENuQ_4zlcFb7Q'
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

const MEMBER = {
  id: '1',
  firstName: 'William',
  lastName: 'Baldwin',
  role: 'Pastor',
  email: 'cw@livingwatercic.org',
  phone: '(412) 555-0101',
  joinDate: '2010-01-01',
  status: 'Member',
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) onLogin(null); // fall back to demo
      else { const { data: { user } } = await supabase.auth.getUser(); onLogin(user); }
    } catch {
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.navy }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.flex, s.center]}>
        <Text style={s.logoText}>Living Water</Text>
        <Text style={s.logoSub}>Church In Christ</Text>
        <View style={s.loginCard}>
          <Text style={s.loginTitle}>Welcome Back</Text>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={C.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={C.gray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onLogin(null)}>
            <Text style={s.demoText}>Continue as Guest (Demo)</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen() {
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [a, e] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(5),
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
      </View>
      <ScrollView style={s.flex} contentContainerStyle={{ padding: 16 }}>
        {loading ? <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} /> : <>
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
                <Text style={s.dateBadgeText}>{(e.date || '').substring(5, 10)}</Text>
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
function WatchScreen() {
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

// ─── Give Screen ──────────────────────────────────────────────────────────────
function GiveScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState('Tithe');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const funds = ['Tithe', 'Offering', 'Building Fund', 'Missions', 'Love Offering'];

  const handleGive = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        'https://ldjynhvueuyjjjlkkyff.supabase.co/functions/v1/create-payment-intent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, fund, note }),
        }
      );
      const json = await res.json();
      console.log('Edge Function response:', JSON.stringify(json));
      const { clientSecret, error: fnError } = json;
      if (fnError) throw new Error(fnError);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Living Water Church In Christ',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment failed', presentError.message);
        }
        setLoading(false);
        return;
      }

      await supabase.from('giving').insert({
        amount: parseFloat(amount),
        fund,
        note,
        date: new Date().toISOString().split('T')[0],
        method: 'app',
      });
      setStep(3);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  };

  if (step === 3) return (
    <SafeAreaView style={[s.flex, s.center, { backgroundColor: C.bg }]}>
      <Text style={{ fontSize: 60 }}>🙏</Text>
      <Text style={[s.headerTitle, { color: C.green, marginTop: 16 }]}>Thank You!</Text>
      <Text style={[s.cardBody, { textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
        Your gift of ${parseFloat(amount || 0).toFixed(2)} to {fund} has been received. God bless you!
      </Text>
      <View style={[{ backgroundColor: C.navy, borderRadius: 12, padding: 16, margin: 24 }]}>
        <Text style={{ color: C.gold, fontWeight: '800', fontSize: 13, marginBottom: 6, textAlign: 'center' }}>Luke 6:38</Text>
        <Text style={{ color: C.white, fontSize: 13, fontStyle: 'italic', lineHeight: 20, textAlign: 'center' }}>"Give, and it will be given to you."</Text>
      </View>
      <TouchableOpacity style={[s.btn, { marginTop: 8 }]} onPress={() => { setStep(1); setAmount(''); setNote(''); }}>
        <Text style={s.btnText}>Give Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Give</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {step === 1 && <>
            <Text style={s.sectionTitle}>Select Fund</Text>
            {funds.map(f => (
              <TouchableOpacity key={f} style={[s.card, s.row, { alignItems: 'center' }]} onPress={() => setFund(f)}>
                <View style={[s.radio, fund === f && s.radioSelected]} />
                <Text style={[s.cardTitle, { marginLeft: 12 }]}>{f}</Text>
              </TouchableOpacity>
            ))}
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
            {['25', '50', '100', '250'].map(a => (
              <TouchableOpacity key={a} style={s.quickBtn} onPress={() => setAmount(a)}>
                <Text style={s.quickBtnText}>${a}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[s.input, { marginTop: 16 }]}
              placeholder="Note (optional)"
              placeholderTextColor={C.gray}
              value={note}
              onChangeText={setNote}
            />
            <View style={[s.card, { backgroundColor: C.navy, marginTop: 16 }]}>
              <Text style={{ color: C.gold, fontWeight: '800', fontSize: 13, marginBottom: 6 }}>Luke 6:38</Text>
              <Text style={{ color: C.white, fontSize: 14, fontStyle: 'italic', lineHeight: 22 }}>"Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you."</Text>
            </View>
            <TouchableOpacity
              style={[s.btn, { marginTop: 24, opacity: amount ? 1 : 0.5 }]}
              onPress={() => setStep(2)}
              disabled={!amount}
            >
              <Text style={s.btnText}>Review Gift</Text>
            </TouchableOpacity>
          </>}

          {step === 2 && <>
            <Text style={s.sectionTitle}>Review Your Gift</Text>
            <View style={s.card}>
              <Row label="Fund" value={fund} />
              <Row label="Amount" value={`$${parseFloat(amount).toFixed(2)}`} />
              {note ? <Row label="Note" value={note} /> : null}
              <Row label="Name" value={`${MEMBER.firstName} ${MEMBER.lastName}`} />
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

function Row({ label, value }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lightGray }]}>
      <Text style={[s.cardBody, { fontWeight: '600' }]}>{label}</Text>
      <Text style={s.cardBody}>{value}</Text>
    </View>
  );
}

// ─── Prayer Screen ────────────────────────────────────────────────────────────
function PrayerScreen() {
  const isPastor = MEMBER.role === 'Pastor' || MEMBER.role === 'Co-Pastor';
  const [tab, setTab] = useState('submit');
  const [request, setRequest] = useState('');
  const [name, setName] = useState('');
  const [anon, setAnon] = useState(false);
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tab === 'pastor' && isPastor) loadPrayers();
  }, [tab]);

  const loadPrayers = async () => {
    setLoading(true);
    const { data } = await supabase.from('prayer_requests').select('*').order('created_at', { ascending: false });
    setPrayers(data || [
      { id: '1', name: 'Sister Jones', request: 'Please pray for healing for my mother.', status: 'pending' },
      { id: '2', name: 'Anonymous', request: 'Pray for my family situation.', status: 'pending' },
      { id: '3', name: 'Brother Smith', request: 'Prayer for employment.', status: 'responded' },
    ]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!request.trim()) return;
    setSubmitting(true);
    const currentUser = await supabase.auth.getUser();
    const userEmail = currentUser?.data?.user?.email || null;
    const { error: insertError } = await supabase.from('prayer_requests').insert({
      name: anon ? 'Anonymous' : (name || `${MEMBER.firstName} ${MEMBER.lastName}`),
      request,
      status: 'pending',
      email: anon ? null : userEmail,
    });
    if (insertError) { console.log('Prayer insert error:', insertError); }
    setSubmitting(false);
    setSuccess(true);
    setRequest('');
    setName('');
    setTimeout(() => setSuccess(false), 3000);
  };

  const markResponded = async (id) => {
    await supabase.from('prayer_requests').update({ status: 'responded' }).eq('id', id);
    setPrayers(p => p.map(r => r.id === id ? { ...r, status: 'responded' } : r));
  };

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Prayer</Text>
      </View>
      {isPastor && (
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'submit' && s.tabActive]} onPress={() => setTab('submit')}>
            <Text style={[s.tabText, tab === 'submit' && s.tabTextActive]}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'pastor' && s.tabActive]} onPress={() => setTab('pastor')}>
            <Text style={[s.tabText, tab === 'pastor' && s.tabTextActive]}>Pastor View</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'submit' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.sectionTitle}>Submit a Prayer Request</Text>
            {success && (
              <View style={[s.card, { backgroundColor: '#e8f5e9' }]}>
                <Text style={{ color: C.green, fontWeight: '600' }}>🙏 Prayer request submitted. Pastor Baldwin will be praying for you!</Text>
              </View>
            )}
            <TextInput
              style={[s.input, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Share your prayer request..."
              placeholderTextColor={C.gray}
              value={request}
              onChangeText={setRequest}
              multiline
            />
            <TouchableOpacity style={[s.row, { alignItems: 'center', marginVertical: 12 }]} onPress={() => setAnon(!anon)}>
              <View style={[s.checkbox, anon && s.checkboxChecked]}>
                {anon && <Text style={{ color: C.white, fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={[s.cardBody, { marginLeft: 8 }]}>Submit anonymously</Text>
            </TouchableOpacity>
            {!anon && (
              <TextInput
                style={s.input}
                placeholder="Your name (optional)"
                placeholderTextColor={C.gray}
                value={name}
                onChangeText={setName}
              />
            )}
            <TouchableOpacity
              style={[s.btn, { marginTop: 16, opacity: request.trim() ? 1 : 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting || !request.trim()}
            >
              {submitting ? <ActivityIndicator color={C.white} /> : <Text style={s.btnText}>Submit Prayer Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {loading ? <ActivityIndicator color={C.teal} /> : prayers.map(p => (
            <View key={p.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>{p.name}</Text>
                <View style={[s.badge, { backgroundColor: p.status === 'responded' ? C.green : C.gold }]}>
                  <Text style={s.badgeText}>{p.status}</Text>
                </View>
              </View>
              <Text style={[s.cardBody, { marginTop: 6 }]}>{p.request}</Text>
              {p.status !== 'responded' && (
                <TouchableOpacity style={[s.btn, { marginTop: 10, paddingVertical: 8 }]} onPress={() => markResponded(p.id)}>
                  <Text style={s.btnText}>Mark Responded</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Events Screen ────────────────────────────────────────────────────────────
function EventsScreen() {
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
      </View>
      {loading ? <ActivityIndicator color={C.teal} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={events}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const d = new Date((item.event_date || item.date) + 'T12:00');
            return (
              <View style={[s.card, s.row]}>
                <View style={s.dateBadge}>
                  <Text style={s.dateBadgeMonth}>{months[d.getMonth()]}</Text>
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

// ----- Profile Screen -----------------------------------------------
function ProfileScreen({ onLogout, user }) {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (user) {
        const { data: memberData } = await supabase.from('members').select('*').eq('email', user.email).single();
        if (memberData) setProfile(memberData);
        const { data } = await supabase.from('prayer_requests').select('*').eq('email', user.email).order('created_at', { ascending: false }).limit(10);
        setPrayers(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: C.bg }]}>
      <View style={[s.header, { paddingBottom: 24 }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(profile?.first_name || user?.email || 'G')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.headerTitle}>{profile ? profile.first_name + ' ' + profile.last_name : user?.email}</Text>
        <Text style={s.headerSub}>{profile?.role || 'Member'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.card}>
          <Row label="Email" value={profile?.email || user?.email} />
          <Row label="Phone" value={profile?.phone || '—'} />
          <Row label="Status" value={profile?.status || 'Member'} />
          <Row label="Member Since" value={profile?.join_date ? new Date(profile.join_date + 'T12:00').getFullYear().toString() : '—'} />
        </View>
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>My Prayer Requests</Text>
        {loading ? <ActivityIndicator color={C.teal} /> : prayers.length === 0 ? (
          <View style={s.card}>
            <Text style={[s.cardBody, { textAlign: 'center' }]}>No prayer requests yet.</Text>
          </View>
        ) : prayers.map(p => (
          <View key={p.id} style={s.card}>
            <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <Text style={s.cardTitle}>{new Date(p.created_at).toLocaleDateString()}</Text>
              <View style={[s.badge, { backgroundColor: p.status === 'responded' ? C.green : C.gold }]}>
                <Text style={s.badgeText}>{p.status}</Text>
              </View>
            </View>
            <Text style={s.cardBody}>{p.request}</Text>
          </View>
        ))}
        <TouchableOpacity style={[s.btn, { backgroundColor: '#c62828', marginTop: 24 }]} onPress={onLogout}>
          <Text style={s.btnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


// ----- Walk Through Romans Screen ----------------------------------------
const WTR_STEPS = [
  {
    page: 1,
    title: "We All Have Sinned",
    scripture: "Romans 3:23",
    verse: "For all have sinned and fall short of the glory of God.",
    message: "No one is exempt. No matter your background or good deeds, every person starts in the same place. We have all missed the mark.",
    image: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=800",
  },
  {
    page: 2,
    title: "Sin Has a Consequence",
    scripture: "Romans 6:23a",
    verse: "For the wages of sin is death...",
    message: "Sin carries a penalty. Just like a worker earns wages for their labor, sin earns a consequence — spiritual death and separation from God.",
    image: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800",
  },
  {
    page: 3,
    title: "But God Offers a Gift",
    scripture: "Romans 6:23b",
    verse: "...but the gift of God is eternal life in Christ Jesus our Lord.",
    message: "The same verse that reveals the penalty also reveals the solution. Death is what we earned. Life is what God offers — freely, as a gift.",
    image: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800",
  },
  {
    page: 4,
    title: "God Proved His Love",
    scripture: "Romans 5:8",
    verse: "But God demonstrates His own love for us in this: While we were still sinners, Christ died for us.",
    message: "You did not have to clean yourself up first. While you were still in your sin, God sent His Son. That is not religion — that is love.",
    image: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=800",
  },
  {
    page: 5,
    title: "Salvation Is Close",
    scripture: "Romans 10:9",
    verse: "If you declare with your mouth, Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved.",
    message: "Salvation is not complicated. It is not earned through rituals or religion. It is a declaration of faith — with your mouth and your heart.",
    image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800",
  },
  {
    page: 6,
    title: "Call On His Name",
    scripture: "Romans 10:13",
    verse: "For everyone who calls on the name of the Lord will be saved.",
    message: "Everyone. Not the worthy. Not the perfect. Not the churched. Everyone who calls. That includes you, right now, wherever you are.",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800",
  },
  {
    page: 7,
    title: "No Condemnation",
    scripture: "Romans 8:1",
    verse: "Therefore, there is now no condemnation for those who are in Christ Jesus.",
    message: "Once you come to Christ, the verdict changes. The guilt is gone. The shame is lifted. You are no longer condemned — you are covered.",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800",
  },
  {
    page: 8,
    title: "Nothing Can Separate You",
    scripture: "Romans 8:38-39",
    verse: "Neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.",
    message: "Once you are His, nothing in heaven or earth can take you out of His hand. This is the finish line — and the starting line of a new life.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
  },
  {
    page: 9,
    title: "The Prayer of Salvation",
    scripture: "",
    verse: "",
    message: "Lord Jesus, I admit that I am a sinner. I believe that You died for my sins and rose from the dead. I turn from my sins and invite You into my heart as my Lord and Savior. Thank You for saving me. Amen.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
  },
];

function WalkThroughRomansScreen({ onBack }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [prayed, setPrayed] = useState(false);
  const step = WTR_STEPS[currentPage];
  const isLast = currentPage === WTR_STEPS.length - 1;

  const handlePrayed = async () => {
    setPrayed(true);
    await supabase.from('salvation_decisions').insert({ date: new Date().toISOString() });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 16 }}>
          <Text style={{ color: C.white, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.white }}>Walk Through Romans</Text>
      </View>

      <View style={{ height: 200, backgroundColor: C.navy, overflow: 'hidden' }}>
        <Text style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 80, fontWeight: '900' }}>{step.page}</Text>
      </View>

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{step.title}</Text>
        {step.scripture ? (
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{step.scripture}</Text>
        ) : null}
        {step.verse ? (
          <View style={{ backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: C.teal }}>
            <Text style={{ fontSize: 16, color: C.dark, lineHeight: 26, fontStyle: 'italic' }}>{step.verse}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 15, color: C.gray, lineHeight: 24, marginBottom: 24 }}>{step.message}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
          {WTR_STEPS.map((_, i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 3, backgroundColor: i === currentPage ? C.teal : C.lightGray }} />
          ))}
        </View>

        {isLast ? (
          prayed ? (
            <View style={{ backgroundColor: C.green, borderRadius: 14, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>🙌</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.white, textAlign: 'center' }}>Welcome to the Family!</Text>
              <Text style={{ fontSize: 14, color: C.white, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>Your decision has been recorded. We would love to celebrate with you — please let your pastor know!</Text>
            </View>
          ) : (
            <TouchableOpacity style={{ backgroundColor: C.teal, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 }} onPress={handlePrayed}>
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 16 }}>I Prayed This Prayer 🙏</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={{ backgroundColor: C.teal, borderRadius: 14, padding: 18, alignItems: 'center' }} onPress={() => setCurrentPage(currentPage + 1)}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 16 }}>Next →</Text>
          </TouchableOpacity>
        )}

        {currentPage > 0 && (
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setCurrentPage(currentPage - 1)}>
            <Text style={{ color: C.gray, fontSize: 14 }}>← Previous</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}


// ----- Weekly Devotional Screen -------------------------------------------
function WeeklyDevotionalScreen({ onBack }) {
  const [devotional, setDevotional] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Get the most recent Monday or Sunday as week start
    supabase
      .from('devotionals')
      .select('*')
      .lte('week_start', today.toISOString().split('T')[0])
      .order('week_start', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { setDevotional(data); setLoading(false); });
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 16 }}>
          <Text style={{ color: C.white, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.white }}>Weekly Devotional</Text>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : !devotional ? (
        <View style={{ margin: 24, backgroundColor: C.white, borderRadius: 16, padding: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🙏</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 12 }}>Coming Soon</Text>
          <Text style={{ fontSize: 15, color: C.gray, textAlign: 'center', lineHeight: 22 }}>
            Weekly devotionals are coming soon. Check back after May 3, 2026.
          </Text>
        </View>
      ) : (
        <View>
          {devotional.image_url ? (
            <View style={{ width: '100%', height: 220, backgroundColor: C.navy, overflow: 'hidden' }}>
              <Text style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 120, fontWeight: '900' }}>✝</Text>
            </View>
          ) : null}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>This Week</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.navy, marginBottom: 8, lineHeight: 32 }}>{devotional.title}</Text>
            <Text style={{ fontSize: 14, color: C.teal, fontWeight: '700', marginBottom: 20 }}>{devotional.scripture}</Text>
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
              <Text style={{ fontSize: 15, color: C.dark, lineHeight: 26 }}>{devotional.body}</Text>
            </View>
            <Text style={{ fontSize: 13, color: C.gray, textAlign: 'right', fontStyle: 'italic' }}>— {devotional.author}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ----- BRP Screen ---------------------------------------------------------
function BRPScreen({ onBack }) {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLaunched, setIsLaunched] = useState(false);
  const [launchDate, setLaunchDate] = useState('May 3, 2026');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'brp_launch_date').single()
      .then(({ data }) => {
        if (data) {
          const launch = new Date(data.value);
          launch.setHours(0, 0, 0, 0);
          setLaunchDate(launch.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
          if (today >= launch) {
            setIsLaunched(true);
            const dateStr = today.toISOString().split('T')[0];
            supabase.from('daily_readings').select('*').eq('date', dateStr).single()
              .then(({ data: reading }) => { setReading(reading); setLoading(false); });
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
  }, []);

  const Section = ({ emoji, reference, text }) => (
    <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{emoji} {reference}</Text>
      <Text style={{ fontSize: 15, color: C.dark, lineHeight: 24 }}>{text}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 16 }}>
          <Text style={{ color: C.white, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.white }}>Bible Reading Plan</Text>
      </View>

      {!isLaunched ? (
        <View style={{ margin: 24, backgroundColor: C.white, borderRadius: 16, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>📖</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.navy, textAlign: 'center', marginBottom: 12 }}>Coming May 3, 2026!</Text>
          <Text style={{ fontSize: 15, color: C.gray, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
            Join us on a journey through God's Word together. Check back on May 3rd to begin the plan.
          </Text>
          <View style={{ backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>Launching May 3, 2026 🙌</Text>
          </View>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : !reading ? (
        <View style={{ margin: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: C.gray, textAlign: 'center' }}>No reading available for today.</Text>
        </View>
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 13, color: C.gray, textAlign: 'center', marginBottom: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {reading.ot_reference && <Section emoji="📜" reference={reading.ot_reference} text={reading.ot_text} />}
          {reading.nt_reference && <Section emoji="✝️" reference={reading.nt_reference} text={reading.nt_text} />}
          {reading.psalm_reference && <Section emoji="🎵" reference={reading.psalm_reference} text={reading.psalm_text} />}
          {reading.proverbs_reference && <Section emoji="💡" reference={reading.proverbs_reference} text={reading.proverbs_text} />}
        </View>
      )}
    </ScrollView>
  );
}

// ----- Bible Screen -------------------------------------------------------
function BibleScreen() {
  const [subScreen, setSubScreen] = useState(null);

  if (subScreen === 'brp') return <BRPScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'devotional') return <WeeklyDevotionalScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'wtr') return <WalkThroughRomansScreen onBack={() => setSubScreen(null)} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 60, paddingBottom: 30, alignItems: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: C.white }}>Bible</Text>
        <Text style={{ fontSize: 14, color: C.tealL, marginTop: 4 }}>Living Water Church In Christ</Text>
      </View>
      <View style={{ padding: 20 }}>
        <TouchableOpacity onPress={() => setSubScreen('brp')} style={{ backgroundColor: C.white, borderRadius: 16, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 36, marginRight: 16 }}>📖</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, marginBottom: 4 }}>Bible Reading Plan</Text>
            <Text style={{ fontSize: 13, color: C.gray, lineHeight: 20 }}>Daily scripture readings from the Old Testament, New Testament, Psalms and Proverbs</Text>
          </View>
          <Text style={{ color: C.teal, fontSize: 20 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSubScreen('wtr')} style={{ backgroundColor: C.white, borderRadius: 16, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 36, marginRight: 16 }}>✝️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, marginBottom: 4 }}>Walk Through Romans</Text>
            <Text style={{ fontSize: 13, color: C.gray, lineHeight: 20 }}>A step-by-step journey from sin to salvation through the book of Romans</Text>
          </View>
          <Text style={{ color: C.teal, fontSize: 20 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSubScreen('devotional')} style={{ backgroundColor: C.white, borderRadius: 16, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 36, marginRight: 16 }}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.navy, marginBottom: 4 }}>Weekly Devotional</Text>
            <Text style={{ fontSize: 13, color: C.gray, lineHeight: 20 }}>A fresh word from our pastors to encourage and strengthen you each week</Text>
          </View>
          <Text style={{ color: C.teal, fontSize: 20 }}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'watch', label: 'Watch', icon: '▶️' },
  { key: 'give', label: 'Give', icon: '🙏' },
  { key: 'prayer', label: 'Prayer', icon: '✝️' },
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'bible', label: 'Bible', icon: '📖' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

function BottomNav({ active, onNav }) {
  return (
    <View style={s.nav}>
      {NAV.map(n => (
        <TouchableOpacity key={n.key} style={s.navItem} onPress={() => onNav(n.key)}>
          <Text style={s.navIcon}>{n.icon}</Text>
          <Text style={[s.navLabel, active === n.key && s.navLabelActive]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState('home');
  const [user, setUser] = useState(null);

  if (!loggedIn) return <LoginScreen onLogin={(u) => { setLoggedIn(true); setUser(u); }} />;

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen />;
      case 'watch': return <WatchScreen />;
      case 'give': return <GiveScreen />;
      case 'prayer': return <PrayerScreen />;
      case 'events': return <EventsScreen />;
    case 'bible': return <BibleScreen />;
      case 'profile': return <ProfileScreen onLogout={() => { setLoggedIn(false); setUser(null); }} user={user} />;
      default: return <HomeScreen />;
    }
  };

  return (
    <View style={s.flex}>
      <View style={s.flex}>{renderScreen()}</View>
      <BottomNav active={screen} onNav={setScreen} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Login
  logoText: { fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: 1 },
  logoSub: { fontSize: 16, color: C.tealL, marginBottom: 40 },
  loginCard: { backgroundColor: C.white, borderRadius: 16, padding: 24, width: '85%' },
  loginTitle: { fontSize: 22, fontWeight: '700', color: C.navy, marginBottom: 20, textAlign: 'center' },
  demoText: { color: C.gray, textAlign: 'center', marginTop: 16, fontSize: 13 },

  // Header
  header: { backgroundColor: C.navy, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' },
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
});
