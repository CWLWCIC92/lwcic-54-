import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
const STRIPE_PK = 'pk_live_51SNKrVD1ej3IzU6u3oiV7Nm07JcwpCBm2RjiRSZX7f5MvJSZx51csDqI5RTRDfPDsxzFLz70Uh4JcUwea21cyqRL00hXwBsJ63';
import React, { useState, useEffect } from 'react';
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
function HomeScreen({ onNavigate }) {
  const [announcements, setAnnouncements] = useState([]);
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
              <TouchableOpacity
                onPress={() => onNavigate && onNavigate('bible')}
                style={{backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, padding:14, marginTop:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}
              >
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <Text style={{fontSize:20, marginRight:10}}>🙏</Text>
                  <View>
                    <Text style={{fontSize:14, fontWeight:'700', color:'#fff'}}>Submit a Prayer Request</Text>
                    <Text style={{fontSize:11, color:'rgba(255,255,255,0.7)'}}>Pastor Baldwin & LWCIC are praying for you</Text>
                  </View>
                </View>
                <Text style={{color:'#fff', fontSize:18}}>›</Text>
              </TouchableOpacity>
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
        member_id: MEMBER.id,
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
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex} keyboardVerticalOffset={80}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'watch', label: 'Watch', icon: '▶️' },
  { key: 'give', label: 'Give', icon: '🙏' },
  { key: 'bible', label: 'Bible', icon: '📖' },
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'profile', label: 'Profile', icon: '👤' },
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



