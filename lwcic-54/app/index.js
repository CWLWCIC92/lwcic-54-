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
  const [salvationSaved, setSalvationSaved] = React.useState(false);
  const [devotional, setDevotional] = React.useState(null);
  const [todayReading, setTodayReading] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [readingTab, setReadingTab] = React.useState('ot');
  const [started, setStarted] = React.useState(false);
  const [currentDay, setCurrentDay] = React.useState(1);
  const [progressId, setProgressId] = React.useState(null);
  const [marking, setMarking] = React.useState(false);
  const [pRequest, setPRequest] = React.useState('');
  const [pName, setPName] = React.useState('');

  const SURL = 'https://ldjynhvueuyjjjlkkyff.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkanluaHZ1ZXV5ampqbGtreWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzM5OTEsImV4cCI6MjA4ODUwOTk5MX0.YK_eC9915lyytC7xYSyAkO-2V5GStEpbb3fRMHd6OpI';
  const SH = { apikey: SKEY, Authorization: 'Bearer ' + SKEY };

  React.useEffect(() => { checkProgress(); }, []);

  const checkProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch(SURL + '/rest/v1/reading_progress?user_id=eq.1&limit=1', { headers: SH });
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
    try {
      const res = await fetch(SURL + '/rest/v1/Daily%20Readings?day_number=eq.' + day + '&limit=1', { headers: SH });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setTodayReading(data[0]);
      else setTodayReading(null);
    } catch(e) { setTodayReading(null); }
  };

  const startPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(SURL + '/rest/v1/reading_progress', {
        method: 'POST',
        headers: { ...SH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: '1', current_day: 1, started_at: new Date().toISOString().split('T')[0], last_read_at: new Date().toISOString().split('T')[0] })
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
      await fetch(SURL + '/rest/v1/reading_progress?user_id=eq.1', {
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
      const res = await fetch(SURL + '/rest/v1/devotionals?order=week_start.desc&limit=1', { headers: SH });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setDevotional(data[0]);
    } catch(e) {}
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
        <Text style={s.headerTitle}>Bible & Prayer</Text>
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
                {readingTab==='ot' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Old Testament</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.ot_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22, fontStyle: 'italic' }}>"{todayReading.ot_text}"</Text></View>}
                {readingTab==='nt' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>New Testament</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.nt_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22, fontStyle: 'italic' }}>"{todayReading.nt_text}"</Text></View>}
                {readingTab==='psalm' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Psalm</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.psalm_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22, fontStyle: 'italic' }}>"{todayReading.psalm_text}"</Text></View>}
                {readingTab==='proverb' && <View style={{ backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14 }}><Text style={{ fontSize: 13, fontWeight: '700', color: C.teal, marginBottom: 4 }}>Proverbs</Text><Text style={{ fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 8 }}>{todayReading.proverbs_reference}</Text><Text style={{ fontSize: 13, color: '#555', lineHeight: 22, fontStyle: 'italic' }}>"{todayReading.proverbs_text}"</Text></View>}
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
              <Text style={s.cardTitle}>Weekly Devotional</Text>
              <Text style={s.cardBody}>Pastor's weekly message</Text>
            </View>
            <Text style={{ color: C.teal, fontWeight: '700' }}>{openSection === 'devotional' ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {openSection === 'devotional' && (
          <View style={[s.card, { marginBottom: 12 }]}>
            {devotional ? (
              <View>
                <View style={{ backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: C.teal, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Week of {new Date(devotional.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 6 }}>{devotional.title}</Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>{devotional.scripture}</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#555', lineHeight: 24 }}>{devotional.body}</Text>
                {devotional.author && <Text style={{ fontSize: 12, color: C.gray, fontWeight: '700', marginTop: 12 }}>— {devotional.author}</Text>}
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🌅</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.navy }}>No Devotional This Week</Text>
                <Text style={{ fontSize: 12, color: C.gray, marginTop: 6, textAlign: 'center' }}>Check back soon.</Text>
              </View>
            )}
          </View>
        )}

        {/* PRAYER REQUESTS */}
        <TouchableOpacity style={[s.card, { marginBottom: 8 }]} onPress={() => setOpenSection(openSection === 'prayer' ? null : 'prayer')}>
          <View style={s.row}>
            <Text style={{ fontSize: 22, marginRight: 12 }}>🙏</Text>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Prayer Requests</Text>
              <Text style={s.cardBody}>Submit and view prayer requests</Text>
            </View>
            <Text style={{ color: C.teal, fontWeight: '700' }}>{openSection === 'prayer' ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {openSection === 'prayer' && (
          <View style={[s.card, { marginBottom: 12 }]}>
            <View>
              <Text style={s.sectionTitle}>Submit a Prayer Request</Text>
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Share your prayer request..."
                placeholderTextColor={C.gray}
                multiline
                value={pRequest}
                onChangeText={setPRequest}
              />
              <TextInput
                style={s.input}
                placeholder="Your name (optional)"
                placeholderTextColor={C.gray}
                value={pName}
                onChangeText={setPName}
              />
              <TouchableOpacity style={s.btn} onPress={async () => {
                if (!pRequest.trim()) return;
                try {
                  await supabase.from('prayer_requests').insert({
                    name: pName.trim() ? pName.trim() : MEMBER.firstName + ' ' + MEMBER.lastName,
                    request: pRequest,
                    status: 'pending',
                    email: MEMBER.email,
                  });
                  setPRequest('');
                  Alert.alert('🙏 Submitted', 'Pastor Baldwin and Co-Pastor Lisa will be praying for you!');
                } catch(e) {
                  Alert.alert('Error', 'Could not submit. Please try again.');
                }
              }}>
                <Text style={s.btnText}>Submit Prayer Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
