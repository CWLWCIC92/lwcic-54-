# LWCIC Pastoral Copy Reference

All member-facing pastoral copy currently shipped in the LWCIC app,
with scripture citations. Kept in sync with `app/index.js` strings.

---

## Block 1b.5a — Welcome screen (shipped commit `8e7fe50`)

Shown once after first OTP verify. Gated by `members.welcomed_at`.

> **Welcome to Living Water Church, [FirstName]! 🙏**
>
> We're so glad you're here. This app is your connection to our
> church family — sermons, prayer requests, giving, and the Word
> of God, built right in.
>
> Come and eat — the Word is good. This app is designed to meet
> you right where you are, and we look forward to seeing you grow
> closer to Jesus.
>
> *"And Jesus said unto them, I am the bread of life: he that cometh
> to me shall never hunger; and he that believeth on me shall never
> thirst."* — John 6:35 (KJV)
>
> Praying for you,
>
> — Pastor Lisa & Minister C.W. Baldwin
>
> [ Continue ]

---

## Block 1b.5b — Push permission pre-prompt (shipped commit `be241b1`)

Shown once after Welcome's Continue. Gated by
`members.push_permission_asked_at`.

> 🔔 **Get Prayer Alerts**
>
> We only send notifications for one reason: when Pastor Lisa
> sounds the alarm to pray. Stay connected to the body.
>
> *"For where two or three are gathered together in my name, there
> am I in the midst of them."* — Matthew 18:20 (KJV)
>
> [ Yes, notify me ]
>   Not right now

---

## Block 1b.5c — Push permission deny fallback (planned)

Shown ONLY when member tapped "Yes, notify me" on 1b.5b but then
tapped "Don't Allow" on the iOS system permission dialog. iOS
native `Alert.alert()` modal.

> **That's okay.**
>
> You can turn on prayer alerts anytime — just open your iPhone
> Settings → Notifications → LWCIC.
>
> *"Casting all your care upon him; for he careth for you."*
> — 1 Peter 5:7 (KJV)
>
> [ OK ]

Success path (permission granted + token saved): silent. No alert.
Route directly to Home. The next Prayer Alarm itself becomes the
member's confirmation that the system works.

---

## Notes for Pastor Lisa

If you want to change any of this copy:
1. Tell C.W. what to change
2. He'll update `app/index.js` and ship a new build
3. This file gets updated to match

Eventually all of this copy will move to an `app_settings` table in
Supabase so you can edit from the CRM without an app release.

---

*Last updated: May 19, 2026 (during Block 1b.5c session)*