function BibleScreen() {
  const [openSection, setOpenSection] = React.useState(null);
  const [romansStep, setRomansStep] = React.useState(0);
  const [romansComplete, setRomansComplete] = React.useState(false);
  const [todayReading, setTodayReading] = React.useState(null);
  const [devotional, setDevotional] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [readingTab, setReadingTab] = React.useState('ot');
  const [salvationSaved, setSalvationSaved] = React.useState(false);
  const [readingPlanStarted, setReadingPlanStarted] = React.useState(false);
  const [prayerName, setPrayerName] = React.useState('');
  const [prayerRequest, setPrayerRequest] = React.useState('');
  const [prayerSubmitted, setPrayerSubmitted] = React.useState(false);

  const SUPABASE_URL = 'https://ldjynhvueuyjjjlkkyff.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkanluaHZ1ZXV5ampqbGtreWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzM5OTEsImV4cCI6MjA4ODUwOTk5MX0.YK_eC9915lyytC7xYSyAkO-2V5GStEpbb3fRMHd6OpI';

  React.useEffect(() => {
    if (openSection === 'reading') fetchTodayReading();
    if (openSection === 'devotional') {
      setDevotional(null);
      fetchDevotional();
    }
  }, [openSection]);

  const fetchTodayReading = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/Daily%20Readings?Date=eq.' + today + '&limit=1',
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setTodayReading(data[0]);
      } else {
        const res2 = await fetch(
          SUPABASE_URL + '/rest/v1/Daily%20Readings?order=id&limit=1',
          { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
        );
        const data2 = await res2.json();
        if (data2 && data2.length > 0) setTodayReading(data2[0]);
      }
    } catch(e) {}
    setLoading(false);
  };

  const fetchDevotional = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        SUPABASE_URL + '/rest/v1/devotionals?select=*&limit=1',
        { headers: { 
          apikey: SUPABASE_KEY, 
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        } }
      );
      const text = await res.text();
      console.log('DEVOTIONAL RAW:', text.substring(0, 200));
      const data = JSON.parse(text);
      console.log('DEVOTIONAL DATA:', JSON.stringify(data).substring(0, 200));
      if (Array.isArray(data) && data.length > 0) {
        setDevotional(data[0]);
      } else {
        console.log('DEVOTIONAL: not array or empty', typeof data);
      }
    } catch(e) { console.log('Devotional fetch error:', e.message); }
    setLoading(false);
  };

  const handleSalvationDecision = async () => {
    try {
      await fetch(SUPABASE_URL + '/rest/v1/salvations_decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ decision_date: new Date().toISOString().split('T')[0], notes: 'Accepted Christ through Walk Through Romans in the LWCIC app' })
      });
      setSalvationSaved(true);
    } catch(e) {}
  };

  const handlePrayerSubmit = async () => {
    if (!prayerRequest.trim()) return;
    try {
      await fetch(SUPABASE_URL + '/rest/v1/prayer_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
        body: JSON.stringify({ request: prayerRequest, Name: prayerName, anonymous: prayerName.trim() === '', status: 'pending' })
      });
      setPrayerSubmitted(true);
    } catch(e) {}
  };

  const cur = ROMANS_ROAD[romansStep];

  const toggleSection = (section) => {
    if (openSection === section) {
      setOpenSection(null);
      if (section === 'romans') {
        setRomansStep(0);
        setRomansComplete(false);
      }
    } else {
      setOpenSection(section);
    }
  };

  const sections = [
    { key: 'devotional', label: '📖  Devotional', subtitle: 'Weekly Message' },
    { key: 'reading', label: '📅  Bible Reading Plan', subtitle: '365 Days · KJV · Bible in a Year' },
    { key: 'romans', label: '✝️  Romans Road', subtitle: 'Walk Through Romans to Salvation' },
    { key: 'prayer', label: '🙏  Prayer Request', subtitle: 'Submit a Prayer Request' },
  ];

  return (
    <SafeAreaView style={{flex:1, backgroundColor: C.bg}}>
      <View style={{backgroundColor: C.navy, paddingHorizontal:16, paddingTop:16, paddingBottom:16}}>
        <Text style={{fontSize:20, fontWeight:'800', color:C.white, marginBottom:4}}>📖 Bible</Text>
        <Text style={{fontSize:12, color:'rgba(255,255,255,0.6)'}}>Devotional · Reading Plan · Romans Road · Prayer</Text>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16, paddingBottom:40}}>
        {sections.map((section) => (
          <View key={section.key} style={{marginBottom:12}}>
            <TouchableOpacity
              onPress={() => toggleSection(section.key)}
              style={{backgroundColor: C.navy, borderRadius: openSection === section.key ? 12 : 12, padding:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}
            >
              <View>
                <Text style={{fontSize:16, fontWeight:'700', color:C.white}}>{section.label}</Text>
                <Text style={{fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2}}>{section.subtitle}</Text>
              </View>
              <Text style={{fontSize:18, color:C.white}}>{openSection === section.key ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {openSection === section.key && (
              <View style={{backgroundColor:C.white, borderBottomLeftRadius:12, borderBottomRightRadius:12, padding:16, elevation:2}}>

                {/* DEVOTIONAL */}
                {section.key === 'devotional' && (
                  loading ? <ActivityIndicator color={C.teal} style={{marginTop:20}}/> :
                  devotional ? (
                    <View>
                      <Text style={{fontSize:13, fontWeight:'700', color:C.teal, marginBottom:4, textTransform:'uppercase', letterSpacing:1}}>{devotional.title}</Text>
                      <Text style={{fontSize:12, color:C.gray, marginBottom:12}}>{devotional.week_start}</Text>
                      <Text style={{fontSize:14, color:C.darkGray, lineHeight:22}}>{devotional.body}</Text>
                      {devotional.scripture && <Text style={{fontSize:13, color:C.teal, fontWeight:'700', marginTop:12}}>📖 {devotional.scripture}</Text>}
                    </View>
                  ) : (
                    <Text style={{color:C.gray, textAlign:'center', marginTop:20}}>No devotional available this week.</Text>
                  )
                )}

                {/* BIBLE READING PLAN */}
                {section.key === 'reading' && (
                  <View>
                    {!readingPlanStarted ? (
                      <View style={{alignItems:'center', paddingVertical:8}}>
                        <Text style={{fontSize:15, fontWeight:'700', color:C.navy, marginBottom:8, textAlign:'center'}}>Bible in a Year</Text>
                        <Text style={{fontSize:13, color:C.darkGray, textAlign:'center', lineHeight:20, marginBottom:6}}>Read through the entire Bible in 365 days using the King James Version.</Text>
                        <Text style={{fontSize:13, color:C.darkGray, textAlign:'center', lineHeight:20, marginBottom:16}}>Each day includes readings from the Old Testament, New Testament, Psalms, and Proverbs.</Text>
                        <View style={{backgroundColor:'#FFF8E7', borderRadius:10, padding:14, marginBottom:20, borderLeftWidth:4, borderLeftColor:C.teal}}>
                          <Text style={{fontSize:13, color:C.navy, fontWeight:'700', marginBottom:4}}>Before You Begin</Text>
                          <Text style={{fontSize:13, color:C.darkGray, lineHeight:20}}>Tapping "Start My Reading Plan" will begin your personal 365-day journey through the Bible. Your plan starts today and is unique to you. Are you ready to commit to reading God's Word every day?</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setReadingPlanStarted(true)}
                          style={{backgroundColor:C.teal, borderRadius:10, paddingVertical:14, paddingHorizontal:32, marginBottom:10}}
                        >
                          <Text style={{color:C.white, fontWeight:'700', fontSize:15}}>Yes, Start My Reading Plan 📖</Text>
                        </TouchableOpacity>
                        <Text style={{fontSize:11, color:C.gray, textAlign:'center'}}>You can return to this each day to read your assigned scriptures.</Text>
                      </View>
                    ) : (
                      <View>
                        <View style={{backgroundColor:C.white, borderRadius:12, padding:12, marginBottom:12, elevation:2}}>
                          <Text style={{fontSize:13, fontWeight:'700', color:C.teal, textTransform:'uppercase', letterSpacing:1, marginBottom:2}}>
                            {new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'})}
              <TouchableOpacity
                onPress={() => onNavigate && onNavigate('bible')}
                style={{backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, padding:14, marginTop:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}
              >
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <Text style={{fontSize:20, marginRight:10}}>🙏</Text>
                  <View>
                    <Text style={{fontSize:14, fontWeight:'700', color:'#fff'}}>Submit a Prayer Request</Text>
                    <Text style={{fontSize:11, color:'rgba(255,255,255,0.7)'}}>Pastor Baldwin & LWCIC are praying for you</Text>
                  </View>
                </View>
                <Text style={{color:'#fff', fontSize:18}}>›</Text>
              </TouchableOpacity>
                          </Text>
                          <Text style={{fontSize:15, fontWeight:'700', color:C.navy}}>Daily Scripture Reading</Text>
                          <Text style={{fontSize:11, color:C.gray, marginTop:2}}>OT · NT · Psalms · Proverbs</Text>
                        </View>
                        <View style={{flexDirection:'row', gap:6, marginBottom:12}}>
                          {[['ot','OT'],['nt','NT'],['psalm','Psalm'],['proverb','Prov']].map(([key,label]) => (
                            <TouchableOpacity key={key} onPress={()=>setReadingTab(key)} style={{flex:1, paddingVertical:8, borderRadius:10, borderWidth:1.5, borderColor:readingTab===key?C.teal:C.lightGray, backgroundColor:readingTab===key?C.teal+'20':C.white, alignItems:'center'}}>
                              <Text style={{fontSize:10, fontWeight:'700', color:readingTab===key?C.teal:C.gray}}>{label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {loading ? <ActivityIndicator color={C.teal}/> : todayReading ? (
                          <View>
                            {readingTab==='ot' && (
                              <View style={{backgroundColor:C.white, borderRadius:12, padding:14, elevation:2}}>
                                <Text style={{fontSize:13, fontWeight:'700', color:C.teal, marginBottom:4}}>Old Testament</Text>
                                <Text style={{fontSize:15, fontWeight:'800', color:C.navy, marginBottom:8}}>{todayReading.ot_reference}</Text>
                                <Text style={{fontSize:14, color:C.darkGray, lineHeight:22, fontStyle:'italic'}}>{todayReading.ot_text}</Text>
                                <Text style={{fontSize:11, color:C.gray, fontWeight:'600', marginTop:8}}>King James Version</Text>
                              </View>
                            )}
                            {readingTab==='nt' && (
                              <View style={{backgroundColor:C.white, borderRadius:12, padding:14, elevation:2}}>
                                <Text style={{fontSize:13, fontWeight:'700', color:C.teal, marginBottom:4}}>New Testament</Text>
                                <Text style={{fontSize:15, fontWeight:'800', color:C.navy, marginBottom:8}}>{todayReading.nt_reference}</Text>
                                <Text style={{fontSize:14, color:C.darkGray, lineHeight:22, fontStyle:'italic'}}>{todayReading.nt_text}</Text>
                                <Text style={{fontSize:11, color:C.gray, fontWeight:'600', marginTop:8}}>King James Version</Text>
                              </View>
                            )}
                            {readingTab==='psalm' && (
                              <View style={{backgroundColor:C.white, borderRadius:12, padding:14, elevation:2}}>
                                <Text style={{fontSize:13, fontWeight:'700', color:C.teal, marginBottom:4}}>Psalm</Text>
                                <Text style={{fontSize:15, fontWeight:'800', color:C.navy, marginBottom:8}}>{todayReading.psalm_reference}</Text>
                                <Text style={{fontSize:14, color:C.darkGray, lineHeight:22, fontStyle:'italic'}}>{todayReading.psalm_text}</Text>
                                <Text style={{fontSize:11, color:C.gray, fontWeight:'600', marginTop:8}}>King James Version</Text>
                              </View>
                            )}
                            {readingTab==='proverb' && (
                              <View style={{backgroundColor:C.white, borderRadius:12, padding:14, elevation:2}}>
                                <Text style={{fontSize:13, fontWeight:'700', color:C.teal, marginBottom:4}}>Proverbs</Text>
                                <Text style={{fontSize:15, fontWeight:'800', color:C.navy, marginBottom:8}}>{todayReading.proverbs_reference}</Text>
                                <Text style={{fontSize:14, color:C.darkGray, lineHeight:22, fontStyle:'italic'}}>{todayReading.proverbs_text}</Text>
                                <Text style={{fontSize:11, color:C.gray, fontWeight:'600', marginTop:8}}>King James Version</Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <Text style={{color:C.gray, textAlign:'center'}}>No reading available for today.</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* ROMANS ROAD */}
                {section.key === 'romans' && (
                  <View>
                    {romansComplete ? (
                      <View style={{alignItems:'center', padding:20}}>
                        <Text style={{fontSize:28, marginBottom:12}}>🎉</Text>
                        <Text style={{fontSize:18, fontWeight:'800', color:C.navy, marginBottom:8, textAlign:'center'}}>Welcome to the Family of God!</Text>
                        <Text style={{fontSize:14, color:C.darkGray, textAlign:'center', lineHeight:22}}>If you prayed that prayer and meant it — you are saved! We would love to connect with you. Reach out to Pastor Baldwin.</Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={{fontSize:12, color:C.teal, fontWeight:'700', marginBottom:8}}>Step {romansStep+1} of {ROMANS_ROAD.length}</Text>
                        <View style={{height:6, width:'100%', backgroundColor:C.lightGray, borderRadius:3, marginBottom:16}}>
                          <View style={{height:6, width:((romansStep+1)/ROMANS_ROAD.length*100)+'%', backgroundColor:C.teal, borderRadius:3}}/>
                        </View>
                        <Text style={{fontSize:16, fontWeight:'800', color:C.navy, marginBottom:4}}>{cur.title}</Text>
                        <Text style={{fontSize:13, color:C.teal, fontWeight:'700', marginBottom:10}}>{cur.reference}</Text>
                        <Text style={{fontSize:14, color:C.darkGray, lineHeight:22, fontStyle:'italic', marginBottom:16}}>{cur.text}</Text>
                        {cur.reflection && <Text style={{fontSize:13, color:C.gray, lineHeight:20, marginBottom:16}}>💭 {cur.reflection}</Text>}
                        {cur.emoji && <Text style={{fontSize:24, textAlign:'center', marginBottom:16}}>{cur.emoji}</Text>}
                        <TouchableOpacity
                          onPress={() => {
                            if (romansStep < ROMANS_ROAD.length - 1) {
                              setRomansStep(s => s+1);
                            } else {
                              handleSalvationDecision();
                              setRomansComplete(true);
                            }
                          }}
                          style={{flex:1, backgroundColor:C.teal, borderRadius:10, padding:14, alignItems:'center'}}
                        >
                          <Text style={{color:C.white, fontSize:14, fontWeight:'700'}}>{romansStep < ROMANS_ROAD.length-1 ? 'Next Step' : 'Complete'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* PRAYER REQUEST */}
                {section.key === 'prayer' && (
                  <View>
                    {prayerSubmitted ? (
                      <View style={{alignItems:'center', padding:20}}>
                        <Text style={{fontSize:28, marginBottom:12}}>🙏</Text>
                        <Text style={{fontSize:18, fontWeight:'800', color:C.navy, marginBottom:8}}>Prayer Received</Text>
                        <Text style={{fontSize:14, color:C.darkGray, textAlign:'center', lineHeight:22}}>Your prayer request has been submitted. Pastor Baldwin and the LWCIC family are standing with you in prayer.</Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={{fontSize:14, color:C.darkGray, marginBottom:16, lineHeight:20}}>Share your prayer request with Pastor Baldwin and the Living Water Church In Christ family.</Text>
                        <Text style={{fontSize:12, fontWeight:'700', color:C.navy, marginBottom:6}}>Your Name (optional)</Text>
                        <TextInput
                          value={prayerName}
                          onChangeText={setPrayerName}
                          placeholder="Enter your name"
                          placeholderTextColor={C.gray}
                          style={{borderWidth:1, borderColor:C.lightGray, borderRadius:8, padding:12, fontSize:14, color:C.darkGray, marginBottom:14}}
                        />
                        <Text style={{fontSize:12, fontWeight:'700', color:C.navy, marginBottom:6}}>Prayer Request</Text>
                        <TextInput
                          value={prayerRequest}
                          onChangeText={setPrayerRequest}
                          placeholder="Share your prayer request..."
                          placeholderTextColor={C.gray}
                          multiline
                          numberOfLines={5}
                          style={{borderWidth:1, borderColor:C.lightGray, borderRadius:8, padding:12, fontSize:14, color:C.darkGray, marginBottom:20, minHeight:120, textAlignVertical:'top'}}
                        />
                        <TouchableOpacity
                          onPress={handlePrayerSubmit}
                          style={{backgroundColor:C.teal, borderRadius:10, padding:14, alignItems:'center'}}
                        >
                          <Text style={{color:C.white, fontWeight:'700', fontSize:15}}>Submit Prayer Request 🙏</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

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
      case 'home': return <HomeScreen onNavigate={setScreen} />;
      case 'watch': return <WatchScreen />;
      case 'give': return <GiveScreen />;
        case 'bible': return <BibleScreen />;
      case 'events': return <EventsScreen />;
      case 'profile': return <ProfileScreen onLogout={() => { setLoggedIn(false); setUser(null); }} user={user} />;
      default: return <HomeScreen onNavigate={setScreen} />;
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.org.livingwatercic">
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
