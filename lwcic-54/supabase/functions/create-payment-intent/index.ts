import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { amount, fund, name } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      description: `${fund} - ${name}`,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
